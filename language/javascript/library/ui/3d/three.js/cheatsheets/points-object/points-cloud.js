/*
演示 PointsMaterial 的 size 与 sizeAttenuation 如何决定每个顶点的画面尺寸。

输入是 sizeAttenuation 开关、世界单位 size、像素 size 与相机距离。同一个材质只有一个
size，但它的单位依赖 sizeAttenuation：true 时是世界单位，透视相机下近大远小；false 时
是屏幕像素，远近一致。读文件时先看 apply() 怎样按开关挑 size，再看 frame() 怎样用相机
距离呈现差异。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const POINT_COUNT = 1500;

// 在球壳里撒点，保证同时有靠近相机和远离相机的点，sizeAttenuation 的差异才看得出来。
function createPointCloudGeometry() {
  const positions = new Float32Array(POINT_COUNT * 3);
  for (let i = 0; i < POINT_COUNT; i++) {
    const radius = 0.4 + Math.random() * 2.0;
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

export const pointsCloudExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    const geometry = createPointCloudGeometry();
    const material = new THREE.PointsMaterial({
      color: '#3d73d9',
      size: 0.18,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2.4));

    const state = {
      size: material.size,
      sizeAttenuation: material.sizeAttenuation,
      cameraDistance: camera.position.length()
    };

    function frame(delta) {
      // 缓慢自转，让远近不同的点轮流出现在镜头前，size 的差异更直观。
      points.rotation.y += delta * 0.18;
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

    return { points, material, camera, state, loop };
  },

  apply(instance, args) {
    const { material, camera, state, loop } = instance;
    material.sizeAttenuation = args.sizeAttenuation;
    // 同一个 size 字段，单位由 sizeAttenuation 决定；两档 size 让两种模式下都有合理范围。
    material.size = args.sizeAttenuation ? args.worldSize : args.pixelSize;

    // 相机沿 +Z 摆放并 lookAt 原点，distance 直接决定透视投影下点的大小（attenuation=true 时）。
    camera.position.set(0, 0, args.cameraDistance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    state.size = material.size;
    state.sizeAttenuation = material.sizeAttenuation;
    state.cameraDistance = args.cameraDistance;
    loop.renderOnce();
  },

  readout({ renderer, state }) {
    return [
      ['material.size', state.size.toFixed(2)],
      ['material.sizeAttenuation', state.sizeAttenuation ? 'true' : 'false'],
      ['当前单位', state.sizeAttenuation ? '世界单位' : '屏幕像素'],
      ['相机距离', state.cameraDistance.toFixed(1)],
      ['position 顶点', POINT_COUNT],
      ['本帧 draw calls', renderer.info.render.calls]
    ];
  }
};
