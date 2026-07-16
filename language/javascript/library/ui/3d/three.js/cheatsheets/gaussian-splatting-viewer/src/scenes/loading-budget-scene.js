/*
 * 本示例演示什么：
 * 模拟 splat 文件的下载、解码、失败 fallback 和预算估算，不下载外部模型。
 * 读代码先看哪里：
 * 先看 calculateBudget() 的粗略预算，再看 startMockLoad() 如何把进度映射到 Points.drawRange。
 * 页面控件对应哪些关键状态：
 * 文件格式和每 splat 字节影响网络体积；splat 数量影响解码、GPU buffer 和排序索引；DPR 影响片元填充压力。
 * 预期观察什么：
 * 网络进度结束不等于可交互；大文件还要经历解码、排序和上传；失败时应落到可读 fallback。
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
  formatBytes,
  formatRenderInfo,
  seededRandom,
  startFrameLoop
} from '../shared-stage.js';
import { bindButton, bindRange, bindSelect, setProgress, writeText } from '../shared-ui.js';

const formatDefaults = {
  ply: { bytes: 72, label: '.ply：通用但偏大，适合源数据或转换入口' },
  splat: { bytes: 32, label: '.splat：常见紧凑二进制 viewer 数据' },
  ksplat: { bytes: 20, label: '.ksplat：预处理/压缩 viewer 格式，版本要跟工具链一致' }
};

export function createLoadingBudgetLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#171b22' });
  const scene = createScene('#171b22');
  const camera = createCamera({ position: [4.2, 2.8, 6.3], target: [0, 0.1, 0], fov: 44 });
  const controls = createControls(camera, canvas, { target: [0, 0.1, 0], minDistance: 3.2, maxDistance: 12 });
  const state = {
    format: 'splat',
    count: 500000,
    bytesPerSplat: 32,
    bandwidth: 8,
    dpr: 1.5,
    phase: 'idle',
    progress: 0,
    failRequested: false
  };
  const visual = createProgressVisual();
  let frameId = 0;
  let loadStartedAt = 0;
  let loadDuration = 3200;

  scene.add(createGrid({ size: 7, divisions: 14, y: -1.12 }), visual.group);

  bindSelect('format-kind', (value) => {
    state.format = value;
    state.bytesPerSplat = formatDefaults[value].bytes;
    document.getElementById('bytes-per-splat').value = String(state.bytesPerSplat);
    document.getElementById('bytes-per-splat-value').textContent = String(state.bytesPerSplat);
    resetLoad();
  });

  bindSelect('budget-count', (value) => {
    state.count = Number(value);
    resetLoad();
  });

  bindRange('bytes-per-splat', (value) => {
    state.bytesPerSplat = value;
    resetLoad();
  }, { format: (value) => `${value.toFixed(0)} B` });

  bindSelect('bandwidth', (value) => {
    state.bandwidth = Number(value);
    writeState();
  });

  bindRange('dpr-limit', (value) => {
    state.dpr = value;
    writeState();
  }, { format: (value) => value.toFixed(1) });

  bindButton('start-load', () => startMockLoad(false));
  bindButton('fail-load', () => startMockLoad(true));
  bindButton('reset-load', resetLoad);

  function startMockLoad(shouldFail) {
    cancelAnimationFrame(frameId);
    state.phase = 'download';
    state.progress = 0;
    state.failRequested = shouldFail;
    loadStartedAt = performance.now();
    loadDuration = getMockDuration();
    visual.fallback.visible = false;
    setVisualProgress(0);
    tickLoad();
  }

  function tickLoad() {
    const elapsed = performance.now() - loadStartedAt;
    const progress = Math.min(elapsed / loadDuration, 1);

    if (state.failRequested && progress > 0.58) {
      state.phase = 'failed';
      state.progress = progress;
      visual.fallback.visible = true;
      setVisualProgress(0.18);
      writeState();
      return;
    }

    state.progress = progress;
    state.phase = getPhase(progress);
    setVisualProgress(progress);
    writeState();

    if (progress < 1) {
      frameId = requestAnimationFrame(tickLoad);
      return;
    }

    state.phase = 'ready';
    state.progress = 1;
    writeState();
  }

  function resetLoad() {
    cancelAnimationFrame(frameId);
    state.phase = 'idle';
    state.progress = 0;
    state.failRequested = false;
    visual.fallback.visible = false;
    setVisualProgress(0);
    writeState();
  }

  function setVisualProgress(progress) {
    const visibleCount = Math.max(1, Math.floor(visual.maxVisible * progress));
    visual.geometry.setDrawRange(0, visibleCount);
    visual.points.rotation.y = progress * Math.PI * 0.22;
    setProgress('progress-bar', progress);
  }

  function getMockDuration() {
    const budget = calculateBudget(state);
    const networkSeconds = budget.fileBytes / (state.bandwidth * 1024 * 1024);
    return THREE.MathUtils.clamp(networkSeconds * 650 + 1400, 2200, 8200);
  }

  function writeState() {
    const budget = calculateBudget(state);
    const phaseText = {
      idle: '未开始',
      download: '下载中',
      decode: '解码和转换中',
      upload: '上传 GPU buffer',
      ready: '可交互',
      failed: '失败，显示 fallback'
    }[state.phase];

    writeText('progress-state', `${phaseText}；${Math.round(state.progress * 100)}%`);
    writeText('budget-state', `文件=${formatBytes(budget.fileBytes)}
解码峰值≈${formatBytes(budget.decodeBytes)}
GPU buffer≈${formatBytes(budget.gpuBytes)}
排序索引≈${formatBytes(budget.sortBytes)}
估算合计≈${formatBytes(budget.totalBytes)}`);
    writeText('load-state', `${formatDefaults[state.format].label}
网络=${state.bandwidth} MB/s；DPR=${state.dpr.toFixed(1)}；${formatRenderInfo(renderer)}`);
    writeText('advice-state', makeAdvice(budget, state));
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    getPixelRatioLimit: () => state.dpr,
    onFrame(elapsed) {
      visual.group.rotation.y = Math.sin(elapsed * 0.26) * 0.18;
      visual.placeholder.rotation.y = elapsed * 0.12;
    },
    render() {
      renderer.render(scene, camera);
    }
  });

  resetLoad();

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(frameId);
    stop();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createProgressVisual() {
  const group = new THREE.Group();
  const maxVisible = 2400;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxVisible * 3);
  const colors = new Float32Array(maxVisible * 3);
  const random = seededRandom(611);
  const colorA = new THREE.Color('#d77b42');
  const colorB = new THREE.Color('#59b287');
  const colorC = new THREE.Color('#6685d9');
  const color = new THREE.Color();

  for (let index = 0; index < maxVisible; index += 1) {
    const angle = index * 2.399963;
    const radius = Math.sqrt(random()) * 1.8;
    const y = (random() - 0.5) * 1.1 + Math.sin(index * 0.03) * 0.1;
    const offset = index * 3;

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = y;
    positions[offset + 2] = Math.sin(angle) * radius;

    color.copy(colorA).lerp(colorB, random()).lerp(colorC, Math.max(0, y) * 0.32);
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setDrawRange(0, 1);
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    size: 5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 2, 3.8, 4, 2, 4),
    new THREE.MeshBasicMaterial({ color: '#f0d9a7', wireframe: true, transparent: true, opacity: 0.22 })
  );
  const fallback = createLabel('fallback', [0, 1.42, 0], { scale: [1.45, 0.4, 1] });
  fallback.visible = false;
  group.add(placeholder, points, fallback);

  return { group, geometry, points, placeholder, fallback, maxVisible };
}

function calculateBudget(state) {
  const fileBytes = state.count * state.bytesPerSplat;
  const decodeMultiplier = state.format === 'ksplat' ? 1.9 : state.format === 'splat' ? 1.35 : 1.18;
  const decodeBytes = fileBytes * decodeMultiplier;
  const gpuBytes = state.count * 56;
  const sortBytes = state.count * 8;
  const totalBytes = fileBytes + decodeBytes + gpuBytes + sortBytes;
  return { fileBytes, decodeBytes, gpuBytes, sortBytes, totalBytes };
}

function getPhase(progress) {
  if (progress < 0.66) {
    return 'download';
  }

  if (progress < 0.86) {
    return 'decode';
  }

  if (progress < 1) {
    return 'upload';
  }

  return 'ready';
}

function makeAdvice(budget, state) {
  const advice = [];

  if (state.count >= 1000000) {
    advice.push('准备低密度资源或分块加载');
  }

  if (budget.totalBytes > 300 * 1024 * 1024) {
    advice.push('移动端先压缩、降采样或改成封面 fallback');
  }

  if (state.dpr > 1.6) {
    advice.push('透明 overdraw 场景优先限制 DPR');
  }

  if (state.format === 'ply') {
    advice.push('.ply 更适合源数据，交付前考虑转换');
  }

  return advice.length > 0 ? advice.join('；') : '预算温和，仍需在真实设备验证排序和峰值内存';
}
