import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createRenderer,
  createViewerScene,
  disposeObjectTree,
  formatVector,
  frameObject,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindRange, bindSelect, readElement, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示模型查看器的自动取景。
 * 阅读主线：先看 loadModel() 加载模型，再看 applyFrameCase() 改模型世界变换，最后看 frameCurrentModel() 如何用 Box3 更新 camera.position 和 controls.target。
 * 控件对应：模型姿态 -> root position/scale/rotation；留白 -> frameObject() 的 fitRatio；重新取景 -> 重新计算 Box3。
 * 预期观察：无论模型偏移、放大或变宽，取景后相机目标都会回到包围盒中心，拖拽围绕正确位置旋转。
 */
export async function createAutoFrameLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, dispose: disposeSceneSupport } = createViewerScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const loader = new GLTFLoader();
  const bounds = new THREE.Box3();
  const boundsHelper = new THREE.Box3Helper(bounds, '#d95832');
  let modelRoot = null;
  let fitRatio = Number(readElement('fit-ratio').value);

  scene.add(boundsHelper);

  bindSelect('frame-case', () => {
    applyFrameCase();
  }, { immediate: false });
  bindRange('fit-ratio', (value) => {
    fitRatio = value;
    frameCurrentModel();
  });
  bindButton('frame-model', () => {
    frameCurrentModel();
  });

  await loadModel();

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls);

  async function loadModel() {
    const gltf = await loader.loadAsync(MODEL_ASSETS.multiNode.url);
    modelRoot = gltf.scene;
    modelRoot.name = 'auto-frame-target';
    scene.add(modelRoot);
    applyFrameCase();
  }

  function applyFrameCase() {
    if (!modelRoot) {
      return;
    }

    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.set(0, 0, 0);
    modelRoot.scale.set(1, 1, 1);

    const frameCase = readElement('frame-case').value;

    if (frameCase === 'offset') {
      modelRoot.position.set(1.8, 0.55, -0.7);
    } else if (frameCase === 'large') {
      modelRoot.scale.setScalar(2.4);
    } else if (frameCase === 'flat') {
      modelRoot.scale.set(2.6, 0.55, 1.05);
      modelRoot.rotation.y = THREE.MathUtils.degToRad(-24);
    }

    frameCurrentModel();
  }

  function frameCurrentModel() {
    if (!modelRoot) {
      return;
    }

    const framing = frameObject(camera, controls, modelRoot, { fitRatio });
    if (!framing) {
      return;
    }

    bounds.copy(framing.box);
    boundsHelper.updateMatrixWorld(true);

    writeText('bounds-state', `size=${formatVector(framing.size)}`);
    writeText('center-state', `center=${formatVector(framing.center)}`);
    writeText('camera-state', `position=${formatVector(camera.position)}; distance=${framing.distance.toFixed(2)}`);
    writeText('target-state', `controls.target=${formatVector(controls.target)}`);
  }

  return {
    dispose() {
      stop();
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeObjectTree(modelRoot);
      }
      scene.remove(boundsHelper);
      disposeObjectTree(boundsHelper);
      controls.dispose();
      disposeSceneSupport();
      renderer.dispose();
    }
  };
}
