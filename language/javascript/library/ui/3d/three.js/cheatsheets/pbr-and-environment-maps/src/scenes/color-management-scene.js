/*
 * 本示例演示什么：
 * 观察 PBR 中颜色贴图、数据贴图和 renderer 输出 colorSpace / toneMapping 的分工。
 * 读代码先看哪里：
 * 先看 colorTexture 与 roughnessTexture 的创建，再看 applyColorMapSpace()、applyOutputColorSpace() 和 applyToneMapping()。
 * 控件对应哪些 API：
 * 颜色贴图 colorSpace -> material.map.colorSpace；输出 colorSpace -> renderer.outputColorSpace；
 * toneMapping -> renderer.toneMapping；曝光 -> renderer.toneMappingExposure。
 * 预期观察什么：
 * 颜色贴图不按 SRGBColorSpace 解释时亮度会偏；roughnessMap 固定 NoColorSpace，因为它是参数数据不是颜色。
 */

import * as THREE from 'three';
import {
  createCamera,
  createColorMapTexture,
  createControls,
  createRenderer,
  createRoughnessDataTexture,
  createStudioScene,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

const COLOR_SPACES = {
  srgb: THREE.SRGBColorSpace,
  linear: THREE.LinearSRGBColorSpace,
  none: THREE.NoColorSpace
};

const OUTPUT_COLOR_SPACES = {
  srgb: THREE.SRGBColorSpace,
  linear: THREE.LinearSRGBColorSpace
};

const TONE_MAPPINGS = {
  aces: THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  none: THREE.NoToneMapping
};

const TONE_MAPPING_NAMES = {
  [THREE.ACESFilmicToneMapping]: 'ACESFilmicToneMapping',
  [THREE.ReinhardToneMapping]: 'ReinhardToneMapping',
  [THREE.NoToneMapping]: 'NoToneMapping'
};

export function createColorManagementLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, dispose: disposeSceneSupport } = createStudioScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const colorTexture = createColorMapTexture();
  const roughnessTexture = createRoughnessDataTexture();

  const colorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 1.28, 1.28),
    new THREE.MeshStandardMaterial({
      map: colorTexture,
      metalness: 0.05,
      roughness: 0.44
    })
  );
  const dataMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 64, 32),
    new THREE.MeshStandardMaterial({
      color: '#d7dde2',
      roughness: 0.95,
      roughnessMap: roughnessTexture,
      metalness: 0.28
    })
  );

  colorMesh.position.set(-1.05, 0.1, 0);
  dataMesh.position.set(1.08, 0.06, 0);
  scene.add(colorMesh, dataMesh);

  function applyColorMapSpace(value) {
    colorTexture.colorSpace = COLOR_SPACES[value];
    // 纹理采样解释变了，需要重新上传纹理状态才能稳定观察差异。
    colorTexture.needsUpdate = true;
    writeState();
  }

  function applyOutputColorSpace(value) {
    renderer.outputColorSpace = OUTPUT_COLOR_SPACES[value];
    writeState();
  }

  function applyToneMapping(value) {
    renderer.toneMapping = TONE_MAPPINGS[value];
    writeState();
  }

  function writeState() {
    writeText('color-map-state', `map.colorSpace=${colorTexture.colorSpace}; version=${colorTexture.version}`);
    writeText('data-map-state', `roughnessMap.colorSpace=${roughnessTexture.colorSpace}; 用作参数数据`);
    writeText(
      'renderer-state',
      `outputColorSpace=${renderer.outputColorSpace}; toneMapping=${TONE_MAPPING_NAMES[renderer.toneMapping]}; exposure=${formatNumber(renderer.toneMappingExposure)}`
    );
    writeText('compare-state', '左侧是颜色贴图；右侧是 DataTexture 粗糙度贴图，保持 NoColorSpace');
  }

  bindSelect('color-map-space', applyColorMapSpace);
  bindSelect('output-color-space', applyOutputColorSpace);
  bindSelect('tone-mapping', applyToneMapping);
  bindRange('exposure', (value) => {
    renderer.toneMappingExposure = value;
    writeState();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    colorMesh.rotation.set(0.2, time * 0.34, 0.08);
    dataMesh.rotation.y = -time * 0.3;
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
