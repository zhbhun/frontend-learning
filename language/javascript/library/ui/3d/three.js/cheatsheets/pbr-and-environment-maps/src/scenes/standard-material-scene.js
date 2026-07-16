/*
 * 本示例演示什么：
 * 使用 MeshStandardMaterial 观察 color、metalness、roughness 三个 PBR 基础参数。
 * 读代码先看哪里：
 * 先看 state 和 material 的创建，再看 updateMaterial() 如何把控件值写回 material。
 * 控件对应哪些 API：
 * 基础颜色 -> material.color；金属度 -> material.metalness；粗糙度 -> material.roughness。
 * 预期观察什么：
 * metalness 越高越依赖环境反射，roughness 越高高光越散；color 在非金属上更像物体本色，在高金属上更像反射色调。
 */

import * as THREE from 'three';
import {
  createCamera,
  createControls,
  createRenderer,
  createStudioGeometry,
  createStudioScene,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindColor, bindRange, writeText } from '../shared-ui.js';

export function createStandardMaterialLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, dispose: disposeSceneSupport } = createStudioScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const state = {
    color: '#2f83d8',
    metalness: 0.18,
    roughness: 0.42
  };

  const material = new THREE.MeshStandardMaterial({
    color: state.color,
    metalness: state.metalness,
    roughness: state.roughness
  });
  const main = new THREE.Mesh(createStudioGeometry(), material);
  main.position.y = 0.25;

  // 两个固定对照物只改变一个 PBR 倾向，帮助判断主物体变化来自哪个参数。
  const matteReference = createReferenceSphere({
    color: state.color,
    metalness: 0,
    roughness: 0.88,
    x: -1.65
  });
  const metalReference = createReferenceSphere({
    color: state.color,
    metalness: 0.95,
    roughness: 0.18,
    x: 1.65
  });

  scene.add(main, matteReference, metalReference);

  function updateMaterial() {
    material.color.set(state.color);
    material.metalness = state.metalness;
    material.roughness = state.roughness;

    matteReference.material.color.set(state.color);
    metalReference.material.color.set(state.color);

    writeText('material-state', material.type);
    writeText('color-state', state.color);
    writeText('metalness-state', formatNumber(material.metalness));
    writeText('roughness-state', formatNumber(material.roughness));
    writeText('compare-state', '中间为可调主物体；左侧固定哑光非金属，右侧固定亮面金属');
  }

  bindColor('base-color', (value) => {
    state.color = value;
    updateMaterial();
  });
  bindRange('metalness', (value) => {
    state.metalness = value;
    updateMaterial();
  });
  bindRange('roughness', (value) => {
    state.roughness = value;
    updateMaterial();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    main.rotation.set(0.35, time * 0.46, 0.05);
    matteReference.rotation.y = time * 0.28;
    metalReference.rotation.y = -time * 0.28;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      controls.dispose();
      disposeSceneSupport();
      renderer.dispose();
    }
  };
}

function createReferenceSphere({ color, metalness, roughness, x }) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 48, 24),
    new THREE.MeshStandardMaterial({ color, metalness, roughness })
  );

  mesh.position.set(x, -0.54, 0.15);
  return mesh;
}
