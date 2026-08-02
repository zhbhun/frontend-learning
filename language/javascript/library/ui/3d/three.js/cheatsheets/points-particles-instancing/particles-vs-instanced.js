/*
演示"粒子选型"：同一份颗粒布局分别交给 Points 和 InstancedMesh 渲染，
对照 draw calls / triangles / 内存几何数，让读者看到两种"做粒子"路径的实际差异。

- Points：每顶点一个纹理点；triangles=0；不受光。
- InstancedMesh：每实例一个小八面体；triangles = 实例数 × 20；参与场景光照。

两种模式共享同一组布局数据（同一种子序列生成），切换时画面分布一致，
读数差异完全归因于图元类型与渲染路径。读文件先看 createLayout() 怎样生成共享布局，
再看 buildPoints() / buildInstanced() 各自如何把它装配成渲染对象。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

// 用固定种子的伪随机序列生成布局，让 Points 与 InstancedMesh 模式下颗粒位置完全对应。
function createLayout(count) {
  const positions = [];
  const colors = [];
  const color = new THREE.Color();
  let seed = 2024;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    // 沿一个螺旋环带分布：让两种模式下的颗粒都在同一姿态下被观察
    const t = (i / count) * Math.PI * 2;
    const r = 2.6 + (rand() - 0.5) * 0.4;
    const y = Math.sin(t * 3) * 0.5 + (rand() - 0.5) * 0.3 + 1.4;
    positions.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
    // 色相按角度铺开，方便肉眼对照两模式下颜色是否一致
    color.setHSL(t / (Math.PI * 2), 0.65, 0.55);
    colors.push(color.clone());
  }
  return { positions, colors };
}

function makeCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const particlesVsInstancedExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0e1418');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 2.6, 7.4);
    camera.lookAt(0, 1.4, 0);

    scene.add(new THREE.HemisphereLight('#ffffff', '#404a5a', 0.8));
    const key = new THREE.DirectionalLight('#ffffff', 1.8);
    key.position.set(4, 6, 5);
    scene.add(key);

    const grid = new THREE.GridHelper(20, 20, '#243150', '#161e30');
    grid.position.y = 0.01;
    scene.add(grid);

    // 共享纹理与几何：让两模式的视觉差异只来自"点是图元 vs 几何体是图元"
    const circleTexture = makeCircleTexture();
    const pointsMaterial = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.22,
      sizeAttenuation: true,
      vertexColors: true,
      map: circleTexture,
      transparent: true,
      alphaTest: 0.5,
      depthWrite: false
    });
    const icoGeometry = new THREE.IcosahedronGeometry(0.12, 0);
    const icoMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.45,
      metalness: 0.05
    });

    const state = {
      renderMode: 'points',
      count: 1500,
      animate: true,
      rotationY: 0,
      container: null,
      layout: null
    };

    function disposeContainer() {
      if (!state.container) return;
      scene.remove(state.container);
      // Points 自己持有一份 geometry；InstancedMesh 共享外部 icoGeometry，
      // 这里只 dispose Points 的几何 + InstancedMesh 的实例缓冲，不释放共享资源。
      if (state.container.isPoints) {
        state.container.geometry.dispose();
      } else if (state.container.isInstancedMesh) {
        state.container.dispose();
      }
      state.container = null;
    }

    function buildPoints(count) {
      const { positions, colors } = state.layout;
      const posArray = new Float32Array(count * 3);
      const colArray = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        posArray[i * 3]     = positions[i].x;
        posArray[i * 3 + 1] = positions[i].y;
        posArray[i * 3 + 2] = positions[i].z;
        colArray[i * 3]     = colors[i].r;
        colArray[i * 3 + 1] = colors[i].g;
        colArray[i * 3 + 2] = colors[i].b;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
      geometry.setAttribute('color',    new THREE.Float32BufferAttribute(colArray, 3));
      geometry.computeBoundingSphere();
      const points = new THREE.Points(geometry, pointsMaterial);
      scene.add(points);
      state.container = points;
    }

    function buildInstanced(count) {
      const { positions, colors } = state.layout;
      const mesh = new THREE.InstancedMesh(icoGeometry, icoMaterial, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.copy(positions[i]);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, colors[i]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      state.container = mesh;
    }

    function rebuild(args) {
      // count 变化时重建布局；renderMode 变化只需重建容器（布局可复用）
      if (!state.layout || state.layout.positions.length !== args.count) {
        state.layout = createLayout(args.count);
      }
      disposeContainer();
      if (args.renderMode === 'points') {
        buildPoints(args.count);
      } else {
        buildInstanced(args.count);
      }
      state.renderMode = args.renderMode;
      state.count = args.count;
    }
    rebuild({ renderMode: 'points', count: state.count });

    function frame(delta) {
      if (state.animate && state.container) {
        state.rotationY += delta * 0.22;
        state.container.rotation.y = state.rotationY;
      }
      renderer.render(scene, camera);
      emitSnapshot({ renderer, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return {
      scene, state, rebuild,
      icoGeometry, icoMaterial, pointsMaterial, circleTexture, loop
    };
  },

  apply(instance, args) {
    const { state, rebuild, loop } = instance;
    const needsRebuild =
      state.renderMode !== args.renderMode || state.count !== args.count;
    if (needsRebuild) {
      rebuild(args);
    }
    state.animate = args.animate;
    loop.renderOnce();
  },

  readout({ renderer, state }) {
    const info = renderer.info;
    return [
      ['渲染模式',
        state.renderMode === 'points'
          ? 'Points（每顶点一个点）'
          : 'InstancedMesh（每实例一个八面体）'],
      ['颗粒数', state.count],
      ['本帧 draw calls', info.render.calls],
      ['本帧 triangles', info.render.triangles],
      ['内存几何体', info.memory.geometries]
    ];
  }
};
