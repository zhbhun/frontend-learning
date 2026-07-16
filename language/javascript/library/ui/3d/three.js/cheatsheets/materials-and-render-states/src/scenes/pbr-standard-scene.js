/*
 * 示例介绍：
 * 这个文件演示 MeshStandardMaterial 的基础 PBR 调参。
 * 左侧主物体响应 color、metalness、roughness 和 flatShading 控件；
 * 右侧小球固定为“高金属度、低粗糙度”，用于对比高光和反射感。
 * 阅读重点：数值型 PBR 参数可直接运行时更新，flatShading 这类 shader 分支变化需要 material.needsUpdate。
 */

import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createStudioGeometry,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindColor, bindRange, writeText } from '../shared-ui.js';

export function createPbrStandardLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, key } = createBaseScene();
  const camera = createCamera();
  const state = {
    metalness: 0.18,
    roughness: 0.42,
    color: '#2f83d8',
    flatShading: false,
    updates: 0
  };
  const geometry = createStudioGeometry();
  // 本示例只聚焦 MeshStandardMaterial 的 PBR 主参数：
  // color 是基础颜色，metalness 决定金属响应，roughness 决定高光发散程度。
  const material = new THREE.MeshStandardMaterial({
    color: state.color,
    metalness: state.metalness,
    roughness: state.roughness
  });
  const mesh = new THREE.Mesh(geometry, material);
  // 右侧小球使用固定的高金属度和低粗糙度，作为观察高光形态的对照物。
  const mirror = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#d6832b', metalness: 0.75, roughness: 0.18 })
  );

  mesh.position.x = -0.85;
  mirror.position.x = 1.15;
  key.position.set(-2.8, 4.4, 3.6);
  scene.add(mesh, mirror);

  function updateMaterial(requireRecompile = false) {
    // 这些数值会作为 uniform 传给 shader，运行时直接改就能看到效果。
    material.color.set(state.color);
    material.metalness = state.metalness;
    material.roughness = state.roughness;

    // flatShading 会改变法线插值和 shader 分支，切换后需要重新编译材质。
    if (material.flatShading !== state.flatShading) {
      material.flatShading = state.flatShading;
      requireRecompile = true;
    }

    // needsUpdate 不是给所有属性都用；只在会改变渲染程序/分支的状态变化时标记。
    if (requireRecompile) {
      material.needsUpdate = true;
      state.updates += 1;
    }

    writeText('material-type', material.type);
    writeText('metalness-state', formatNumber(material.metalness));
    writeText('roughness-state', formatNumber(material.roughness));
    writeText('update-state', `version ${material.version}; 标记 ${state.updates} 次`);
  }

  bindRange('metalness', 'metalness-value', formatNumber, (value) => {
    state.metalness = value;
    updateMaterial();
  });
  bindRange('roughness', 'roughness-value', formatNumber, (value) => {
    state.roughness = value;
    updateMaterial();
  });
  bindColor('color', (value) => {
    state.color = value;
    updateMaterial();
  });
  bindCheckbox('flat-shading', (checked) => {
    state.flatShading = checked;
    updateMaterial(true);
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    mesh.rotation.set(0.35, time * 0.46, 0.08);
    mirror.rotation.set(-0.2, -time * 0.35, 0);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
