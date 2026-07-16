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
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

const WRAP = {
  clamp: THREE.ClampToEdgeWrapping,
  repeat: THREE.RepeatWrapping,
  mirror: THREE.MirroredRepeatWrapping
};

const WRAP_LABEL = {
  clamp: 'ClampToEdgeWrapping',
  repeat: 'RepeatWrapping',
  mirror: 'MirroredRepeatWrapping'
};

/*
 * 示例介绍：
 * 这个文件只演示 wrapS/wrapT：UV 超出 0-1 后纹理如何处理边界。
 * 阅读主线：先看 repeat 大于 1 制造超出范围，再看 updateWrapping() 切换三种 wrapping。
 * 控件对应：wrap mode -> texture.wrapS/wrapT；repeat -> 让差异更明显。
 */
export function createWrappingModesLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    wrap: 'repeat',
    repeat: 2.5
  };
  const texture = new THREE.CanvasTexture(createCheckerCanvas({ label: 'WRAP' }));
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.62,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.8), material);
  plane.rotation.x = -0.65;
  scene.add(plane);

  function updateWrapping(reupload = false) {
    texture.wrapS = WRAP[state.wrap];
    texture.wrapT = WRAP[state.wrap];
    texture.repeat.set(state.repeat, state.repeat);

    if (reupload) {
      texture.needsUpdate = true;
    }

    writeText('wrap-state', WRAP_LABEL[state.wrap]);
    writeText('repeat-state', `${formatNumber(texture.repeat.x)}, ${formatNumber(texture.repeat.y)}`);
    writeText('upload-state', `wrap 改变时 needsUpdate; version ${texture.version}`);
  }

  bindSelect('wrap-mode', (value) => {
    state.wrap = value;
    updateWrapping(true);
  });
  bindRange('repeat', 'repeat-value', formatNumber, (value) => {
    state.repeat = value;
    updateWrapping();
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
