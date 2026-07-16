import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createRenderer,
  createScene,
  disposeObjectTree,
  frameObject,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindSelect, readElement, setButtonBusy, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示模型加载失败时的可观察处理。
 * 阅读主线：先看 runSelectedCase() 的 try/catch，再看 LoadingManager.onError 如何记录失败 URL。
 * 控件对应：主文件不存在 -> 顶层 URL 404；外部 .bin 丢失 -> .gltf 成功但依赖资源失败；恢复加载 -> 清掉占位模型后重新加载有效 GLB。
 * 预期观察：错误不会让渲染器空白，页面会显示占位物、失败 URL 和可恢复状态。
 */
export async function createLoadingErrorsLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  let currentRoot = null;
  let loadToken = 0;
  let lastManagerErrorUrl = '-';

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
    lastManagerErrorUrl = url;
    writeText('manager-state', `资源失败: ${shortUrl(url)}`);
    writeText('last-error-url', url);
  };

  bindSelect('error-case', () => {}, { immediate: false });
  bindButton('run-case', () => {
    runSelectedCase();
  });
  bindButton('retry-valid', () => {
    readElement('error-case').value = 'valid';
    runSelectedCase();
  });

  showPlaceholder('等待运行');
  frameObject(camera, controls, currentRoot);
  await runSelectedCase();

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, (time) => {
    if (currentRoot) {
      currentRoot.rotation.y = Math.sin(time * 0.65) * 0.18;
    }
  });

  async function runSelectedCase() {
    const token = ++loadToken;
    const asset = MODEL_ASSETS[readElement('error-case').value];
    lastManagerErrorUrl = '-';
    setButtonBusy('run-case', true);
    setButtonBusy('retry-valid', true);
    clearCurrentRoot();
    writeText('load-state', `尝试加载：${asset.label}`);
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
      currentRoot.name = 'recovered-gltf-scene';
      scene.add(currentRoot);
      frameObject(camera, controls, currentRoot);
      writeText('load-state', `加载成功：${asset.label}`);
      writeText('error-state', '没有错误，说明同一个 loader 可以在失败后继续复用。');
      writeText('recovery-state', '已显示有效模型');
    } catch (error) {
      if (token !== loadToken) {
        return;
      }

      showPlaceholder('加载失败');
      frameObject(camera, controls, currentRoot);
      writeText('load-state', `加载失败：${asset.label}`);
      writeText('error-state', error.message || String(error));
      writeText(
        'recovery-state',
        lastManagerErrorUrl === '-' ? '检查主文件 URL 和控制台错误。' : '失败 URL 已记录，可以切换到有效模型重试。'
      );
    } finally {
      if (token === loadToken) {
        setButtonBusy('run-case', false);
        setButtonBusy('retry-valid', false);
      }
    }
  }

  function showPlaceholder(label) {
    clearCurrentRoot();

    const group = new THREE.Group();
    group.name = label;

    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const material = new THREE.MeshStandardMaterial({
      color: '#d95832',
      roughness: 0.5,
      metalness: 0.05,
      wireframe: true
    });
    const box = new THREE.Mesh(geometry, material);
    const marker = new THREE.AxesHelper(1.5);

    group.add(box, marker);
    currentRoot = group;
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
      renderer.dispose();
    }
  };
}

function shortUrl(url) {
  return url.split('/').slice(-2).join('/');
}
