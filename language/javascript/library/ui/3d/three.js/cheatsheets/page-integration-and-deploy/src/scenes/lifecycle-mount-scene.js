/*
本示例演示路由组件式的 mount / unmount 生命周期。
读代码先看 mount() 和 unmount()：mount 创建 canvas、renderer、对象、ResizeObserver、pointer listener 和 RAF；unmount 按相反顺序清理。
页面控件对应状态：挂载 / 卸载 / 重新挂载触发资源生命周期；“挂载时创建纹理”决定 material.map 是否需要释放。
预期观察：反复重新挂载时，释放次数和释放资源计数同步增加，DOM 区域不会残留旧 canvas。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createCamera,
  createCheckerTexture,
  createRenderer,
  createScene,
  disposeObjectTree,
  syncRendererSize
} from '../shared-stage.js';

const initialDisposed = {
  geometries: 0,
  materials: 0,
  textures: 0
};

export function createLifecycleMountController({ host, onSnapshot }) {
  const state = {
    useTexture: true,
    mounts: 0,
    disposals: 0,
    listeners: 0,
    disposed: { ...initialDisposed },
    action: '初始化'
  };

  let instance = null;

  function mount() {
    if (instance) {
      state.action = 'mount() 跳过：组件已存在';
      publish();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', '挂载生命周期 three.js 画布');
    host.replaceChildren(canvas);

    const renderer = createRenderer(canvas);
    const camera = createCamera();
    const scene = createScene();
    const mesh = createRouteMesh(state.useTexture);

    addBaseLights(scene);
    addReferenceGrid(scene);
    scene.add(mesh);

    let frameId = 0;
    let lastTime = 0;
    let active = true;

    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(() => renderFrame(performance.now()))
      : null;
    resizeObserver?.observe(host);

    function handlePointerDown() {
      mesh.rotation.x += 0.22;
      renderFrame(performance.now());
    }

    function loop(time) {
      if (!active) {
        return;
      }

      renderFrame(time);
      frameId = requestAnimationFrame(loop);
    }

    function renderFrame(time) {
      if (!active) {
        return;
      }

      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      mesh.rotation.y += delta * 0.74;
      syncRendererSize({ renderer, camera, element: host, pixelRatioLimit: 2 });
      renderer.render(scene, camera);
    }

    canvas.addEventListener('pointerdown', handlePointerDown);
    frameId = requestAnimationFrame(loop);

    instance = {
      canvas,
      renderer,
      scene,
      resizeObserver,
      stop() {
        active = false;
        cancelAnimationFrame(frameId);
      },
      removeListeners() {
        canvas.removeEventListener('pointerdown', handlePointerDown);
      }
    };

    state.mounts += 1;
    state.listeners = 2;
    state.action = state.useTexture ? 'mount() 创建 renderer、mesh 和纹理' : 'mount() 创建 renderer 和 mesh';
    publish();
  }

  function unmount() {
    if (!instance) {
      state.action = 'unmount() 跳过：组件已不存在';
      publish();
      return;
    }

    instance.stop();
    instance.resizeObserver?.disconnect();
    instance.removeListeners();

    // 移出 DOM 不是释放 GPU；这里显式释放 geometry、material 和 material 上引用的 texture。
    state.disposed = disposeObjectTree(instance.scene);
    instance.renderer.dispose();
    host.replaceChildren();

    instance = null;
    state.disposals += 1;
    state.listeners = 0;
    state.action = 'unmount() 取消循环、移除监听器并 dispose';
    publish();
  }

  function remount() {
    unmount();
    mount();
    state.action = 'remount() 完成一次卸载和挂载';
    publish();
  }

  function publish() {
    onSnapshot?.({
      mounted: Boolean(instance),
      mounts: state.mounts,
      disposals: state.disposals,
      listeners: state.listeners,
      disposed: state.disposed,
      action: state.action
    });
  }

  publish();

  return {
    mount,
    unmount,
    remount,
    setUseTexture(value) {
      state.useTexture = value;
      state.action = value ? '下次挂载会创建纹理' : '下次挂载不创建纹理';
      publish();
    }
  };
}

function createRouteMesh(useTexture) {
  const geometry = new THREE.BoxGeometry(1.35, 1.35, 1.35, 3, 3, 3);
  const material = new THREE.MeshStandardMaterial({
    color: '#28747c',
    roughness: 0.46,
    metalness: 0.08
  });

  if (useTexture) {
    material.map = createCheckerTexture({
      size: 256,
      label: 'ROUTE',
      hue: 176
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.05;
  return mesh;
}
