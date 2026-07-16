/*
本示例演示 requestAnimationFrame 的所有权不应该等同于 UI state 的每帧更新。
读代码先看 loop() 和 publishUiState()：three.js 每帧用稳定引用更新 mesh，UI 可以低频读取快照；“每帧 UI”模式模拟把每一帧都写进框架 state。
页面控件对应状态：模式按钮决定 UI 更新频率，动画速度改变 mesh 旋转，UI 快照间隔只影响 DOM/框架层读数。
预期观察：两种模式下 3D 都连续动画；低频 UI 的 UI render 数远低于 3D 帧数，每帧 UI 则几乎同步增长。
*/

import {
  addReferenceGrid,
  addStudioLights,
  createCamera,
  createFrameworkMesh,
  createRenderer,
  createScene,
  syncRendererSize
} from '../shared-stage.js';

export function createLoopOwnershipController({ host, onSnapshot }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', '循环所有权 three.js 画布');
  host.replaceChildren(canvas);

  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  const mesh = createFrameworkMesh('#6d5bd0');
  addStudioLights(scene);
  addReferenceGrid(scene);
  scene.add(mesh);

  const state = {
    mode: 'throttled',
    running: false,
    speed: 1,
    uiInterval: 250,
    frames: 0,
    uiRenders: 0,
    uiState: {
      angle: '0.00',
      tick: 0
    },
    action: '初始化'
  };

  let frameId = 0;
  let lastTime = 0;
  let lastUiTime = 0;

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => renderFrame(performance.now(), 0))
    : null;
  resizeObserver?.observe(host);

  function loop(time) {
    if (!state.running) {
      return;
    }

    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;

    renderFrame(time, delta);
    state.frames += 1;

    if (state.mode === 'every-frame') {
      publishUiState('每帧模拟 setState');
    } else if (time - lastUiTime >= state.uiInterval) {
      lastUiTime = time;
      publishUiState('低频读取 three.js 快照');
    }

    frameId = requestAnimationFrame(loop);
  }

  function renderFrame(time, delta) {
    mesh.rotation.y += delta * state.speed;
    mesh.rotation.x = Math.sin(time * 0.0012) * 0.32;
    syncRendererSize({ renderer, camera, element: host });
    renderer.render(scene, camera);
  }

  function publishUiState(action = state.action) {
    state.uiRenders += 1;
    state.uiState = {
      angle: mesh.rotation.y.toFixed(2),
      tick: state.frames
    };
    state.action = action;
    publish();
  }

  function start() {
    if (state.running) {
      state.action = 'start() 跳过：loop 已运行';
      publish();
      return;
    }

    state.running = true;
    lastTime = 0;
    lastUiTime = 0;
    state.action = 'adapter 启动 requestAnimationFrame';
    frameId = requestAnimationFrame(loop);
    publish();
  }

  function pause() {
    state.running = false;
    cancelAnimationFrame(frameId);
    state.action = 'adapter 暂停 requestAnimationFrame';
    publish();
  }

  function reset() {
    state.frames = 0;
    state.uiRenders = 0;
    state.uiState = { angle: '0.00', tick: 0 };
    mesh.rotation.set(0, 0, 0);
    state.action = '重置帧数和 UI render 计数';
    publish();
  }

  function setMode(mode) {
    state.mode = mode;
    state.action = mode === 'throttled'
      ? 'UI 只低频读取 three.js 状态'
      : 'UI 每帧写入模拟框架 state';
    publish();
  }

  function setSpeed(speed) {
    state.speed = speed;
    state.action = '更新动画速度：不重建 loop';
    publish();
  }

  function setUiInterval(interval) {
    state.uiInterval = interval;
    state.action = '更新 UI 快照间隔：只影响框架层读数';
    publish();
  }

  function publish() {
    onSnapshot?.({
      running: state.running,
      frames: state.frames,
      uiRenders: state.uiRenders,
      uiState: state.uiState,
      loopOwner: state.mode === 'throttled' ? 'adapter + 低频快照' : 'adapter + 每帧 state',
      action: state.action
    });
  }

  renderFrame(0, 0);
  publish();

  return {
    start,
    pause,
    reset,
    setMode,
    setSpeed,
    setUiInterval
  };
}
