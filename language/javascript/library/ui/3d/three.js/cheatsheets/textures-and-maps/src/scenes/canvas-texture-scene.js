import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindCheckbox, bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 CanvasTexture：canvas 像素变了以后，必须用 texture.needsUpdate 上传到 GPU。
 * 阅读主线：先看 drawPattern() 改 canvas，再看 updateCanvasTexture() 何时设置 needsUpdate。
 * 控件对应：图案序号 -> canvas 内容；checkbox -> 是否自动设置 needsUpdate；按钮 -> 手动上传一次。
 */
export function createCanvasTextureLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    pattern: 0,
    autoUpload: true
  };
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = 256;
  sourceCanvas.height = 256;
  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.58,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);
  plane.rotation.x = -0.35;
  scene.add(plane);

  function drawPattern() {
    const context = sourceCanvas.getContext('2d');
    const hue = (state.pattern * 52) % 360;
    context.fillStyle = `hsl(${hue}, 68%, 48%)`;
    context.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    context.fillStyle = '#f8fafc';
    context.font = 'bold 72px sans-serif';
    context.fillText(`C${state.pattern}`, 42, 145);
    context.strokeStyle = 'rgba(17, 24, 39, 0.55)';
    context.lineWidth = 12;
    context.strokeRect(6, 6, sourceCanvas.width - 12, sourceCanvas.height - 12);
  }

  function updateCanvasTexture(forceUpload = false) {
    drawPattern();

    if (state.autoUpload || forceUpload) {
      texture.needsUpdate = true;
    }

    writeText('canvas-state', `pattern ${state.pattern}; 256 x 256 canvas`);
    writeText('needs-update-state', `${state.autoUpload || forceUpload ? '已请求上传' : '只改 canvas，GPU 暂不更新'}`);
    writeText('version-state', `texture.version ${texture.version}`);
  }

  bindRange('pattern', 'pattern-value', formatNumber, (value) => {
    state.pattern = value;
    updateCanvasTexture();
  });
  bindCheckbox('auto-upload', (checked) => {
    state.autoUpload = checked;
    updateCanvasTexture();
  });
  bindButton('upload-once', () => {
    updateCanvasTexture(true);
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    plane.rotation.z = Math.sin(time * 0.5) * 0.08;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
