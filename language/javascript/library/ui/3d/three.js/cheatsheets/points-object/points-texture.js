/*
演示用 map 给每个点贴图，以及做"非方块点"为什么必须处理 alpha。

PointsMaterial 默认把每个点画成方块；想画圆、星或图像粒子，需要带 alpha 的纹理，并通过
transparent 或 alphaTest 让 alpha 生效——否则纹理的 RGB 仍占满整个方块。本例用
CanvasTexture 程序化生成"圆形 alpha"纹理，避免依赖外部资源；同一份纹理切 map on/off，
再独立切 transparent 与 alphaTest，观察画面里圆的边缘是否真正透明。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const POINT_COUNT = 1200;

function createPointCloudGeometry() {
  const positions = new Float32Array(POINT_COUNT * 3);
  for (let i = 0; i < POINT_COUNT; i++) {
    const radius = 0.6 + Math.random() * 2.0;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

// 程序化生成一张"白圆 + 透明背景"的 CanvasTexture。圆形内 RGB=255、alpha=1；
// 圆形外 alpha=0、RGB=0。这样关闭 transparent 时会看到"橙色圆 + 黑方块"的边缘伪影。
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
  // map 表示颜色数据，按 sRGB 解释才能和 material.color 数值对得上。
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const pointsTextureExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0.6, 6);
    camera.lookAt(0, 0, 0);

    const geometry = createPointCloudGeometry();
    const circleTexture = makeCircleTexture();

    const material = new THREE.PointsMaterial({
      color: '#d17832',
      size: 0.32,
      sizeAttenuation: true,
      map: circleTexture,
      transparent: true,
      alphaTest: 0,
      // 半透明粒子常见做法：不写深度，避免按绘制顺序错误遮挡其他对象。
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const state = {
      mapType: 'circle',
      transparent: true,
      alphaTest: 0
    };

    function frame(delta) {
      points.rotation.y += delta * 0.16;
      renderer.render(scene, camera);
      emitSnapshot({ renderer, material, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { points, material, circleTexture, state, loop };
  },

  apply(instance, args) {
    const { material, circleTexture, state, loop } = instance;
    material.map = args.mapType === 'circle' ? circleTexture : null;
    material.transparent = args.transparent;
    material.alphaTest = args.alphaTest;
    material.needsUpdate = true;

    state.mapType = args.mapType;
    state.transparent = args.transparent;
    state.alphaTest = args.alphaTest;
    loop.renderOnce();
  },

  readout({ renderer, material, state }) {
    // map + (transparent 或 alphaTest>0) 才能让纹理的 alpha 真正生效；这个派生值直接告诉读者当前组合是否可行。
    const canShowAlpha =
      !!material.map && (material.transparent || material.alphaTest > 0);
    return [
      ['material.map', state.mapType === 'none' ? 'null' : 'circle texture'],
      ['material.transparent', state.transparent ? 'true' : 'false'],
      ['material.alphaTest', state.alphaTest.toFixed(2)],
      ['能否显示透明边缘', canShowAlpha ? '是' : '否'],
      ['material.depthWrite', material.depthWrite ? 'true' : 'false'],
      ['本帧 draw calls', renderer.info.render.calls]
    ];
  }
};
