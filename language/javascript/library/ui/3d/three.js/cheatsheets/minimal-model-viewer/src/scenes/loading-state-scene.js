import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createPlaceholderRoot,
  createRenderer,
  createViewerScene,
  disposeObjectTree,
  frameObject,
  shortUrl,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindSelect, readElement, setButtonBusy, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示查看器的加载状态和错误恢复。
 * 阅读主线：先看 runSelectedLoad() 如何用 loadToken 保护异步结果，再看 catch 分支如何显示占位模型和失败 URL。
 * 控件对应：情况 -> 有效模型、主文件缺失、外部 buffer 缺失；加载 -> GLTFLoader.loadAsync()；加载有效模型 -> 恢复到成功状态。
 * 预期观察：错误不会留下空白画布；旧请求如果晚返回，会被 token 判断为过期并释放。
 */
export async function createLoadingStateLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, dispose: disposeSceneSupport } = createViewerScene(renderer);
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  let currentRoot = null;
  let loadToken = 0;
  let lastErrorUrl = '-';

  manager.onStart = (url, loaded, total) => {
    writeText('progress-state', `开始 ${loaded}/${total}: ${shortUrl(url)}`);
  };
  manager.onProgress = (url, loaded, total) => {
    writeText('progress-state', `进度 ${loaded}/${total}: ${shortUrl(url)}`);
  };
  manager.onLoad = () => {
    writeText('progress-state', '全部资源加载完成');
  };
  manager.onError = (url) => {
    lastErrorUrl = url;
    writeText('last-error-url', url);
    writeText('progress-state', `资源失败: ${shortUrl(url)}`);
  };

  bindSelect('load-case', () => {}, { immediate: false });
  bindButton('run-load', () => {
    runSelectedLoad();
  });
  bindButton('retry-valid', () => {
    readElement('load-case').value = 'glb';
    runSelectedLoad();
  });

  showPlaceholder('等待加载', '#30788e');
  frameObject(camera, controls, currentRoot);
  await runSelectedLoad();

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    if (currentRoot) {
      currentRoot.rotation.y = Math.sin(time * 0.7) * 0.18;
    }
  });

  async function runSelectedLoad() {
    const token = ++loadToken;
    const asset = MODEL_ASSETS[readElement('load-case').value];

    lastErrorUrl = '-';
    clearCurrentRoot();
    setButtonBusy('run-load', true);
    setButtonBusy('retry-valid', true);
    writeText('load-state', `加载中：${asset.label}`);
    writeText('last-error-url', '-');
    writeText('error-state', asset.note);
    writeText('recovery-state', '等待结果');

    try {
      const gltf = await loader.loadAsync(asset.url);

      if (token !== loadToken) {
        disposeObjectTree(gltf.scene);
        return;
      }

      currentRoot = gltf.scene;
      currentRoot.name = 'loaded-gltf-scene';
      scene.add(currentRoot);
      frameObject(camera, controls, currentRoot);
      writeText('load-state', `加载完成：${asset.label}`);
      writeText('error-state', '没有错误');
      writeText('recovery-state', '当前模型可观察，可继续切换失败情况。');
    } catch (error) {
      if (token !== loadToken) {
        return;
      }

      showPlaceholder('加载失败', '#d95832');
      frameObject(camera, controls, currentRoot);
      writeText('load-state', `加载失败：${asset.label}`);
      writeText('error-state', error.message || String(error));
      writeText(
        'recovery-state',
        lastErrorUrl === '-' ? '优先检查主文件 URL 和控制台错误。' : '失败 URL 已记录，可以直接加载有效模型恢复。'
      );
    } finally {
      if (token === loadToken) {
        setButtonBusy('run-load', false);
        setButtonBusy('retry-valid', false);
      }
    }
  }

  function showPlaceholder(label, color) {
    clearCurrentRoot();
    currentRoot = createPlaceholderRoot(label, color);
    scene.add(currentRoot);
  }

  function clearCurrentRoot() {
    if (!currentRoot) {
      return;
    }

    scene.remove(currentRoot);
    disposeObjectTree(currentRoot);
    currentRoot = null;
  }

  return {
    dispose() {
      stop();
      clearCurrentRoot();
      controls.dispose();
      disposeSceneSupport();
      renderer.dispose();
    }
  };
}
