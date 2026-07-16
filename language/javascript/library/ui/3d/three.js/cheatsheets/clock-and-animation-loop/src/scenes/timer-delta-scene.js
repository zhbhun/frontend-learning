import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatMilliseconds,
  formatNumber,
  formatSeconds,
  startAnimationLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示 Timer 的 delta 更新方式，并对比“每帧固定增量”的帧率依赖问题。
 * 阅读主线：先看 animation loop 里先调用 timer.update(timestamp)，再看 updateWithDelta() 和 updatePerFrame() 的差异。
 * 控件对应：速度 -> 每秒旋转弧度；每帧固定增量 -> 故意不用 delta，只按帧数累加。
 * 预期观察：delta 模式按秒推进；固定增量模式把速度绑在帧率上，高刷新率或掉帧时速度语义会变。
 */
export function createTimerDeltaLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const timer = new THREE.Timer();
  const state = {
    speed: 1.6,
    perFrameMode: false
  };

  timer.connect(document);

  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.72, 0.22, 120, 14),
    new THREE.MeshNormalMaterial({ flatShading: false })
  );
  mesh.position.y = 0.12;
  scene.add(mesh);

  function updateWithDelta(delta) {
    mesh.rotation.x += delta * state.speed * 0.55;
    mesh.rotation.y += delta * state.speed;
  }

  function updatePerFrame() {
    // 反例：每帧固定加一个角度，屏幕刷新率越高、单位秒内加的次数越多。
    const fixedFrameIncrement = state.speed / 60;
    mesh.rotation.x += fixedFrameIncrement * 0.55;
    mesh.rotation.y += fixedFrameIncrement;
  }

  bindRange('speed', 'speed-value', (value) => `${formatNumber(value)} rad/s`, (value) => {
    state.speed = value;
  });

  bindCheckbox('frame-mode', (checked) => {
    state.perFrameMode = checked;
  });

  const stop = startAnimationLoop(renderer, scene, camera, canvas, (timestamp) => {
    // Timer 的核心顺序：每帧先 update，再把本帧 delta 分发给需要时间的系统。
    timer.update(timestamp);

    const delta = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();

    if (state.perFrameMode) {
      updatePerFrame();
    } else {
      updateWithDelta(delta);
    }

    writeText('mode-state', state.perFrameMode ? '每帧固定增量' : 'delta * 每秒速度');
    writeText('delta-state', formatMilliseconds(delta));
    writeText('elapsed-state', formatSeconds(elapsed));
    writeText('rotation-state', mesh.rotation.y.toFixed(3));
  });

  return {
    dispose() {
      stop();
      timer.disconnect();
      timer.dispose();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
