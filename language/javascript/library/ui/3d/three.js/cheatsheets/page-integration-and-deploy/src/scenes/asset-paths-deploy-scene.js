/*
本示例演示 Vite 构建后的资源路径如何进入 three.js 纹理加载。
读代码先看 moduleAssetUrl 和 publicAssetUrl：模块内资源用 new URL(..., import.meta.url)，public 资源用 import.meta.env.BASE_URL 拼接。
页面读数对应状态：BASE_URL 来自 Vite 配置；两个资源 URL 分别展示构建后会被重写和原样复制的路径。
预期观察：两个带字样的平面都能加载贴图；npm run build 后 dist 里的 HTML、JS 和资源仍用相对路径互相找到。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createCamera,
  createRenderer,
  createScene,
  disposeObjectTree,
  startRenderLoop,
  syncRendererSize
} from '../shared-stage.js';

const moduleAssetUrl = new URL('../assets/module-badge.svg', import.meta.url).href;
const publicAssetUrl = `${import.meta.env.BASE_URL}public-badge.svg`;

export function createAssetPathsDeployScene({ canvas, onSnapshot }) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const loadState = {
    module: '等待',
    public: '等待'
  };

  let disposed = false;

  camera.position.set(4.2, 2.8, 5.4);
  camera.lookAt(0, 0, 0);

  addBaseLights(scene);
  addReferenceGrid(scene);

  const modulePlane = createAssetPlane(-1.15, '#28747c');
  const publicPlane = createAssetPlane(1.15, '#c96332');
  group.add(modulePlane, publicPlane);
  scene.add(group);

  loadTexture(moduleAssetUrl, modulePlane, 'module');
  loadTexture(publicAssetUrl, publicPlane, 'public');

  const stop = startRenderLoop((time) => {
    group.rotation.y = Math.sin(time * 0.0007) * 0.12;
    syncRendererSize({ renderer, camera, element: canvas.parentElement, pixelRatioLimit: 2 });
    renderer.render(scene, camera);
  });

  publish();

  function loadTexture(url, mesh, key) {
    loadState[key] = '加载中';
    publish();

    loader.load(
      url,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;
        loadState[key] = '已加载';
        publish();
      },
      undefined,
      () => {
        loadState[key] = '加载失败';
        publish();
      }
    );
  }

  function publish() {
    onSnapshot?.({
      baseUrl: import.meta.env.BASE_URL,
      moduleAssetUrl,
      publicAssetUrl,
      pageUrl: window.location.pathname,
      loadState: `模块 ${loadState.module} / public ${loadState.public}`
    });
  }

  return {
    dispose() {
      disposed = true;
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createAssetPlane(x, color) {
  const geometry = new THREE.PlaneGeometry(1.8, 1.12);
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0.2, 0);
  return mesh;
}
