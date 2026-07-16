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
 * 这个文件只演示 PointLight：光从一个点向四周发出，并受 distance/decay 影响。
 * 阅读主线：先看 PointLight(color, intensity, distance, decay)，再看 updateLight() 如何改变位置和衰减。
 * 控件对应：强度、距离、衰减、光源 X/Z 都直接写回 point light；helper 显示有效照明范围。
 */
export function createPointLightLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    intensity: 24,
    distance: 5,
    decay: 2,
    lightX: 1.9,
    lightZ: 1.2,
    showHelper: true
  };

  const ground = createGround();
  const litObject = createLitObject('#2f83d8');
  const point = new THREE.PointLight('#ffcc88', state.intensity, state.distance, state.decay);
  const helper = new THREE.PointLightHelper(point, 0.22, '#ffb24a');

  litObject.position.set(-0.35, 0.05, 0);
  scene.add(ground, litObject, point, helper);

  function updateLight() {
    point.intensity = state.intensity;
    point.distance = state.distance;
    point.decay = state.decay;
    point.position.set(state.lightX, 1.7, state.lightZ);
    helper.visible = state.showHelper;
    helper.update();

    writeText('light-state', `intensity ${formatNumber(point.intensity)}; color #ffcc88`);
    writeText('position-state', `(${formatNumber(point.position.x)}, ${formatNumber(point.position.y)}, ${formatNumber(point.position.z)})`);
    writeText('falloff-state', `distance ${formatNumber(point.distance)}; decay ${formatNumber(point.decay)}`);
  }

  bindRange('point-intensity', 'point-intensity-value', formatNumber, (value) => {
    state.intensity = value;
    updateLight();
  });
  bindRange('point-distance', 'point-distance-value', formatNumber, (value) => {
    state.distance = value;
    updateLight();
  });
  bindRange('point-decay', 'point-decay-value', formatNumber, (value) => {
    state.decay = value;
    updateLight();
  });
  bindRange('point-x', 'point-x-value', formatNumber, (value) => {
    state.lightX = value;
    updateLight();
  });
  bindRange('point-z', 'point-z-value', formatNumber, (value) => {
    state.lightZ = value;
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
