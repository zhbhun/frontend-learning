/*
多个 Helper 实例共用的 WebGL 舞台：渲染器、观察相机、环境光、尺寸与视口循环。

课程范例各自 build(scene) 往场景里加被观察对象与 Helper；本文件只负责把画布接到
create / apply / readout 生命周期，并在离开 Docs 页时释放上下文。

apply() 里对返回对象写入的字段（如 autoUpdate）会进入同一份 runtime，
从而被每帧 snapshot / readout 读到。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  disposeObjectTree,
  readCanvasSize
} from '../../assets/shared-scene.js';

export function createHelpersExampleFrame({
  canvas,
  emitSnapshot,
  cameraPosition = [7, 5.5, 8],
  lookAt = [0, 0.6, 0],
  cameraFov = 48,
  withDefaultLights = true,
  withGroundGrid = false,
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

  if (withDefaultLights) {
    scene.add(new THREE.HemisphereLight('#ffffff', '#7c8d83', 0.85));
    const key = new THREE.DirectionalLight('#ffffff', 1.8);
    key.position.set(4, 6, 5);
    scene.add(key);
  }

  if (withGroundGrid) {
    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
  }

  const built = build({ scene, camera, renderer }) ?? {};
  const runtime = {
    scene,
    camera,
    renderer,
    ...built
  };

  function frame(delta) {
    animate?.(runtime, delta);
    renderer.render(scene, camera);

    const snapshot = { scene, camera, renderer };
    for (const [key, value] of Object.entries(runtime)) {
      if (typeof value !== 'function') {
        snapshot[key] = value;
      }
    }
    Object.assign(snapshot, readSnapshot?.(runtime, camera) ?? {});
    emitSnapshot(snapshot);
  }

  const loop = createRenderLoop(canvas, frame);
  runtime.loop = loop;

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    loop.renderOnce();
  }

  const resizeObserver = createResizeObserver(canvas, resize);
  resize();

  runtime.render = () => {
    loop.renderOnce();
  };

  runtime.dispose = () => {
    loop.dispose();
    resizeObserver.disconnect();
    disposeObjectTree(scene);
    renderer.dispose();
  };

  return runtime;
}

export function addSubjectMesh(scene, { color = '#3d73d9', position = [0, 0.7, 0] } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
  );
  mesh.position.fromArray(position);
  scene.add(mesh);
  return mesh;
}
