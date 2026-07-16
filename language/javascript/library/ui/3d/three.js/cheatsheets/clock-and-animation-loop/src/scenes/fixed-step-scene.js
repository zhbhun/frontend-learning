import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createReferenceLine,
  createRenderer,
  createTickMarks,
  disposeObjectTree,
  formatMilliseconds,
  formatNumber,
  formatSeconds,
  startAnimationLoop
} from '../shared-stage.js';
import { bindButton, bindRange, bindSelect, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示固定步长业务更新：渲染帧可以不稳定，但业务状态按固定 step 消耗 accumulator。
 * 阅读主线：看 frame() 如何限制 delta、累加 accumulator，再用 while 循环调用 updateSimulation(fixedStep)。
 * 控件对应：业务频率 -> fixedStep；最大 delta -> 防止后台恢复后一帧补太多；模拟后台恢复 -> 人为制造大 delta。
 * 预期观察：按钮触发大 delta 时，raw delta 变大，但 capped delta 和本帧业务步数受上限控制，物体不会瞬移太远。
 */
export function createFixedStepLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const timer = new THREE.Timer();
  const state = {
    fixedStep: 1 / 60,
    maxDelta: 0.1,
    accumulator: 0,
    simulationTime: 0,
    position: -2,
    velocity: 1.25,
    pendingSpike: 0
  };

  timer.connect(document);

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 16),
    new THREE.MeshStandardMaterial({
      color: '#36a269',
      roughness: 0.36,
      metalness: 0.02
    })
  );
  body.position.set(state.position, -0.55, 0);

  const ghost = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 16),
    new THREE.MeshBasicMaterial({
      color: '#2f83d8',
      transparent: true,
      opacity: 0.22
    })
  );
  ghost.position.set(state.position, -0.55, -0.42);

  scene.add(createReferenceLine(), createTickMarks(), ghost, body);

  function updateSimulation(step) {
    state.position += state.velocity * step;

    if (state.position > 2.2) {
      state.position = 2.2;
      state.velocity *= -1;
    }

    if (state.position < -2.2) {
      state.position = -2.2;
      state.velocity *= -1;
    }

    state.simulationTime += step;
  }

  function renderBody() {
    body.position.x = state.position;
    body.rotation.z -= state.velocity * state.fixedStep * 4;

    // 半透明影子显示上一帧渲染留下的参考位置，方便观察是否发生突然大跳。
    ghost.position.x += (state.position - ghost.position.x) * 0.08;
  }

  bindSelect('step-rate', (value) => {
    state.fixedStep = 1 / Number(value);
  });

  bindRange('max-delta', 'max-delta-value', (value) => formatSeconds(value), (value) => {
    state.maxDelta = value;
  });

  bindButton('spike-button', () => {
    state.pendingSpike = 0.5;
  });

  const stop = startAnimationLoop(renderer, scene, camera, canvas, (timestamp) => {
    timer.update(timestamp);

    const rawDelta = timer.getDelta() + state.pendingSpike;
    state.pendingSpike = 0;

    // 业务 delta 加上上限，避免后台恢复或卡顿后一口气补太多规则更新。
    const cappedDelta = Math.min(rawDelta, state.maxDelta);
    state.accumulator += cappedDelta;

    let steps = 0;
    while (state.accumulator >= state.fixedStep) {
      updateSimulation(state.fixedStep);
      state.accumulator -= state.fixedStep;
      steps += 1;
    }

    renderBody();

    writeText('raw-delta-state', formatMilliseconds(rawDelta));
    writeText('capped-delta-state', formatMilliseconds(cappedDelta));
    writeText('steps-state', `${steps} step，${formatNumber(1 / state.fixedStep)} Hz`);
    writeText('simulation-state', formatSeconds(state.simulationTime));
    writeText('accumulator-state', formatMilliseconds(state.accumulator));
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
