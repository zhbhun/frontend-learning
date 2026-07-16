/*
 * 本示例演示什么：
 * 用 MeshPhysicalMaterial 最小观察 clearcoat 和 transmission 两类进阶 PBR 表层。
 * 读代码先看哪里：
 * 先看 clearcoatMaterial 与 glassMaterial 的参数，再看 updatePhysicalMaterials() 如何写回控件值。
 * 控件对应哪些 API：
 * clearcoat -> clearcoatMaterial.clearcoat；clearcoatRoughness -> clearcoatMaterial.clearcoatRoughness；
 * transmission -> glassMaterial.transmission；thickness -> glassMaterial.thickness。
 * 预期观察什么：
 * clearcoat 像额外亮漆层，transmission 让右侧球体透出背后的色带，但仍保留 PBR 反射。
 */

import * as THREE from 'three';
import {
  createCamera,
  createControls,
  createRenderer,
  createStripeTexture,
  createStudioScene,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, writeText } from '../shared-ui.js';

export function createPhysicalMaterialLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, dispose: disposeSceneSupport } = createStudioScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const stripeTexture = createStripeTexture();
  const state = {
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    transmission: 0.72,
    thickness: 0.55
  };

  const clearcoatMaterial = new THREE.MeshPhysicalMaterial({
    color: '#d95832',
    metalness: 0.05,
    roughness: 0.36,
    clearcoat: state.clearcoat,
    clearcoatRoughness: state.clearcoatRoughness
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#c7ecff',
    metalness: 0,
    roughness: 0.04,
    transmission: state.transmission,
    thickness: state.thickness,
    ior: 1.45,
    attenuationColor: '#ffffff',
    attenuationDistance: 1.6
  });
  const paint = new THREE.Mesh(new THREE.SphereGeometry(0.78, 64, 32), clearcoatMaterial);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.78, 64, 32), glassMaterial);
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.3),
    new THREE.MeshBasicMaterial({ map: stripeTexture, side: THREE.DoubleSide })
  );

  paint.position.set(-1.05, 0.05, 0);
  glass.position.set(1.05, 0.05, 0.05);
  backdrop.position.set(0.25, 0.12, -1.15);
  scene.add(backdrop, paint, glass);

  function updatePhysicalMaterials() {
    clearcoatMaterial.clearcoat = state.clearcoat;
    clearcoatMaterial.clearcoatRoughness = state.clearcoatRoughness;
    glassMaterial.transmission = state.transmission;
    glassMaterial.thickness = state.thickness;

    writeText(
      'clearcoat-state',
      `clearcoat=${formatNumber(clearcoatMaterial.clearcoat)}; clearcoatRoughness=${formatNumber(clearcoatMaterial.clearcoatRoughness)}`
    );
    writeText(
      'transmission-state',
      `transmission=${formatNumber(glassMaterial.transmission)}; thickness=${formatNumber(glassMaterial.thickness)}; ior=${formatNumber(glassMaterial.ior)}`
    );
    writeText('material-state', `${clearcoatMaterial.type}; 继承 MeshStandardMaterial`);
    writeText('compare-state', '左侧观察清漆高光，右侧观察透光球体背后的色带');
  }

  bindRange('clearcoat', (value) => {
    state.clearcoat = value;
    updatePhysicalMaterials();
  });
  bindRange('clearcoat-roughness', (value) => {
    state.clearcoatRoughness = value;
    updatePhysicalMaterials();
  });
  bindRange('transmission', (value) => {
    state.transmission = value;
    updatePhysicalMaterials();
  });
  bindRange('thickness', (value) => {
    state.thickness = value;
    updatePhysicalMaterials();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    paint.rotation.y = time * 0.24;
    glass.rotation.y = -time * 0.24;
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
