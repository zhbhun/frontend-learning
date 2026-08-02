/*
演示 InstancedMesh 如何用一份几何和材质、一次 draw call 渲染大量实例，
并与等量普通 Mesh 对照 draw call、triangles 与资源占用。

输入是渲染模式（InstancedMesh / 等量普通 Mesh）、实例数、颜色模式（统一 / 每实例随机）
和是否让实例自转。InstancedMesh 模式下整批实例共享一份 material，每实例颜色由 instanceColor
attribute 提供；切到普通 Mesh 模式则每个对象一次 draw call，每实例颜色还必须克隆 material。
读文件时先看 rebuild() 怎样按 renderMode 切换实现，再看 frame() 怎样用 dummy Object3D
重写实例矩阵并置 instanceMatrix.needsUpdate。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const COLORS = [
  '#3d73d9', '#d17832', '#2f8b72', '#8f5ac7',
  '#c24a4a', '#b88a2c', '#3a8aa6', '#7a8c2f'
];
const SPREAD = 2.6;

// 用同一种子随机序列生成实例布局，让 instanced 与 individual 模式下实例位置完全对应，
// 切换模式时画面不会因为随机数不同而整体跳变。
function createInstanceLayout(count) {
  const dummy = new THREE.Object3D();
  const matrices = [];
  const colors = [];
  const color = new THREE.Color();
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    // 球形分布：半径用 cbrt 让靠近表面的密度与内部一致。
    const r = Math.cbrt(rand()) * SPREAD;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    dummy.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) + 0.5,
      r * Math.cos(phi)
    );
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
    dummy.scale.setScalar(0.35 + rand() * 0.35);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
    color.set(COLORS[i % COLORS.length]);
    colors.push(color.clone());
  }
  return { matrices, colors };
}

export const instancedMeshExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 50);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 1, 0);

    scene.add(new THREE.GridHelper(14, 14, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2.2));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.7));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(5, 8, 6);
    scene.add(key);

    // 共享几何与材质：InstancedMesh 与等量 Mesh 用同一份资源，对照才公平。
    const geometry = new THREE.IcosahedronGeometry(0.34, 0);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.5 });

    const state = {
      renderMode: 'instanced',
      count: 1000,
      colorMode: 'unified',
      animate: false,
      container: null,
      clonedMaterials: [],
      layout: null,
      rotationY: 0
    };

    function disposeContainer() {
      if (!state.container) return;
      scene.remove(state.container);
      // individual+perInstance 模式下为每个 Mesh 克隆的 material 在这里释放；
      // 共享的 geometry 和 baseMaterial 不在此释放，它们随范例销毁时统一回收。
      state.clonedMaterials.forEach((material) => material.dispose());
      state.clonedMaterials = [];
      if (state.container.isInstancedMesh) {
        // 释放 instanceMatrix / instanceColor 这两块实例缓冲。
        state.container.dispose();
      }
      state.container = null;
    }

    function buildInstanced(count, colorMode) {
      const layout = createInstanceLayout(count);
      const mesh = new THREE.InstancedMesh(geometry, baseMaterial, count);
      // 实例矩阵每帧都可能被 animate 重写，标记为动态上传。
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, layout.matrices[i]);
      }
      if (colorMode === 'perInstance') {
        for (let i = 0; i < count; i++) {
          mesh.setColorAt(i, layout.colors[i]);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      state.container = mesh;
      state.layout = layout;
    }

    function buildIndividual(count, colorMode) {
      const layout = createInstanceLayout(count);
      const group = new THREE.Group();
      for (let i = 0; i < count; i++) {
        // 普通 Mesh 想要每实例颜色必须克隆 material；这正是 InstancedMesh 的优势之一。
        const material = colorMode === 'perInstance' ? baseMaterial.clone() : baseMaterial;
        if (colorMode === 'perInstance') {
          material.color.copy(layout.colors[i]);
          state.clonedMaterials.push(material);
        }
        const mesh = new THREE.Mesh(geometry, material);
        // 直接写矩阵并关 matrixAutoUpdate，避免 N 个对象每帧各自重算 TRS。
        mesh.matrix.copy(layout.matrices[i]);
        mesh.matrixAutoUpdate = false;
        mesh.matrixWorldNeedsUpdate = true;
        group.add(mesh);
      }
      scene.add(group);
      state.container = group;
      state.layout = layout;
    }

    function rebuild(args) {
      disposeContainer();
      if (args.renderMode === 'instanced') {
        buildInstanced(args.count, args.colorMode);
      } else {
        buildIndividual(args.count, args.colorMode);
      }
      state.renderMode = args.renderMode;
      state.count = args.count;
      state.colorMode = args.colorMode;
    }

    rebuild({ renderMode: 'instanced', count: 1000, colorMode: 'unified' });

    const dummy = new THREE.Object3D();

    function frame(delta) {
      state.rotationY += delta * 0.15;
      // 整体缓慢旋转容器，让 3D 分布更直观；Group 和 InstancedMesh 都是 Object3D，rotation 通用。
      if (state.container) {
        state.container.rotation.y = state.rotationY;
      }
      // animate 仅在 InstancedMesh 模式下生效：每帧重写全部实例矩阵，演示动态 instanceMatrix。
      if (state.animate && state.container?.isInstancedMesh) {
        const mesh = state.container;
        const layout = state.layout;
        for (let i = 0; i < state.count; i++) {
          // 把静态布局矩阵分解回 TRS，叠加一个随实例变化的旋转，再合成新矩阵写入。
          dummy.matrix.copy(layout.matrices[i]);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          dummy.rotateY(delta * (0.3 + (i % 5) * 0.08));
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        // 漏掉这行 GPU 拿不到新矩阵，画面会停在上一帧分布——这是 InstancedMesh 最常见的坑。
        mesh.instanceMatrix.needsUpdate = true;
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

    return { scene, state, rebuild, loop };
  },

  apply(instance, args) {
    const { state, rebuild, loop } = instance;
    // renderMode / count / colorMode 任意一个变化都需要重建容器；animate 只切状态。
    const needsRebuild =
      state.renderMode !== args.renderMode ||
      state.count !== args.count ||
      state.colorMode !== args.colorMode;
    if (needsRebuild) {
      rebuild(args);
    }
    state.animate = args.animate;
    loop.renderOnce();
  },

  readout({ renderer, state }) {
    const info = renderer.info;
    const colorLabel =
      state.colorMode === 'unified'
        ? 'material.color 统一'
        : state.renderMode === 'instanced'
          ? '每实例 setColorAt（共享 1 个 material）'
          : '每实例克隆 material（不共享）';
    return [
      ['渲染模式', state.renderMode === 'instanced'
        ? 'InstancedMesh（1 个对象）'
        : `${state.count} 个普通 Mesh`],
      ['实例数 / 对象数', state.count],
      ['颜色模式', colorLabel],
      ['本帧 draw calls', info.render.calls],
      ['本帧 triangles', info.render.triangles],
      ['内存几何体', info.memory.geometries],
      ['内存材质', info.memory.materials]
    ];
  }
};
