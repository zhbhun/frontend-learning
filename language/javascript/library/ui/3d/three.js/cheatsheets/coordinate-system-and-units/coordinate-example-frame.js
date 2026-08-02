/*
坐标课四个实例共用的 WebGL 舞台：渲染器、相机、灯光、尺寸与视口循环。

课程范例各自 build(scene) 往场景里加内容；本文件只负责把画布接到
create / apply / readout 生命周期，并在离开 Docs 页时释放上下文。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  disposeObjectTree,
  readCanvasSize
} from '../../assets/shared-scene.js';

export function createCoordinateExampleFrame({
  canvas,
  emitSnapshot,
  cameraPosition = [6.4, 5.2, 7.2],
  lookAt = [0, 0.5, 0],
  cameraFov = 48,
  build,
  readSnapshot,
  animate
}) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf3ef');

  const camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 100);
  camera.position.fromArray(cameraPosition);
  camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);

  scene.add(new THREE.HemisphereLight('#ffffff', '#7c8d83', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(4, 6, 5);
  scene.add(key);

  const built = build({ scene, camera }) ?? {};

  function frame(delta) {
    animate?.(built, delta);
    renderer.render(scene, camera);
    emitSnapshot({
      scene,
      camera,
      ...built,
      ...readSnapshot?.(built, camera)
    });
  }

  const loop = createRenderLoop(canvas, frame);

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    loop.renderOnce();
  }

  const resizeObserver = createResizeObserver(canvas, resize);
  resize();

  return {
    scene,
    camera,
    loop,
    ...built,
    render() {
      loop.renderOnce();
    },
    setCamera(position, target = lookAt) {
      camera.position.fromArray(position);
      camera.lookAt(target[0], target[1], target[2]);
    },
    dispose() {
      loop.dispose();
      resizeObserver.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

export function addGroundGrid(scene, size = 10) {
  const grid = new THREE.GridHelper(size, size, '#8ba096', '#cdd8d1');
  scene.add(grid);
  return grid;
}

export function addWorldAxes(scene, length = 2.4) {
  const axes = new THREE.AxesHelper(length);
  scene.add(axes);
  return axes;
}

export function addAxisEndDots(scene, distance = 2) {
  const geometry = new THREE.SphereGeometry(0.18, 20, 14);
  const specs = [
    { position: [distance, 0, 0], color: '#c23b3b' },
    { position: [0, distance, 0], color: '#3b8a4f' },
    { position: [0, 0, distance], color: '#345fb0' }
  ];

  return specs.map(({ position, color }) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
    );
    mesh.position.fromArray(position);
    scene.add(mesh);
    return mesh;
  });
}

export function addOriginMarker(scene) {
  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 12),
    new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.5 })
  );
  scene.add(origin);
  return origin;
}

// 绕 Y 轴的“指针”：一条从原点沿局部 +X 伸出的细长盒子，用来观察旋转方向。
export function addYawPointer(parent, options = {}) {
  const {
    length = 1.8,
    color = '#d17832',
    y = 0.12
  } = options;

  const pointer = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.12, 0.18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  );
  pointer.position.set(length / 2, y, 0);
  parent.add(pointer);
  return pointer;
}
