/*
本示例演示 OrbitControls 如何把鼠标和触控输入转换成相机绕 target 的环绕、缩放和平移。
Controls 里的每一项都直通同名的 controls 属性，targetY 对应 controls.target.y。

读代码先看 syncControls()：它把当前状态同步到 controls 属性；render 循环里每帧调用 controls.update() 让阻尼和自动旋转生效。
预期观察：拖拽只改相机姿态、不动场景对象；调整目标高度后 targetMarker 和环绕中心一起移动；
关闭阻尼后松手即停；滚轮缩放被夹在 minDistance 到 maxDistance 之间。
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects,
  target
} from '../../../../assets/shared-scene.js';

const initialState = {
  damping: true,
  autoRotate: false,
  pan: true,
  minDistance: 3,
  maxDistance: 16,
  targetY: 0.7
};

export function createOrbitControlsScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  placeCamera(camera, 12);

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

  const loop = createRenderLoop(canvas, (delta) => {
    rotateObjects(world.objects, delta);
    controls.update(delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
  });

  syncControls();
  resize();
  loop.renderOnce();

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
      loop.dispose();
      observer.disconnect();
      controls.dispose();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
