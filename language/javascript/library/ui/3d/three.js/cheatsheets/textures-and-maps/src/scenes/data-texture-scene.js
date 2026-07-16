import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 DataTexture：TypedArray 中的 RGBA 数字就是纹理像素。
 * 阅读主线：先看 fillData() 如何写 buffer，再看 texture.needsUpdate 如何上传新数据。
 * 控件对应：数据模式 -> buffer 生成公式；对比度 -> 写入像素值的强弱。
 */
export function createDataTextureLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const size = 96;
  const state = {
    mode: 'checker',
    contrast: 1
  };
  const data = new Uint8Array(size * size * 4);
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);
  plane.rotation.x = -0.35;
  scene.add(plane);

  function fillData() {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        const checker = (Math.floor(x / 12) + Math.floor(y / 12)) % 2;
        const ramp = x / (size - 1);
        const mask = Math.max(0, 1 - Math.hypot(x - size / 2, y - size / 2) / (size / 2));
        const base = state.mode === 'checker' ? checker : state.mode === 'ramp' ? ramp : mask;
        const value = Math.max(0, Math.min(255, base * 255 * state.contrast));
        data[index] = value;
        data[index + 1] = state.mode === 'mask' ? 130 : 210 - value * 0.35;
        data[index + 2] = 255 - value * 0.25;
        data[index + 3] = 255;
      }
    }
  }

  function updateTexture() {
    fillData();
    texture.needsUpdate = true;

    writeText('buffer-state', `${size} x ${size}; Uint8Array ${data.length} bytes`);
    writeText('format-state', `RGBAFormat; ${texture.colorSpace}; ${texture.magFilter === THREE.NearestFilter ? 'NearestFilter' : 'LinearFilter'}`);
    writeText('upload-state', `mode ${state.mode}; contrast ${formatNumber(state.contrast)}; version ${texture.version}`);
  }

  bindSelect('data-mode', (value) => {
    state.mode = value;
    updateTexture();
  });
  bindRange('contrast', 'contrast-value', formatNumber, (value) => {
    state.contrast = value;
    updateTexture();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    plane.rotation.z = Math.sin(time * 0.45) * 0.08;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
