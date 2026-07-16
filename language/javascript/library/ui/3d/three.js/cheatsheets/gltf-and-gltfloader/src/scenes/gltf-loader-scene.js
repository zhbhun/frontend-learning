import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  collectModelStats,
  createCamera,
  createControls,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatVector,
  frameObject,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindCheckbox, bindSelect, readElement, setButtonBusy, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 GLTFLoader 的基础加载链路。
 * 阅读主线：先看 loadSelectedAsset() 如何 await loader.loadAsync()，再看 attachLoadedScene() 如何添加 gltf.scene。
 * 控件对应：模型来源 -> .glb/.gltf/多节点 glTF URL；重新加载 -> 释放旧模型后再次加载；自动旋转 -> 只改变 gltf.scene.rotation。
 * 预期观察：.glb 是单文件请求；.gltf 会再请求 Box0.bin；加载结果都有 scene、scenes 和 animations 字段。
 */
export async function createGltfLoaderLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createScene();
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

  bindSelect('asset-kind', () => {
    loadSelectedAsset();
  }, { immediate: false });
  bindCheckbox('auto-rotate', (checked) => {
    autoRotate = checked;
  });
  bindButton('reload-model', () => {
    loadSelectedAsset();
  });

  await loadSelectedAsset();

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    if (loadedRoot && autoRotate) {
      loadedRoot.rotation.y = time * 0.45;
    }
  });

  async function loadSelectedAsset() {
    const token = ++loadToken;
    const asset = MODEL_ASSETS[readElement('asset-kind').value];

    clearLoadedModel();
    setButtonBusy('reload-model', true);
    writeText('load-state', `加载中：${asset.label}`);
    writeText('asset-url', asset.url);
    writeText('scene-state', asset.note);
    writeText('mesh-state', '-');
    writeText('animation-state', '-');

    try {
      const gltf = await loader.loadAsync(asset.url);

      if (token !== loadToken) {
        disposeObjectTree(gltf.scene);
        return;
      }

      attachLoadedScene(gltf, asset);
    } catch (error) {
      writeText('load-state', `加载失败：${error.message || error}`);
      writeText('mesh-state', '打开 Network 面板区分主文件失败还是外部资源失败。');
    } finally {
      if (token === loadToken) {
        setButtonBusy('reload-model', false);
      }
    }
  }

  function attachLoadedScene(gltf, asset) {
    loadedRoot = gltf.scene;
    loadedRoot.name = loadedRoot.name || asset.label;
    scene.add(loadedRoot);

    const stats = collectModelStats(gltf);
    const framing = frameObject(camera, controls, loadedRoot);
    const sizeText = framing ? formatVector(framing.size) : '无可见尺寸';

    writeText('load-state', `加载完成：${asset.label}`);
    writeText(
      'scene-state',
      `scene=${loadedRoot.type}; scenes=${stats.sceneCount}; cameras=${stats.cameraCount}`
    );
    writeText(
      'mesh-state',
      `nodes=${stats.nodeCount}; meshes=${stats.meshCount}; materials=${stats.materialCount}; textures=${stats.textureCount}; bounds=${sizeText}`
    );
    writeText('animation-state', `${stats.animationCount} 个 AnimationClip`);
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
      renderer.dispose();
    }
  };
}

function shortUrl(url) {
  return url.split('/').slice(-2).join('/');
}
