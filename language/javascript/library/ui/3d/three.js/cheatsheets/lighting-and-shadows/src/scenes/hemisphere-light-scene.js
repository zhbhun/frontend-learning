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
import { bindCheckbox, bindColor, bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 HemisphereLight：它用天空色和地面色给受光材质补光。
 * 阅读主线：先看 hemisphere 的 skyColor/groundColor，再看 updateLight() 如何同步颜色和 helper。
 * 控件对应：强度 -> hemisphere.intensity，天空色 -> hemisphere.color，地面色 -> hemisphere.groundColor。
 */
export function createHemisphereLightLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    intensity: 1.15,
    skyColor: '#8ec8ff',
    groundColor: '#c28a4e',
    showHelper: true
  };

  const ground = createGround();
  const litObject = createLitObject('#f2f4f7');
  const hemisphere = new THREE.HemisphereLight(state.skyColor, state.groundColor, state.intensity);
  const helper = new THREE.HemisphereLightHelper(hemisphere, 1.25);

  // HemisphereLight 的 position 表示“天空方向”，这里固定为从上往下的环境色差。
  hemisphere.position.set(0, 1, 0);
  litObject.position.set(0, 0.05, 0);
  scene.add(ground, litObject, hemisphere, helper);

  function updateLight() {
    hemisphere.intensity = state.intensity;
    hemisphere.color.set(state.skyColor);
    hemisphere.groundColor.set(state.groundColor);
    helper.visible = state.showHelper;
    helper.update();

    writeText('sky-state', `color ${state.skyColor}; intensity ${formatNumber(hemisphere.intensity)}`);
    writeText('ground-state', `groundColor ${state.groundColor}`);
    writeText('helper-state', `HemisphereLightHelper ${helper.visible ? '显示' : '隐藏'}`);
  }

  bindRange('hemisphere-intensity', 'hemisphere-intensity-value', formatNumber, (value) => {
    state.intensity = value;
    updateLight();
  });
  bindColor('sky-color', (value) => {
    state.skyColor = value;
    updateLight();
  });
  bindColor('ground-color', (value) => {
    state.groundColor = value;
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
