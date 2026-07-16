import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createRenderer,
  createViewerScene,
  disposeObjectTree,
  frameObject,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, bindSelect, readElement, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示模型查看器中的直接光、环境贴图和曝光。
 * 阅读主线：先看 createViewerScene() 创建 lights + scene.environment，再看 applyLightingMode() 如何只切换这些 viewer 状态。
 * 控件对应：光照模式 -> 灯光强度和 scene.environment；曝光 -> renderer.toneMappingExposure；显示 PBR 观察球 -> 固定辅助对象 visible。
 * 预期观察：只用直接光时高光和阴影方向更明显；只用环境时形体更柔；曝光改变整体明暗但不改变模型位置。
 */
export async function createLightingEnvironmentLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, lights, environment, dispose: disposeSceneSupport } = createViewerScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const loader = new GLTFLoader();
  let modelRoot = null;
  const probe = createPbrProbe();

  probe.position.set(1.45, 0.2, 0);
  scene.add(probe);

  bindSelect('lighting-mode', () => {
    applyLightingMode();
  });
  bindRange('exposure', (value) => {
    renderer.toneMappingExposure = value;
    writeRendererState();
  });
  bindCheckbox('show-probe', (checked) => {
    probe.visible = checked;
  });

  await loadModel();

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls);

  async function loadModel() {
    const gltf = await loader.loadAsync(MODEL_ASSETS.glb.url);
    modelRoot = gltf.scene;
    modelRoot.name = 'lighting-target';
    modelRoot.position.x = -0.55;
    scene.add(modelRoot);
    frameObject(camera, controls, modelRoot, { fitRatio: 2.3 });
  }

  function applyLightingMode() {
    const mode = readElement('lighting-mode').value;

    if (mode === 'lightsOnly') {
      scene.environment = null;
      lights.hemisphere.intensity = 0.85;
      lights.key.intensity = 2.2;
      lights.fill.intensity = 0.35;
    } else if (mode === 'environmentOnly') {
      scene.environment = environment;
      lights.hemisphere.intensity = 0;
      lights.key.intensity = 0;
      lights.fill.intensity = 0;
    } else if (mode === 'dim') {
      scene.environment = environment;
      lights.hemisphere.intensity = 0.15;
      lights.key.intensity = 0.25;
      lights.fill.intensity = 0;
    } else {
      scene.environment = environment;
      lights.hemisphere.intensity = 0.9;
      lights.key.intensity = 2.1;
      lights.fill.intensity = 0.45;
    }

    writeText('mode-state', modeText(mode));
    writeText('environment-state', scene.environment ? 'scene.environment = RoomEnvironment PMREM' : 'scene.environment = null');
    writeText(
      'light-state',
      `hemisphere=${lights.hemisphere.intensity.toFixed(2)}; key=${lights.key.intensity.toFixed(2)}; fill=${lights.fill.intensity.toFixed(2)}`
    );
  }

  function writeRendererState() {
    writeText(
      'renderer-state',
      `outputColorSpace=SRGBColorSpace; toneMapping=ACESFilmicToneMapping; exposure=${renderer.toneMappingExposure.toFixed(1)}`
    );
  }

  function modeText(mode) {
    const names = {
      both: '直接光和环境同时参与 PBR',
      lightsOnly: '只观察直接光方向',
      environmentOnly: '只观察环境贴图贡献',
      dim: '弱光状态，用来模拟发黑排查'
    };

    return names[mode] || mode;
  }

  return {
    dispose() {
      stop();
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeObjectTree(modelRoot);
      }
      scene.remove(probe);
      disposeObjectTree(probe);
      controls.dispose();
      disposeSceneSupport();
      renderer.dispose();
    }
  };
}

function createPbrProbe() {
  const group = new THREE.Group();
  group.name = 'pbr-probe';

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 48, 24),
    new THREE.MeshStandardMaterial({
      color: '#f8faf9',
      roughness: 0.18,
      metalness: 0.85
    })
  );
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.43, 0.06, 40),
    new THREE.MeshStandardMaterial({
      color: '#4f626d',
      roughness: 0.72,
      metalness: 0.1
    })
  );

  base.position.y = -0.42;
  group.add(sphere, base);
  return group;
}
