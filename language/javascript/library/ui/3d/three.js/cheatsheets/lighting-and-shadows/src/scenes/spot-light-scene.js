import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createGround,
  createLitObject,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 SpotLight：它在 PointLight 的距离衰减之外，多了 target、angle 和 penumbra。
 * 阅读主线：先看 spot.target 的指向关系，再看角度从页面“度数”转换为 three.js 需要的弧度。
 * 控件对应：锥角 -> spot.angle，半影 -> spot.penumbra，目标 X -> spot.target.position.x。
 */
export function createSpotLightLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    intensity: 42,
    distance: 8,
    angleDeg: 22,
    penumbra: 0.35,
    decay: 2,
    targetX: 0,
    showHelper: true
  };

  const ground = createGround();
  const litObject = createLitObject('#2f83d8');
  const spot = new THREE.SpotLight('#fff1b8', state.intensity, state.distance, THREE.MathUtils.degToRad(state.angleDeg), state.penumbra, state.decay);
  const target = new THREE.Object3D();
  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 8),
    new THREE.MeshBasicMaterial({ color: '#f59e0b' })
  );
  const helper = new THREE.SpotLightHelper(spot, '#f59e0b');

  litObject.position.set(0, 0.05, 0);
  spot.position.set(-2.2, 3.8, 2.8);
  target.position.set(state.targetX, -0.3, 0);
  target.add(targetMarker);
  spot.target = target;
  scene.add(ground, litObject, target, spot, helper);

  function updateLight() {
    spot.intensity = state.intensity;
    spot.distance = state.distance;
    spot.angle = THREE.MathUtils.degToRad(state.angleDeg);
    spot.penumbra = state.penumbra;
    spot.decay = state.decay;
    target.position.x = state.targetX;
    helper.visible = state.showHelper;

    // SpotLightHelper 依赖 target 的世界矩阵；目标点和锥角变化后都要手动刷新。
    spot.updateMatrixWorld();
    target.updateMatrixWorld();
    helper.update();

    writeText('cone-state', `angle ${formatNumber(state.angleDeg)}deg; penumbra ${formatNumber(spot.penumbra)}`);
    writeText('target-state', `target x ${formatNumber(target.position.x)}`);
    writeText('falloff-state', `distance ${formatNumber(spot.distance)}; decay ${formatNumber(spot.decay)}; intensity ${formatNumber(spot.intensity)}`);
  }

  bindRange('spot-intensity', 'spot-intensity-value', formatNumber, (value) => {
    state.intensity = value;
    updateLight();
  });
  bindRange('spot-distance', 'spot-distance-value', formatNumber, (value) => {
    state.distance = value;
    updateLight();
  });
  bindRange('spot-angle', 'spot-angle-value', (value) => `${formatNumber(value)}deg`, (value) => {
    state.angleDeg = value;
    updateLight();
  });
  bindRange('spot-penumbra', 'spot-penumbra-value', formatNumber, (value) => {
    state.penumbra = value;
    updateLight();
  });
  bindRange('spot-decay', 'spot-decay-value', formatNumber, (value) => {
    state.decay = value;
    updateLight();
  });
  bindRange('spot-target-x', 'spot-target-x-value', formatNumber, (value) => {
    state.targetX = value;
    updateLight();
  });
  bindCheckbox('show-helper', (checked) => {
    state.showHelper = checked;
    updateLight();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    litObject.rotation.set(0.32, time * 0.42, 0.08);
    helper.update();
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
