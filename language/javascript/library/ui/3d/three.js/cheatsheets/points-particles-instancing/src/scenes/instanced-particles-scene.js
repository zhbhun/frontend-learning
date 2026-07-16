/*
 * 本示例演示什么：
 * Points 适合大量屏幕点；InstancedMesh 适合大量共享 geometry/material、但需要独立旋转或真实小 mesh 的对象。
 * 读代码先看哪里：
 * 先看 createComparisonSet() 同时创建 THREE.Points 和 THREE.InstancedMesh，再看 updateInstanceMatrices() 如何写 instanceMatrix。
 * 控件对应哪些 API：
 * 数量 -> 重新创建 Points geometry 与 InstancedMesh；更新实例矩阵 -> setMatrixAt + instanceMatrix.needsUpdate；显示对象 -> object.visible。
 * 预期观察什么：
 * Points 增加 renderer.info.render.points；InstancedMesh 增加 triangles，但大量实例仍通常只是一批 draw call。
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
  seededRandom,
  startFrameLoop
} from '../shared-stage.js';
import { bindCheckbox, bindSelect, writeText } from '../shared-ui.js';

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const euler = new THREE.Euler();

export function createInstancedParticlesLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [4.9, 3.2, 6.6], target: [0, 0.2, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0.2, 0], minDistance: 3.2, maxDistance: 13 });
  const state = {
    count: 1000,
    visibleMode: 'both',
    animateInstances: true,
    rotatePoints: true,
    matrixUploads: 0
  };
  let comparison = createComparisonSet(state.count);

  scene.add(createGrid({ y: -1.35 }), comparison.group);

  bindSelect('visible-mode', (value) => {
    state.visibleMode = value;
    applyVisibility();
  });

  bindSelect('particle-count', (value) => {
    state.count = Number(value);
    rebuildComparison();
  });

  bindCheckbox('animate-instances', (enabled) => {
    state.animateInstances = enabled;
    writeState();
  });

  bindCheckbox('rotate-points', (enabled) => {
    state.rotatePoints = enabled;
    writeState();
  });

  function rebuildComparison() {
    scene.remove(comparison.group);
    disposeObjectTree(comparison.group);
    comparison = createComparisonSet(state.count);
    scene.add(comparison.group);
    state.matrixUploads = 0;
    applyVisibility();
  }

  function applyVisibility() {
    comparison.points.visible = state.visibleMode !== 'instances';
    comparison.instanced.visible = state.visibleMode !== 'points';
    comparison.pointsLabel.visible = comparison.points.visible;
    comparison.instanceLabel.visible = comparison.instanced.visible;
    writeState();
  }

  function writeState() {
    writeText('render-state', `${formatRenderInfo(renderer)}
实例矩阵上传=${state.matrixUploads}`);
    writeText('tradeoff-state', `Points: 1 个 position 顶点 = 1 个屏幕点
InstancedMesh: 1 个 PlaneGeometry x ${state.count} 个实例`);
    writeText('observe-state', `Points 只能整体旋转或用 shader 改点；InstancedMesh 可以逐实例旋转、缩放和保留 mesh 形状。`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      if (state.rotatePoints) {
        comparison.points.rotation.y = elapsed * 0.18;
      }

      if (state.animateInstances) {
        updateInstanceMatrices(comparison.instanced, elapsed);
        state.matrixUploads += 1;
      }
    },
    render() {
      renderer.render(scene, camera);
      writeState();
    }
  });

  applyVisibility();

  window.addEventListener('beforeunload', () => {
    stop();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createComparisonSet(count) {
  const group = new THREE.Group();
  const points = createPointsCloud(count);
  const instanced = createInstancedQuads(count);
  const pointsLabel = createLabel('Points', [-1.65, 1.9, 0]);
  const instanceLabel = createLabel('InstancedMesh', [1.65, 1.9, 0]);

  group.add(points, instanced, pointsLabel, instanceLabel);
  return { group, points, instanced, pointsLabel, instanceLabel };
}

function createPointsCloud(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const random = seededRandom(409 + count);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const angle = index * 2.399963;
    const radius = 0.15 + Math.sqrt(random()) * 1.25;
    const height = (random() - 0.5) * 1.7;

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = height;
    positions[offset + 2] = Math.sin(angle) * radius;

    color.setHSL(0.48 + random() * 0.08, 0.82, 0.62);
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    size: 9,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  points.position.x = -1.65;
  return points;
}

function createInstancedQuads(count) {
  const geometry = new THREE.PlaneGeometry(0.08, 0.18);
  const material = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  const random = seededRandom(817 + count);
  const basePositions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const scales = new Float32Array(count);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const angle = index * 2.399963;
    const radius = 0.15 + Math.sqrt(random()) * 1.25;

    basePositions[offset] = 1.65 + Math.cos(angle) * radius;
    basePositions[offset + 1] = (random() - 0.5) * 1.7;
    basePositions[offset + 2] = Math.sin(angle) * radius;
    phases[index] = random() * Math.PI * 2;
    scales[index] = 0.75 + random() * 1.45;

    color.setHSL(0.03 + random() * 0.08, 0.86, 0.62);
    instanced.setColorAt(index, color);
  }

  instanced.userData.basePositions = basePositions;
  instanced.userData.phases = phases;
  instanced.userData.scales = scales;
  updateInstanceMatrices(instanced, 0);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  if (instanced.instanceColor) {
    instanced.instanceColor.needsUpdate = true;
  }

  return instanced;
}

function updateInstanceMatrices(instanced, time) {
  const { basePositions, phases, scales } = instanced.userData;

  for (let index = 0; index < instanced.count; index += 1) {
    const offset = index * 3;
    const phase = phases[index];
    const wobble = Math.sin(time * 1.6 + phase) * 0.1;

    position.set(basePositions[offset], basePositions[offset + 1] + wobble, basePositions[offset + 2]);
    euler.set(
      Math.sin(time * 0.9 + phase) * 0.55,
      time * 0.7 + phase,
      Math.cos(time * 1.1 + phase) * 0.8
    );
    quaternion.setFromEuler(euler);
    scale.setScalar(scales[index]);
    matrix.compose(position, quaternion, scale);
    instanced.setMatrixAt(index, matrix);
  }

  instanced.instanceMatrix.needsUpdate = true;
}
