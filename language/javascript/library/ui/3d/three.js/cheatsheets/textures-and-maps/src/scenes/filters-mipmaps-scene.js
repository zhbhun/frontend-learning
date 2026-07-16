import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createCheckerCanvas,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';

const MAG_FILTER = {
  linear: THREE.LinearFilter,
  nearest: THREE.NearestFilter
};

const MIN_FILTER = {
  'linear-mipmap': THREE.LinearMipmapLinearFilter,
  linear: THREE.LinearFilter,
  nearest: THREE.NearestFilter
};

/*
 * 示例介绍：
 * 这个文件只演示采样质量：magFilter、minFilter、mipmap 和 anisotropy。
 * 阅读主线：先看低分辨率 checker 纹理，再看 updateSampling() 哪些参数需要重新上传。
 * 控件对应：filter 选择器 -> texture.magFilter/minFilter；mipmap checkbox -> generateMipmaps；anisotropy -> 斜视角清晰度。
 */
export function createFiltersMipmapsLesson(canvas) {
  const renderer = createRenderer(canvas);
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    magFilter: 'linear',
    minFilter: 'linear-mipmap',
    generateMipmaps: true,
    anisotropy: 1
  };
  const texture = new THREE.CanvasTexture(createCheckerCanvas({ size: 128, cells: 16, label: 'PX' }));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), material);
  plane.rotation.x = -1.12;
  plane.position.z = -0.55;
  scene.add(plane);

  function updateSampling() {
    texture.magFilter = MAG_FILTER[state.magFilter];
    texture.minFilter = MIN_FILTER[state.minFilter];
    texture.generateMipmaps = state.generateMipmaps;
    texture.anisotropy = Math.min(state.anisotropy, maxAnisotropy);
    texture.needsUpdate = true;

    writeText('filter-state', `mag ${state.magFilter}; min ${state.minFilter}`);
    writeText('mipmap-state', `generateMipmaps ${texture.generateMipmaps}; version ${texture.version}`);
    writeText('anisotropy-state', `${texture.anisotropy} / ${maxAnisotropy}`);
  }

  bindSelect('mag-filter', (value) => {
    state.magFilter = value;
    updateSampling();
  });
  bindSelect('min-filter', (value) => {
    state.minFilter = value;
    updateSampling();
  });
  bindCheckbox('generate-mipmaps', (checked) => {
    state.generateMipmaps = checked;
    updateSampling();
  });
  bindRange('anisotropy', 'anisotropy-value', formatNumber, (value) => {
    state.anisotropy = value;
    updateSampling();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, () => {});

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
