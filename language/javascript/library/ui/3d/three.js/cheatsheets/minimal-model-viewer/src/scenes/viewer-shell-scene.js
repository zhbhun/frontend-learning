import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  collectModelStats,
  createCamera,
  createControls,
  createRenderer,
  createViewerScene,
  disposeObjectTree,
  formatVector,
  frameObject,
  shortUrl,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindCheckbox, bindSelect, readElement, setButtonBusy, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示一个最小模型查看器的组合顺序。
 * 阅读主线：先看 createViewerShellLesson() 创建 renderer/scene/camera/controls，再看 loadSelectedModel() 的异步加载、attachModel() 的取景和 startRenderLoop() 的 resize + controls.update()。
 * 控件对应：模型 -> GLTFLoader URL；自动旋转 -> loadedRoot.rotation.y；显示网格 -> GridHelper.visible；重新取景 -> Box3 + camera + controls.target。
 * 预期观察：切换 .glb/.gltf/多节点模型后，模型都会被放到可见位置，拖拽始终围绕模型中心旋转。
 */
export async function createViewerShellLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, grid, dispose: disposeSceneSupport } = createViewerScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  let loadedRoot = null;
  let autoRotate = true;
  let loadToken = 0;

  manager.onStart = (url, loaded, total) => {
    writeText('manager-state', `开始 ${loaded}/${total}: ${shortUrl(url)}`);
  };
  manager.onProgress = (url, loaded, total) => {
    writeText('manager-state', `进度 ${loaded}/${total}: ${shortUrl(url)}`);
  };
  manager.onLoad = () => {
    writeText('manager-state', '全部资源加载完成');
  };
  manager.onError = (url) => {
    writeText('manager-state', `资源失败: ${shortUrl(url)}`);
  };

  bindSelect('model-kind', () => {
    loadSelectedModel();
  }, { immediate: false });
  bindCheckbox('auto-rotate', (checked) => {
    autoRotate = checked;
  });
  bindCheckbox('show-grid', (checked) => {
    grid.visible = checked;
  });
  bindButton('reload-model', () => {
    loadSelectedModel();
  });
  bindButton('reset-view', () => {
    frameCurrentModel();
  });

  await loadSelectedModel();

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    if (loadedRoot && autoRotate) {
      loadedRoot.rotation.y = time * 0.35;
    }

    writeCameraState();
  });

  async function loadSelectedModel() {
    const token = ++loadToken;
    const asset = MODEL_ASSETS[readElement('model-kind').value];

    clearLoadedModel();
    setButtonBusy('reload-model', true);
    setButtonBusy('reset-view', true);
    writeText('load-state', `加载中：${asset.label}`);
    writeText('model-state', asset.note);
    writeText('frame-state', '-');

    try {
      const gltf = await loader.loadAsync(asset.url);

      if (token !== loadToken) {
        disposeObjectTree(gltf.scene);
        return;
      }

      attachModel(gltf, asset);
    } catch (error) {
      if (token !== loadToken) {
        return;
      }

      writeText('load-state', `加载失败：${error.message || error}`);
      writeText('model-state', '打开 Network 面板区分主文件、外部资源或解码器错误。');
    } finally {
      if (token === loadToken) {
        setButtonBusy('reload-model', false);
        setButtonBusy('reset-view', !loadedRoot);
      }
    }
  }

  function attachModel(gltf, asset) {
    loadedRoot = gltf.scene;
    loadedRoot.name = loadedRoot.name || asset.label;
    scene.add(loadedRoot);

    const stats = collectModelStats(gltf);
    const framing = frameCurrentModel();

    writeText('load-state', `加载完成：${asset.label}`);
    writeText(
      'model-state',
      `nodes=${stats.nodeCount}; meshes=${stats.meshCount}; materials=${stats.materialCount}; textures=${stats.textureCount}; animations=${stats.animationCount}; scenes=${stats.sceneCount}`
    );

    if (!framing) {
      writeText('frame-state', '没有可计算的包围盒');
    }
  }

  function frameCurrentModel() {
    if (!loadedRoot) {
      return null;
    }

    const framing = frameObject(camera, controls, loadedRoot);

    if (framing) {
      writeText(
        'frame-state',
        `center=${formatVector(framing.center)}; size=${formatVector(framing.size)}; distance=${framing.distance.toFixed(2)}`
      );
      writeCameraState();
    }

    return framing;
  }

  function writeCameraState() {
    writeText(
      'camera-state',
      `position=${formatVector(camera.position)}; target=${formatVector(controls.target)}`
    );
  }

  function clearLoadedModel() {
    if (!loadedRoot) {
      return;
    }

    scene.remove(loadedRoot);
    disposeObjectTree(loadedRoot);
    loadedRoot = null;
  }

  return {
    dispose() {
      stop();
      clearLoadedModel();
      controls.dispose();
      disposeSceneSupport();
      renderer.dispose();
    }
  };
}
