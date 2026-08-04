/*
Object3D 课多个实例共用的 WebGL 舞台：渲染器、相机、灯光、尺寸与视口循环。

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

export function createObject3DExampleFrame({
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

  const built = build({ scene, camera, renderer }) ?? {};

  function frame(delta) {
    animate?.(built, delta);
    renderer.render(scene, camera);
    emitSnapshot({
      scene,
      camera,
      renderer,
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
    renderer,
    loop,
    ...built,
    render() {
      loop.renderOnce();
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
