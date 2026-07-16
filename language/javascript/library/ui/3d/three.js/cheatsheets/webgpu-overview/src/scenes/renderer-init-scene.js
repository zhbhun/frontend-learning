/*
本示例演示什么：
观察 WebGPURenderer 的初始化顺序，以及失败或不满足条件时如何退回 WebGLRenderer。

读代码先看哪里：
先看 mountRendererInitLesson()，它先做 secure context / navigator.gpu 判断，再尝试
import('three/webgpu')、new WebGPURenderer()、await renderer.init()。

页面控件对应哪些状态：
“强制使用 WebGLRenderer fallback”会跳过 WebGPU 路径，用传统 WebGLRenderer 创建同一类场景。

预期观察什么现象：
支持 WebGPU 时状态会显示 WebGPURenderer；不支持或初始化失败时仍能看到 WebGLRenderer 对照画面。
*/

import * as WebGLThree from 'three';
import { createBaseScene, createCamera, createGrid, disposeScene, syncRendererAndCamera, startLoop } from '../shared-stage.js';
import { formatError, formatSize } from '../shared-ui.js';

export async function mountRendererInitLesson(canvas, { forceWebGL = false, onStatus, onMetric } = {}) {
  const supportState = getSupportState();

  onMetric?.('support', supportState.label);

  if (!forceWebGL && supportState.canTryWebGPU) {
    try {
      onStatus?.('创建 WebGPURenderer，等待 await renderer.init()...');
      return await mountWebGPURenderer(canvas, { onStatus, onMetric });
    } catch (error) {
      onMetric?.('init', `WebGPU 初始化失败：${formatError(error)}`);
      onStatus?.('WebGPU 初始化失败，已切换到 WebGLRenderer fallback。', 'warn');
      return mountWebGLRenderer(canvas, { onStatus, onMetric, reason: 'WebGPU 初始化失败' });
    }
  }

  const reason = forceWebGL ? '用户强制 fallback' : supportState.label;
  onStatus?.(`使用 WebGLRenderer fallback：${reason}`, forceWebGL ? 'warn' : 'ok');
  return mountWebGLRenderer(canvas, { onStatus, onMetric, reason });
}

async function mountWebGPURenderer(canvas, { onStatus, onMetric }) {
  const THREE = await import('three/webgpu');
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  await renderer.init();

  const { scene, camera, mesh } = createSpinnerScene(THREE, '#2f83d8');

  onMetric?.('renderer', 'WebGPURenderer');
  onMetric?.('init', renderer.initialized ? '已完成 await renderer.init()' : '未初始化');
  onStatus?.('WebGPURenderer 已初始化，render() 可以安全调用。');

  const stop = startLoop((time, delta) => {
    const size = syncRendererAndCamera(renderer, camera, canvas);
    mesh.rotation.x += delta * 0.35;
    mesh.rotation.y += delta * 0.7;
    mesh.position.y = Math.sin(time * 1.4) * 0.08;
    renderer.render(scene, camera);
    onMetric?.('size', formatSize(size));
  });

  return () => {
    stop();
    disposeScene(scene);
    renderer.dispose();
  };
}

function mountWebGLRenderer(canvas, { onStatus, onMetric, reason }) {
  const renderer = new WebGLThree.WebGLRenderer({
    canvas,
    antialias: true
  });

  renderer.outputColorSpace = WebGLThree.SRGBColorSpace;
  renderer.setClearColor('#101827', 1);

  const { scene, camera, mesh } = createSpinnerScene(WebGLThree, '#e07a5f');

  onMetric?.('renderer', 'WebGLRenderer');
  onMetric?.('init', `同步创建，无 await init；原因：${reason}`);
  onStatus?.('WebGLRenderer fallback 正在渲染对照画面。');

  const stop = startLoop((time, delta) => {
    const size = syncRendererAndCamera(renderer, camera, canvas);
    mesh.rotation.x += delta * 0.35;
    mesh.rotation.y += delta * 0.7;
    mesh.position.y = Math.sin(time * 1.4) * 0.08;
    renderer.render(scene, camera);
    onMetric?.('size', formatSize(size));
  });

  return () => {
    stop();
    disposeScene(scene);
    renderer.dispose();
  };
}

function createSpinnerScene(THREE, color) {
  const scene = createBaseScene(THREE);
  const camera = createCamera(THREE);
  const geometry = new THREE.TorusKnotGeometry(0.72, 0.22, 96, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.18,
    roughness: 0.42
  });
  const mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh, createGrid(THREE));
  return { scene, camera, mesh };
}

function getSupportState() {
  if (!window.isSecureContext) {
    return {
      canTryWebGPU: false,
      label: '不是 secure context，跳过 WebGPU 初始化'
    };
  }

  if (!navigator.gpu) {
    return {
      canTryWebGPU: false,
      label: 'navigator.gpu 不存在，跳过 WebGPU 初始化'
    };
  }

  return {
    canTryWebGPU: true,
    label: '具备 WebGPU 检测入口，可以尝试初始化'
  };
}
