import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createOrientationCanvas,
  createRenderer,
  disposeObjectTree,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 texture.flipY：图片上传到 GPU 时是否上下翻转。
 * 阅读主线：先看带 TOP/BOTTOM 的源 canvas，再看 updateFlipY() 改 flipY 后为什么需要 needsUpdate。
 * 控件对应：checkbox -> texture.flipY；状态读数显示重新上传后的 version。
 */
export function createFlipYLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const texture = new THREE.CanvasTexture(createOrientationCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.58,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), material);
  plane.rotation.x = -0.35;
  scene.add(plane);

  function updateFlipY(checked) {
    texture.flipY = checked;
    // flipY 是上传参数，改完要重新上传纹理像素。
    texture.needsUpdate = true;

    writeText('flip-state', `texture.flipY ${texture.flipY}`);
    writeText('upload-state', `needsUpdate true; version ${texture.version}`);
  }

  bindCheckbox('flip-y', updateFlipY);

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
