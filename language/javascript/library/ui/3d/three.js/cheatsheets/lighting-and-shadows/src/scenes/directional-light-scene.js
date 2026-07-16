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
 * 这个文件只演示 DirectionalLight：平行光用 position -> target 决定照射方向。
 * 阅读主线：先看 light 和 target 的关系，再看 updateLight() 中 helper.update() 的时机。
 * 控件对应：强度 -> light.intensity，光源 X/Z 与目标 X -> 平行光方向；阴影留到 shadow-map 示例。
 */
export function createDirectionalLightLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    intensity: 2.2,
    lightX: -2.8,
    lightZ: 3.4,
    targetX: 0,
    showHelper: true
  };

  const ground = createGround();
  const litObject = createLitObject('#2f83d8');
  const light = new THREE.DirectionalLight('#ffffff', state.intensity);
  const target = new THREE.Object3D();
  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 8),
    new THREE.MeshBasicMaterial({ color: '#f59e0b' })
  );
  const helper = new THREE.DirectionalLightHelper(light, 0.65, '#f59e0b');

  litObject.position.set(0, 0.05, 0);
  target.position.set(state.targetX, -0.1, 0);
  target.add(targetMarker);
  light.target = target;
  scene.add(ground, litObject, target, light, helper);

  function updateLight() {
    light.intensity = state.intensity;
    light.position.set(state.lightX, 4.2, state.lightZ);
    target.position.x = state.targetX;
    helper.visible = state.showHelper;

    // target 或 light 变化后先更新世界矩阵，再刷新 helper，方向线才会对准新位置。
    light.updateMatrixWorld();
    target.updateMatrixWorld();
    helper.update();

    writeText('position-state', `light (${formatNumber(light.position.x)}, ${formatNumber(light.position.y)}, ${formatNumber(light.position.z)})`);
    writeText('target-state', `target x ${formatNumber(target.position.x)}; intensity ${formatNumber(light.intensity)}`);
    writeText('material-state', `${litObject.material.type} 受 DirectionalLight 方向影响`);
  }

  bindRange('directional-intensity', 'directional-intensity-value', formatNumber, (value) => {
    state.intensity = value;
    updateLight();
  });
  bindRange('light-x', 'light-x-value', formatNumber, (value) => {
    state.lightX = value;
    updateLight();
  });
  bindRange('light-z', 'light-z-value', formatNumber, (value) => {
    state.lightZ = value;
    updateLight();
  });
  bindRange('target-x', 'target-x-value', formatNumber, (value) => {
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
