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
import { bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示 Timer 的推荐用法：每帧先 update(timestamp)，再读取 delta 和 elapsed。
 * 阅读主线：看 timer.update(timestamp) 的位置，然后看 getDelta() 被读取两次但数值保持一致。
 * 控件对应：时间倍率 -> timer.setTimescale()；摆动幅度 -> elapsed 驱动的垂直运动幅度。
 * 预期观察：timescale 为 0 时业务时间暂停但画面仍可渲染；timescale 变大后旋转和摆动同时加速。
 */
export function createTimerStepLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const timer = new THREE.Timer();
  const state = {
    timescale: 1,
    amplitude: 0.45
  };

  timer.connect(document);

  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.25, 1.25),
    new THREE.MeshStandardMaterial({
      color: '#2f83d8',
      roughness: 0.45,
      metalness: 0.05
    })
  );
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 24, 12),
    new THREE.MeshBasicMaterial({ color: '#d6832b' })
  );

  marker.position.set(1.65, 0, 0);
  pivot.add(mesh, marker);
  scene.add(pivot);

  bindRange('timescale', 'timescale-value', formatNumber, (value) => {
    state.timescale = value;
    timer.setTimescale(value);
  });

  bindRange('amplitude', 'amplitude-value', formatNumber, (value) => {
    state.amplitude = value;
  });

  const stop = startAnimationLoop(renderer, scene, camera, canvas, (timestamp) => {
    // Timer 的核心规则：每个 simulation step 只 update 一次，然后可以稳定读取多次。
    timer.update(timestamp);

    const delta = Math.min(timer.getDelta(), 0.1);
    const secondRead = timer.getDelta();
    const elapsed = timer.getElapsed();

    pivot.rotation.y += delta * 1.35;
    mesh.rotation.x += delta * 0.8;
    mesh.position.y = Math.sin(elapsed * 2.2) * state.amplitude;

    writeText('delta-state', formatMilliseconds(delta));
    writeText('elapsed-state', formatSeconds(elapsed));
    writeText('second-read-state', `${formatMilliseconds(secondRead)}，同帧稳定`);
    writeText('timescale-state', formatNumber(state.timescale));
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
