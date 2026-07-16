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
 * 这个文件只演示 AmbientLight：它给全场受光材质提供均匀补光。
 * 阅读主线：先看 state，再看 ambient 的构造和 updateLight() 如何映射页面控件。
 * 控件对应：强度 -> ambient.intensity，颜色 -> ambient.color，MeshBasic 对照用于观察不受光材质。
 */
export function createAmbientLightLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    intensity: 0.85,
    color: '#ffffff',
    showBasic: true
  };

  const ground = createGround();
  const litObject = createLitObject('#2f83d8');
  const basicObject = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 16),
    new THREE.MeshBasicMaterial({ color: '#d6832b' })
  );

  // AmbientLight 没有方向和位置；本示例不加入其他 Light，避免明暗来源混在一起。
  const ambient = new THREE.AmbientLight(state.color, state.intensity);

  litObject.position.set(-0.55, 0.05, 0);
  basicObject.position.set(1.45, -0.16, 0.35);
  scene.add(ground, litObject, basicObject, ambient);

  function updateLight() {
    ambient.intensity = state.intensity;
    ambient.color.set(state.color);
    basicObject.visible = state.showBasic;

    writeText('ambient-state', `intensity ${formatNumber(ambient.intensity)}; color ${state.color}`);
    writeText('material-state', `受光 ${litObject.material.type}; 对照 ${basicObject.material.type}`);
  }

  bindRange('ambient-intensity', 'ambient-intensity-value', formatNumber, (value) => {
    state.intensity = value;
    updateLight();
  });
  bindColor('ambient-color', (value) => {
    state.color = value;
    updateLight();
  });
  bindCheckbox('show-basic', (checked) => {
    state.showBasic = checked;
    updateLight();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    litObject.rotation.set(0.32, time * 0.42, 0.08);
    basicObject.rotation.y = -time * 0.35;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
