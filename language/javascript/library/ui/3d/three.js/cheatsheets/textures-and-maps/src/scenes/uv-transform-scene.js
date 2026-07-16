import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createCheckerCanvas,
  createRenderer,
  degreesToRadians,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 Texture 的 UV 变换矩阵：repeat、offset、rotation 和 center。
 * 阅读主线：先看 texture.center 固定到 0.5，再看 updateTransform() 如何只改 UV 变换参数。
 * 控件对应：repeat/offset/rotation -> texture.repeat、texture.offset、texture.rotation。
 */
export function createUvTransformLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    repeatU: 3,
    repeatV: 2,
    offsetU: 0,
    rotation: 0
  };
  const texture = new THREE.CanvasTexture(createCheckerCanvas({ label: 'UV' }));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.center.set(0.5, 0.5);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.62,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.8), material);
  plane.rotation.x = -0.65;
  scene.add(plane);

  function updateTransform() {
    texture.repeat.set(state.repeatU, state.repeatV);
    texture.offset.x = state.offsetU;
    texture.rotation = degreesToRadians(state.rotation);

    writeText('repeat-state', `${formatNumber(texture.repeat.x)}, ${formatNumber(texture.repeat.y)}`);
    writeText('offset-state', `offset.x ${formatNumber(texture.offset.x)}; offset.y ${formatNumber(texture.offset.y)}`);
    writeText('rotation-state', `${state.rotation}deg around center 0.5, 0.5`);
  }

  bindRange('repeat-u', 'repeat-u-value', formatNumber, (value) => {
    state.repeatU = value;
    updateTransform();
  });
  bindRange('repeat-v', 'repeat-v-value', formatNumber, (value) => {
    state.repeatV = value;
    updateTransform();
  });
  bindRange('offset-u', 'offset-u-value', formatNumber, (value) => {
    state.offsetU = value;
    updateTransform();
  });
  bindRange('rotation', 'rotation-value', (value) => `${value}deg`, (value) => {
    state.rotation = value;
    updateTransform();
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
