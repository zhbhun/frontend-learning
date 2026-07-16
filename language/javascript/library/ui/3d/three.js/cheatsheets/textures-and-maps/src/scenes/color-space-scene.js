import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createGradientCanvas,
  createRenderer,
  disposeObjectTree,
  startRenderLoop
} from '../shared-stage.js';
import { bindSelect, writeText } from '../shared-ui.js';

const COLOR_SPACE = {
  srgb: THREE.SRGBColorSpace,
  linear: THREE.LinearSRGBColorSpace,
  none: THREE.NoColorSpace
};

/*
 * 示例介绍：
 * 这个文件只演示颜色贴图的 colorSpace：同一张颜色图，按颜色读和按数据读会得到不同亮度。
 * 阅读主线：先看 createTexture() 克隆同源 canvas，再看右侧控件如何改变 rightTexture.colorSpace。
 * 控件对应：右侧 colorSpace -> rightTexture.colorSpace；左侧固定为 SRGBColorSpace 对照。
 */
export function createColorSpaceLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const source = createGradientCanvas();
  const leftTexture = createTexture(source, THREE.SRGBColorSpace);
  const rightTexture = createTexture(source, THREE.NoColorSpace);
  const left = createSwatch(leftTexture);
  const right = createSwatch(rightTexture);

  left.position.x = -1.25;
  right.position.x = 1.25;
  scene.add(left, right);

  function updateColorSpace(value) {
    rightTexture.colorSpace = COLOR_SPACE[value];
    rightTexture.needsUpdate = true;

    writeText('left-state', `SRGBColorSpace; 用作颜色贴图`);
    writeText('right-state', `${rightTexture.colorSpace}; 可切换`);
    writeText('compare-state', '看同一张彩色图在两侧的亮度和饱和差异');
  }

  bindSelect('right-color-space', updateColorSpace);

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    left.rotation.y = Math.sin(time * 0.45) * 0.18;
    right.rotation.y = Math.sin(time * 0.45) * 0.18;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createTexture(source, colorSpace) {
  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = colorSpace;
  return texture;
}

function createSwatch(texture) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.55, 1.55),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.52,
      metalness: 0.02
    })
  );
}
