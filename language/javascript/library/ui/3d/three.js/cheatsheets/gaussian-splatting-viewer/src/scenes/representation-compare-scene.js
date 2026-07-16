/*
 * 本示例演示什么：
 * 用同一团空间分布对比 mesh、THREE.Points 和 billboard splat mock 的表达差异。
 * 读代码先看哪里：
 * 先看 createPointGeometry()、createSplatInstancedMesh() 和 createMeshIsland()，它们分别代表三种数据组织方式。
 * 页面控件对应哪些关键状态：
 * splat 数量会重建 Points 和 InstancedMesh；billboard 尺寸影响软椭圆覆盖面积；Points 点径影响屏幕点块大小。
 * 预期观察什么：
 * mesh 有三角形表面，Points 只有点位置，splat mock 是很多面向相机的半透明椭圆；真实 3DGS viewer 还需要格式解码和排序。
 */

import * as THREE from 'three';
import {
  addBaseLights,
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
import { bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';
import {
  createSplatBillboardMaterial,
  createSplatInstancedMesh,
  generateSplatRecords,
  updateSplatBillboards
} from '../splat-mock.js';

export function createRepresentationCompareLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#161a21' });
  const scene = createScene('#161a21');
  const camera = createCamera({ position: [5.8, 3.2, 8], target: [0, 0.1, 0], fov: 43 });
  const controls = createControls(camera, canvas, { target: [0, 0.1, 0], minDistance: 5, maxDistance: 15 });
  const state = {
    count: 180,
    splatScale: 1,
    pointSize: 5,
    rotate: true
  };

  addBaseLights(scene);
  scene.add(createGrid({ size: 11, divisions: 22, y: -1.45 }));

  const root = new THREE.Group();
  const meshSlot = new THREE.Group();
  const pointsSlot = new THREE.Group();
  const splatSlot = new THREE.Group();
  meshSlot.position.x = -3.6;
  pointsSlot.position.x = 0;
  splatSlot.position.x = 3.6;
  root.add(meshSlot, pointsSlot, splatSlot);
  scene.add(root);

  meshSlot.add(createMeshIsland(), createLabel('mesh / glTF', [0, -1.1, 0]));
  pointsSlot.add(createLabel('Points', [0, -1.1, 0]));
  splatSlot.add(createLabel('splat mock', [0, -1.1, 0]));

  const pointMaterial = new THREE.PointsMaterial({
    size: state.pointSize,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: true
  });
  const splatMaterial = createSplatBillboardMaterial({ opacity: 0.64, alphaTest: 0.015, depthWrite: false });
  let records = [];
  let points = null;
  let splats = null;

  bindSelect('splat-count', (value) => {
    state.count = Number(value);
    rebuildSamples();
  });

  bindRange('splat-scale', (value) => {
    state.splatScale = value;
    writeState();
  }, { format: (value) => value.toFixed(2) });

  bindRange('point-size', (value) => {
    state.pointSize = value;
    pointMaterial.size = value;
    writeState();
  }, { format: (value) => value.toFixed(1) });

  bindCheckbox('auto-rotate', (enabled) => {
    state.rotate = enabled;
    writeState();
  });

  function rebuildSamples() {
    if (points) {
      pointsSlot.remove(points);
      points.geometry.dispose();
    }

    if (splats) {
      splatSlot.remove(splats);
      splats.geometry.dispose();
    }

    records = generateSplatRecords(state.count, { seed: 41, radius: 1.25, flatten: 0.78 });
    points = new THREE.Points(createPointGeometry(records), pointMaterial);
    splats = createSplatInstancedMesh(records, splatMaterial);
    pointsSlot.add(points);
    splatSlot.add(splats);
    writeState();
  }

  function writeState() {
    writeText('representation-state', `mesh: 三角形表面
Points: position/color attribute
splat mock: ${state.count} 个 billboard 椭圆`);
    writeText('observe-state', `billboard 尺寸=${state.splatScale.toFixed(2)}；Points 点径=${state.pointSize.toFixed(1)}
真实 3DGS 还会多出 scale/rotation/opacity/SH 和排序管线`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      if (state.rotate) {
        root.rotation.y = Math.sin(elapsed * 0.35) * 0.14;
      }

      if (splats) {
        updateSplatBillboards(splats, records, camera, {
          scaleMultiplier: state.splatScale,
          elapsed,
          wobble: 0.015
        });
      }
    },
    render() {
      renderer.render(scene, camera);
      writeText('render-state', formatRenderInfo(renderer));
    }
  });

  rebuildSamples();

  window.addEventListener('beforeunload', () => {
    stop();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createPointGeometry(records) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(records.length * 3);
  const colors = new Float32Array(records.length * 3);

  records.forEach((record, index) => {
    const offset = index * 3;
    positions[offset] = record.position.x;
    positions[offset + 1] = record.position.y;
    positions[offset + 2] = record.position.z;
    colors[offset] = record.color.r;
    colors[offset + 1] = record.color.g;
    colors[offset + 2] = record.color.b;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function createMeshIsland() {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1.12, 3);
  const material = new THREE.MeshStandardMaterial({
    color: '#d88b45',
    roughness: 0.48,
    metalness: 0.08
  });
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: '#fff4d6',
    wireframe: true,
    transparent: true,
    opacity: 0.26
  });
  const mesh = new THREE.Mesh(geometry, material);
  const wire = new THREE.Mesh(geometry, wireMaterial);

  mesh.scale.set(1, 0.72, 1.15);
  wire.scale.copy(mesh.scale).multiplyScalar(1.002);
  group.add(mesh, wire);

  const random = seededRandom(205);
  const pebbleGeometry = new THREE.BoxGeometry(0.24, 0.24, 0.24, 2, 2, 2);
  const pebbleMaterial = new THREE.MeshStandardMaterial({ color: '#5fa789', roughness: 0.62 });

  for (let index = 0; index < 9; index += 1) {
    const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
    pebble.position.set((random() - 0.5) * 1.7, -0.92 + random() * 0.16, (random() - 0.5) * 1.7);
    pebble.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    pebble.scale.setScalar(0.55 + random() * 0.65);
    group.add(pebble);
  }

  return group;
}
