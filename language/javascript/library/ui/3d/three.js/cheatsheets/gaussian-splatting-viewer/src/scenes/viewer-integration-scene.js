/*
 * 本示例演示什么：
 * 在真实页面里不要直接散落 viewer 代码，而是用 adapter 包住 mount、load、pause、resize、dispose。
 * 读代码先看哪里：
 * 先看 createMockSplatViewerAdapter() 返回的公共方法，再看 mount() / unmount() 如何成对创建和释放资源。
 * 页面控件对应哪些关键状态：
 * mount 创建 renderer 和监听器；load 替换 mock splat 数据；pause/resume 控制循环；unmount 清理 DOM、事件和 GPU 资源。
 * 预期观察什么：
 * 反复 mount/unmount 时 DOM 不残留旧 canvas，dispose 计数会上升；暂停后帧数停止增长但资源仍保留。
 */

import * as THREE from 'three';
import {
  createCamera,
  createControls,
  createGrid,
  createLabel,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatRenderInfo,
  startFrameLoop,
  syncRendererAndCamera
} from '../shared-stage.js';
import { bindButton, bindRange, bindSelect, writeText } from '../shared-ui.js';
import {
  createSplatBillboardMaterial,
  createSplatInstancedMesh,
  generateSplatRecords,
  updateSplatBillboards
} from '../splat-mock.js';

export function createViewerIntegrationLesson(host) {
  const adapter = createMockSplatViewerAdapter({
    host,
    onSnapshot(snapshot) {
      writeText('lifecycle-state', `mounted=${snapshot.mounted}；loaded=${snapshot.loaded}；paused=${snapshot.paused}
mounts=${snapshot.mounts}；unmounts=${snapshot.unmounts}；action=${snapshot.action}`);
      writeText('resource-state', `splat=${snapshot.splatCount}
释放：geometry=${snapshot.disposed.geometries}；material=${snapshot.disposed.materials}；texture=${snapshot.disposed.textures}`);
      writeText('render-state', `frames=${snapshot.frames}
${snapshot.renderInfo}`);
      writeText('event-state', `listeners=${snapshot.listeners}；ResizeObserver=${snapshot.resizeObserver}
DPR 上限=${snapshot.pixelRatioLimit.toFixed(1)}`);
    }
  });
  const state = {
    count: 420
  };

  bindSelect('viewer-count', (value) => {
    state.count = Number(value);
  });

  bindRange('viewer-dpr', (value) => {
    adapter.setPixelRatioLimit(value);
  }, { format: (value) => value.toFixed(1) });

  bindButton('mount-viewer', () => adapter.mount());
  bindButton('load-viewer', () => adapter.load({ count: state.count }));
  bindButton('pause-viewer', () => adapter.pause('用户暂停'));
  bindButton('resume-viewer', () => adapter.resume('用户恢复'));
  bindButton('unmount-viewer', () => adapter.unmount());

  adapter.mount();
  adapter.load({ count: state.count });

  window.addEventListener('beforeunload', () => adapter.dispose());
}

function createMockSplatViewerAdapter({ host, onSnapshot }) {
  const state = {
    mounted: false,
    loaded: false,
    paused: false,
    userPaused: false,
    mounts: 0,
    unmounts: 0,
    frames: 0,
    listeners: 0,
    splatCount: 0,
    pixelRatioLimit: 1.5,
    resizeObserver: false,
    action: '初始化',
    disposed: { geometries: 0, materials: 0, textures: 0 }
  };
  let instance = null;

  function mount() {
    if (instance) {
      state.action = 'mount() 跳过：viewer 已存在';
      publish();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Gaussian Splatting viewer adapter 教学画布');
    host.replaceChildren(canvas);

    const renderer = createRenderer(canvas, { clearColor: '#161a21', pixelRatioLimit: state.pixelRatioLimit });
    const scene = createScene('#161a21');
    const camera = createCamera({ position: [4.6, 2.6, 6.6], target: [0, 0.1, 0], fov: 44 });
    const controls = createControls(camera, canvas, { target: [0, 0.1, 0], minDistance: 3.2, maxDistance: 12 });
    const root = new THREE.Group();
    scene.add(createGrid({ size: 7, divisions: 14, y: -1.18 }), root, createLabel('viewer adapter', [0, -0.96, 0], { scale: [2.1, 0.42, 1] }));

    function handlePointerDown() {
      root.rotation.y += 0.18;
      state.action = 'canvas pointerdown：请求一帧观察';
      renderOnce(performance.now() * 0.001);
      publish();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        pause('页面隐藏');
        return;
      }

      if (!state.userPaused) {
        resume('页面可见');
      }
    }

    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(() => renderOnce(performance.now() * 0.001))
      : null;
    resizeObserver?.observe(host);
    canvas.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    instance = {
      canvas,
      renderer,
      scene,
      camera,
      controls,
      root,
      resizeObserver,
      stopLoop: null,
      records: [],
      splats: null,
      material: createSplatBillboardMaterial({ opacity: 0.66, alphaTest: 0.012, depthWrite: false }),
      removeListeners() {
        canvas.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    state.mounted = true;
    state.paused = false;
    state.userPaused = false;
    state.loaded = false;
    state.mounts += 1;
    state.listeners = 2;
    state.resizeObserver = Boolean(resizeObserver);
    state.action = 'mount() 创建 renderer、scene、controls 和监听器';
    startLoop();
    publish();
  }

  function load({ count }) {
    if (!instance) {
      mount();
    }

    if (instance.splats) {
      instance.root.remove(instance.splats);
      instance.splats.geometry.dispose();
    }

    instance.records = generateSplatRecords(count, { seed: 808, radius: 1.52, flatten: 0.78 });
    instance.splats = createSplatInstancedMesh(instance.records, instance.material);
    instance.root.add(instance.splats);
    state.loaded = true;
    state.splatCount = count;
    state.action = `load() 写入 ${count} 个 mock splat`;
    renderOnce(performance.now() * 0.001);
    publish();
  }

  function pause(reason = '暂停') {
    if (!instance || state.paused) {
      return;
    }

    state.paused = true;
    state.userPaused = reason === '用户暂停';
    instance.stopLoop?.();
    instance.stopLoop = null;
    state.action = `pause()：${reason}`;
    publish();
  }

  function resume(reason = '恢复') {
    if (!instance || !state.paused) {
      return;
    }

    state.paused = false;
    state.userPaused = false;
    state.action = `resume()：${reason}`;
    startLoop();
    publish();
  }

  function unmount() {
    if (!instance) {
      state.action = 'unmount() 跳过：viewer 不存在';
      publish();
      return;
    }

    instance.stopLoop?.();
    instance.resizeObserver?.disconnect();
    instance.removeListeners();
    instance.controls.dispose();
    state.disposed = disposeObjectTree(instance.scene);
    instance.renderer.dispose();
    host.replaceChildren();
    instance = null;

    state.mounted = false;
    state.loaded = false;
    state.paused = false;
    state.userPaused = false;
    state.unmounts += 1;
    state.listeners = 0;
    state.resizeObserver = false;
    state.splatCount = 0;
    state.action = 'unmount() 取消循环、移除监听器并 dispose';
    publish();
  }

  function setPixelRatioLimit(value) {
    state.pixelRatioLimit = value;

    if (instance) {
      renderOnce(performance.now() * 0.001);
      state.action = `更新 DPR 上限为 ${value.toFixed(1)}`;
    }

    publish();
  }

  function startLoop() {
    if (!instance || instance.stopLoop) {
      return;
    }

    instance.stopLoop = startFrameLoop({
      renderer: instance.renderer,
      camera: instance.camera,
      canvas: instance.canvas,
      controls: instance.controls,
      getPixelRatioLimit: () => state.pixelRatioLimit,
      onFrame(elapsed) {
        renderScene(elapsed);
      },
      render() {
        instance.renderer.render(instance.scene, instance.camera);
        state.frames += 1;
        publish();
      }
    });
  }

  function renderOnce(elapsed) {
    if (!instance) {
      return;
    }

    syncRendererAndCamera(instance.renderer, instance.camera, instance.canvas, {
      pixelRatioLimit: state.pixelRatioLimit
    });
    instance.controls.update();
    renderScene(elapsed);
    instance.renderer.render(instance.scene, instance.camera);
    state.frames += 1;
  }

  function renderScene(elapsed) {
    if (!instance?.splats) {
      return;
    }

    instance.root.rotation.y = Math.sin(elapsed * 0.22) * 0.16;
    updateSplatBillboards(instance.splats, instance.records, instance.camera, {
      scaleMultiplier: 1,
      elapsed,
      wobble: 0.012
    });
  }

  function publish() {
    onSnapshot?.({
      mounted: state.mounted,
      loaded: state.loaded,
      paused: state.paused,
      mounts: state.mounts,
      unmounts: state.unmounts,
      frames: state.frames,
      listeners: state.listeners,
      splatCount: state.splatCount,
      pixelRatioLimit: state.pixelRatioLimit,
      resizeObserver: state.resizeObserver,
      action: state.action,
      disposed: state.disposed,
      renderInfo: instance ? formatRenderInfo(instance.renderer) : 'renderer 已释放'
    });
  }

  publish();

  return {
    mount,
    load,
    pause,
    resume,
    unmount,
    setPixelRatioLimit,
    dispose: unmount
  };
}
