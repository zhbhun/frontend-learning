/*
 * 本示例演示什么：
 * 区分 scene.environment 和 scene.background：前者影响 PBR 反射，后者只影响画布背后显示。
 * 读代码先看哪里：
 * 先看 roomEnvironment 和 backgroundTexture 的来源，再看 applyEnvironmentMode() 与 applyBackgroundMode()。
 * 控件对应哪些 API：
 * 环境贴图 -> scene.environment；背景 -> scene.background；环境强度 -> material.envMapIntensity。
 * 预期观察什么：
 * 关闭 environment 时金属球明显变暗；只切换 background 时背景会变，但金属反射不跟着变。
 */

import * as THREE from 'three';
import {
  createBackgroundTexture,
  createCamera,
  createControls,
  createRenderer,
  createStudioScene,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

export function createEnvironmentMapLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, environmentTexture, dispose: disposeSceneSupport } = createStudioScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const backgroundTexture = createBackgroundTexture();
  const material = new THREE.MeshStandardMaterial({
    color: '#d7dde2',
    metalness: 0.9,
    roughness: 0.18,
    envMapIntensity: 1
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.92, 64, 32), material);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.04, 1.04, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: '#4f626d', metalness: 0.18, roughness: 0.68 })
  );

  sphere.position.y = 0.15;
  base.position.y = -0.83;
  scene.add(sphere, base);

  function applyEnvironmentMode(value) {
    scene.environment = value === 'room' ? environmentTexture : null;
    writeState();
  }

  function applyBackgroundMode(value) {
    scene.background = value === 'texture' ? backgroundTexture : new THREE.Color('#edf2f1');
    writeState();
  }

  function writeState() {
    writeText(
      'environment-state',
      scene.environment ? 'scene.environment = RoomEnvironment PMREM' : 'scene.environment = null'
    );
    writeText(
      'background-state',
      scene.background && scene.background.isTexture ? 'scene.background = CanvasTexture' : 'scene.background = Color'
    );
    writeText('material-state', `envMapIntensity=${formatNumber(material.envMapIntensity)}; metalness=0.90; roughness=0.18`);
    writeText('compare-state', '先固定背景开关 environment，再固定 environment 切换背景');
  }

  bindSelect('environment-mode', applyEnvironmentMode);
  bindSelect('background-mode', applyBackgroundMode);
  bindRange('env-intensity', (value) => {
    material.envMapIntensity = value;
    writeState();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    sphere.rotation.y = time * 0.28;
    base.rotation.y = -time * 0.12;
  });

  return {
    dispose() {
      stop();
      backgroundTexture.dispose();
      disposeObjectTree(scene);
      controls.dispose();
      disposeSceneSupport();
      renderer.dispose();
    }
  };
}
