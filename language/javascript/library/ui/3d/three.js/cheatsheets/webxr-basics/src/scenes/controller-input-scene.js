import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import {
  createCamera,
  createRenderer,
  createWebXrPracticeWorld,
  disposeObjectTree,
  formatDegrees,
  raycastFromObject,
  resizeForCanvas,
  setPickState
} from '../shared-stage.js';
import { bindButton, bindRange, mountEmbeddedButton, writeText } from '../shared-ui.js';

/*
 * 本示例演示 XR controller 的两组空间：getController(index) 是 target ray，
 * getControllerGrip(index) 是握持模型；select/squeeze 事件统一走 handleSelectStart/End。
 * 阅读主线：先看 setupRealController() 如何创建 controller/grip/model，
 * 再看 castFromController() 如何把 controller 的 -Z 方向交给 Raycaster。
 * 页面控件对应：fallback 射线角度和模拟按钮在没有 XR 设备时触发同一套输入逻辑。
 * 预期观察：真实或模拟 selectstart 都会用射线命中最近物体，selectend 释放高亮。
 */
export function createControllerInputLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const { scene, animated, pickables } = createWebXrPracticeWorld();
  const raycaster = new THREE.Raycaster();
  const state = {
    selected: null,
    squeezeCount: 0,
    fallbackRayAngle: 0,
    activeController: null
  };

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  mountEmbeddedButton('xr-button-slot', VRButton.createButton(renderer));

  const fallbackController = createFallbackController();
  scene.add(fallbackController);
  setupRealController(renderer, scene, state, {
    onEvent: writeEvent,
    onSelectStart: () => handleSelectStart(state.activeController ?? fallbackController, '真实 selectstart'),
    onSelectEnd: () => handleSelectEnd('真实 selectend'),
    onSqueeze: () => handleSqueeze('真实 squeeze')
  });

  bindRange('ray-angle', 'ray-output', formatDegrees, (value) => {
    state.fallbackRayAngle = THREE.MathUtils.degToRad(value);
    fallbackController.rotation.y = state.fallbackRayAngle;
  });

  bindButton('simulate-select-start', () => handleSelectStart(fallbackController, '模拟 selectstart'));
  bindButton('simulate-select-end', () => handleSelectEnd('模拟 selectend'));
  bindButton('simulate-squeeze', () => handleSqueeze('模拟 squeeze'));

  function handleSelectStart(controller, label) {
    writeEvent(label);
    writeText('select-state', '按下');

    const hit = castFromController(controller);
    if (!hit) {
      clearSelected();
      writeText('hit-state', '无');
      return;
    }

    clearSelected();
    state.selected = hit.object;
    setPickState(state.selected, 'active');
    writeText('hit-state', `${hit.object.name} / ${hit.distance.toFixed(2)}`);
  }

  function handleSelectEnd(label) {
    writeEvent(label);
    writeText('select-state', '未按下');
    clearSelected();
  }

  function handleSqueeze(label) {
    state.squeezeCount += 1;
    animated.scale.setScalar(state.squeezeCount % 2 === 0 ? 1 : 0.86);
    writeEvent(label);
    writeText('squeeze-state', String(state.squeezeCount));
  }

  function castFromController(controller) {
    controller.updateMatrixWorld(true);
    const hits = raycastFromObject(raycaster, controller, pickables);
    return hits[0] ?? null;
  }

  function clearSelected() {
    if (state.selected) {
      setPickState(state.selected, 'idle');
      state.selected = null;
    }
  }

  function writeEvent(label) {
    writeText('event-state', label);
  }

  renderer.setAnimationLoop((time = 0) => {
    resizeForCanvas(renderer, camera, canvas);
    const elapsed = time * 0.001;
    animated.rotation.y = Math.sin(elapsed * 0.5) * 0.18;
    fallbackController.visible = !renderer.xr.isPresenting;
    writeText('input-source-state', renderer.xr.isPresenting ? 'XR controller' : 'fallback 射线');
    renderer.render(scene, camera);
  });

  window.addEventListener('beforeunload', () => {
    renderer.setAnimationLoop(null);
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function setupRealController(renderer, scene, state, handlers) {
  const controller = renderer.xr.getController(0);
  controller.name = 'XR target ray 0';
  controller.add(createControllerRay('#2f83d8'));

  controller.addEventListener('connected', (event) => {
    state.activeController = controller;
    handlers.onEvent(`connected: ${event.data?.handedness ?? 'unknown'}`);
  });
  controller.addEventListener('disconnected', () => {
    state.activeController = null;
    handlers.onEvent('disconnected');
  });
  controller.addEventListener('selectstart', handlers.onSelectStart);
  controller.addEventListener('selectend', handlers.onSelectEnd);
  controller.addEventListener('squeezestart', handlers.onSqueeze);
  scene.add(controller);

  const controllerGrip = renderer.xr.getControllerGrip(0);
  controllerGrip.name = 'XR grip 0';
  const controllerModelFactory = new XRControllerModelFactory();
  controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
  scene.add(controllerGrip);
}

function createFallbackController() {
  const group = new THREE.Group();
  group.name = 'fallback controller';
  group.position.set(0, 0.05, 2.55);
  group.rotation.x = -0.14;

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.22, 0.38),
    new THREE.MeshStandardMaterial({
      color: '#455565',
      roughness: 0.48,
      metalness: 0.08
    })
  );
  handle.position.z = 0.1;

  group.add(handle, createControllerRay('#d6832b'));
  return group;
}

function createControllerRay(color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -4)
  ]);
  const ray = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      linewidth: 2
    })
  );
  ray.name = 'controller target ray';
  return ray;
}
