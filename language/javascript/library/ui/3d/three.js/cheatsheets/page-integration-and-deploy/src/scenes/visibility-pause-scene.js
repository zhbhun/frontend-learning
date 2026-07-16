/*
本示例演示页面不可见或 canvas 离开视口时暂停渲染循环。
读代码先看 syncLoop()：Page Visibility 和 IntersectionObserver 都只写状态，真正启动 / 停止 RAF 的入口集中在这里。
页面读数对应状态：visibilityState 来自 document；in view 来自 IntersectionObserver；delta 在恢复时重置，避免隐藏期间的时间差让动画跳变。
预期观察：滚动到画布离开视口时帧数停止增加；回到视口后继续增加。切换浏览器标签页也会暂停。
*/

import {
  addBaseLights,
  addReferenceGrid,
  createCamera,
  createHeroMesh,
  createRenderer,
  createScene,
  disposeObjectTree,
  syncRendererSize
} from '../shared-stage.js';

export function createVisibilityPauseScene({ canvas, frame, onSnapshot }) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  const mesh = createHeroMesh('#3f7f54');

  const state = {
    visible: document.visibilityState !== 'hidden',
    inViewport: true,
    running: false,
    frames: 0,
    deltaMs: 0,
    reason: '初始化'
  };

  let frameId = 0;
  let lastTime = 0;
  let disposed = false;

  addBaseLights(scene);
  addReferenceGrid(scene);
  scene.add(mesh);

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => {
        if (disposed) {
          return;
        }

        state.reason = 'ResizeObserver';
        if (isRenderable()) {
          renderOnce(performance.now());
        }
      })
    : null;
  resizeObserver?.observe(frame);

  const intersectionObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => {
        if (disposed) {
          return;
        }

        state.inViewport = entry?.isIntersecting ?? true;
        state.reason = state.inViewport ? 'IntersectionObserver: 进入视口' : 'IntersectionObserver: 离开视口';
        syncLoop();
      }, { threshold: 0.18 })
    : null;
  intersectionObserver?.observe(frame);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  syncLoop();

  function syncLoop() {
    if (disposed) {
      return;
    }

    if (isRenderable()) {
      startLoop();
      return;
    }

    stopLoop(state.reason);
  }

  function startLoop() {
    if (disposed) {
      return;
    }

    if (state.running) {
      publish();
      return;
    }

    state.running = true;
    lastTime = 0;
    state.reason = state.reason === '初始化' ? '开始渲染' : state.reason;
    frameId = requestAnimationFrame(loop);
    publish();
  }

  function stopLoop(reason) {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    state.running = false;
    state.deltaMs = 0;
    lastTime = 0;
    state.reason = reason;
    publish();
  }

  function loop(time) {
    if (disposed) {
      return;
    }

    if (!state.running || !isRenderable()) {
      stopLoop('循环条件失效');
      return;
    }

    renderOnce(time);
    frameId = requestAnimationFrame(loop);
  }

  function renderOnce(time) {
    if (disposed) {
      return;
    }

    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    state.deltaMs = delta * 1000;
    state.frames += 1;
    mesh.rotation.x += delta * 0.28;
    mesh.rotation.y += delta * 0.82;
    syncRendererSize({ renderer, camera, element: frame, pixelRatioLimit: 2 });
    renderer.render(scene, camera);
    publish();
  }

  function handleVisibilityChange() {
    if (disposed) {
      return;
    }

    state.visible = document.visibilityState !== 'hidden';
    state.reason = state.visible ? 'Page Visibility: visible' : 'Page Visibility: hidden';
    syncLoop();
  }

  function isRenderable() {
    return state.visible && state.inViewport;
  }

  function publish() {
    onSnapshot?.({ ...state });
  }

  return {
    dispose() {
      disposed = true;
      stopLoop('dispose()');
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
