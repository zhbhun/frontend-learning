import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createGradientCanvas,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示材质贴图槽，但一次只激活一个主观察项：map、normalMap、roughnessMap 或 alphaMap。
 * 阅读主线：先看 createMaterialTextures() 生成颜色/数据贴图，再看 applySlot() 如何切换材质槽位。
 * 控件对应：slot -> material 的贴图属性；强度 -> 当前槽位对应的 normalScale、roughness 或 opacity。
 */
export function createMaterialMapSlotsLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    slot: 'map',
    strength: 1
  };
  const textures = createMaterialTextures();
  const material = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.55,
    metalness: 0.04,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.86, 0.22, 128, 18), material);
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 3.2),
    new THREE.MeshBasicMaterial({ color: '#dbeafe', side: THREE.DoubleSide })
  );

  mesh.position.set(-0.2, 0.05, 0);
  backdrop.position.set(0, 0.35, -1.5);
  scene.add(backdrop, mesh);

  function applySlot() {
    material.map = null;
    material.normalMap = null;
    material.roughnessMap = null;
    material.alphaMap = null;
    material.transparent = false;
    material.opacity = 1;
    material.color.set('#f8fafc');
    material.roughness = 0.55;
    material.normalScale.set(1, 1);

    if (state.slot === 'map') {
      material.map = textures.colorMap;
      material.color.set('#ffffff');
    }

    if (state.slot === 'normal') {
      material.normalMap = textures.normalMap;
      material.normalScale.set(state.strength, state.strength);
    }

    if (state.slot === 'roughness') {
      material.roughnessMap = textures.roughnessMap;
      material.roughness = Math.max(0.05, Math.min(1, state.strength / 2));
    }

    if (state.slot === 'alpha') {
      material.alphaMap = textures.alphaMap;
      material.transparent = true;
      material.opacity = Math.max(0.15, Math.min(1, state.strength / 2));
    }

    // 贴图槽位开关会改变 shader 分支，切换时需要 material.needsUpdate。
    material.needsUpdate = true;

    const activeTexture = getActiveTexture();
    writeText('slot-state', `${state.slot}; strength ${formatNumber(state.strength)}`);
    writeText('color-space-state', activeTexture ? activeTexture.colorSpace : '无贴图');
    writeText('material-state', `map ${Boolean(material.map)}; normal ${Boolean(material.normalMap)}; roughness ${Boolean(material.roughnessMap)}; alpha ${Boolean(material.alphaMap)}`);
  }

  function getActiveTexture() {
    if (state.slot === 'map') return textures.colorMap;
    if (state.slot === 'normal') return textures.normalMap;
    if (state.slot === 'roughness') return textures.roughnessMap;
    if (state.slot === 'alpha') return textures.alphaMap;
    return null;
  }

  bindSelect('slot', (value) => {
    state.slot = value;
    applySlot();
  });
  bindRange('strength', 'strength-value', formatNumber, (value) => {
    state.strength = value;
    applySlot();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    mesh.rotation.set(0.36, time * 0.38, 0.08);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createMaterialTextures() {
  const colorMap = new THREE.CanvasTexture(createGradientCanvas());
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const normalMap = createNormalMap();
  const roughnessMap = createRoughnessMap();
  const alphaMap = createAlphaMap();

  [colorMap, normalMap, roughnessMap, alphaMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.needsUpdate = true;
  });

  return { colorMap, normalMap, roughnessMap, alphaMap };
}

function createNormalMap(size = 128) {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const waveX = Math.sin((x / size) * Math.PI * 8) * 38;
      const waveY = Math.cos((y / size) * Math.PI * 8) * 38;
      data[index] = 128 + waveX;
      data[index + 1] = 128 + waveY;
      data[index + 2] = 255;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createRoughnessMap(size = 128) {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const value = x < size / 2 ? 70 : 230;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createAlphaMap(size = 128) {
  const data = new Uint8Array(size * size * 4);
  const center = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const distance = Math.hypot(x - center, y - center) / center;
      const value = Math.max(0, Math.min(255, (1 - distance) * 255));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
