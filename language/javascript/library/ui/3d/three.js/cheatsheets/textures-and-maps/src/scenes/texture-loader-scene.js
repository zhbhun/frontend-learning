import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 TextureLoader 和 LoadingManager 的加载链路。
 * 阅读主线：先看 loadTexture() 如何拿到图片，再看 assignTexture() 如何把 Texture 放进 material.map。
 * 控件对应：重新加载按钮 -> loader.loadAsync()；指标显示图片尺寸、map 槽位和纹理版本。
 */
export async function createTextureLoaderLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.5,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), material);
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  const textureUrl = new URL('../../assets/color-grid.svg', import.meta.url).href;
  let loadCount = 0;

  scene.add(mesh);

  manager.onStart = (url) => writeText('load-state', `开始加载 ${url.split('/').pop()}`);
  manager.onLoad = () => writeText('load-state', `加载完成 ${loadCount} 次`);
  manager.onError = (url) => writeText('load-state', `加载失败 ${url}`);

  async function loadTexture() {
    loadCount += 1;
    const texture = await loader.loadAsync(textureUrl);
    assignTexture(texture);
  }

  function assignTexture(texture) {
    const previous = material.map;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    // 替换贴图槽会影响材质 shader 分支，设置 material.needsUpdate 让材质重新编译。
    material.map = texture;
    material.needsUpdate = true;

    if (previous) {
      previous.dispose();
    }

    const image = texture.image || {};
    writeText('image-size', `${image.width || '?'} x ${image.height || '?'}`);
    writeText('map-state', `material.map = Texture; colorSpace ${texture.colorSpace}`);
    writeText('version-state', `texture.version ${texture.version}`);
  }

  bindButton('reload-texture', () => {
    loadTexture();
  });

  await loadTexture();

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    mesh.rotation.set(0.35, time * 0.36, 0.08);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
