import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createCameraTargetScene,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects,
  target
} from '../shared-scene.js';

const initialState = {
  damping: true,
  autoRotate: false,
  pan: true,
  minDistance: 3,
  maxDistance: 16,
  targetY: 0.7,
  lastTime: 0,
  animationId: 0
};

export function createOrbitControlsScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  placeCamera(camera, 8);

  // OrbitControls 管理相机姿态；target 是环绕、缩放和平移时的观察中心。
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = state.damping;
  controls.dampingFactor = 0.08;
  controls.minDistance = state.minDistance;
  controls.maxDistance = state.maxDistance;
  controls.enablePan = state.pan;
  controls.autoRotate = state.autoRotate;
  controls.autoRotateSpeed = 1.4;

  function syncControls() {
    controls.enableDamping = state.damping;
    controls.autoRotate = state.autoRotate;
    controls.enablePan = state.pan;
    controls.minDistance = state.minDistance;
    controls.maxDistance = Math.max(state.maxDistance, state.minDistance + 0.5);
    controls.target.y = state.targetY;
    world.targetMarker.position.copy(controls.target);
    controls.update();
  }

  function publishSnapshot() {
    onSnapshot?.({
      targetText: formatVector(controls.target),
      distance: camera.position.distanceTo(controls.target),
      damping: controls.enableDamping,
      autoRotate: controls.autoRotate,
      minDistance: controls.minDistance,
      maxDistance: controls.maxDistance,
      targetY: controls.target.y
    });
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    publishSnapshot();
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    rotateObjects(world.objects, delta);
    controls.update(delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
    state.animationId = window.requestAnimationFrame(render);
  }

  syncControls();
  resize();
  render();

  const observer = createResizeObserver(canvas, resize);

  return {
    setDamping(enabled) {
      state.damping = enabled;
      syncControls();
    },
    setAutoRotate(enabled) {
      state.autoRotate = enabled;
      syncControls();
    },
    setPan(enabled) {
      state.pan = enabled;
      syncControls();
    },
    setMinDistance(distance) {
      state.minDistance = distance;
      syncControls();
    },
    setMaxDistance(distance) {
      state.maxDistance = distance;
      syncControls();
    },
    setTargetY(targetY) {
      state.targetY = targetY;
      syncControls();
    },
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      observer.disconnect();
      controls.dispose();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
