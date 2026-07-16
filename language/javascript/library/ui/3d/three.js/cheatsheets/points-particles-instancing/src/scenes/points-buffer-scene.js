/*
 * 本示例演示什么：
 * 一个 THREE.Points 使用一份 BufferGeometry，在一次 draw call 中绘制大量点。
 * 读代码先看哪里：
 * 先看 createPointCloudGeometry() 里 position/color/aSeed 三个 attribute，再看 rebuildPoints() 如何替换 geometry。
 * 控件对应哪些 API：
 * 点数量与分布形态 -> 重新创建 BufferGeometry；点大小 -> PointsMaterial.size；透视缩放 -> PointsMaterial.sizeAttenuation。
 * 预期观察什么：
 * 点数量会改变 renderer.info.render.points，但 draw call 仍保持 1；attribute 只是数据通道，不等于多个对象。
 */

import * as THREE from 'three';
import {
  createCamera,
  createControls,
  createGrid,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatRenderInfo,
  seededRandom,
  startFrameLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';

export function createPointsBufferLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [4.8, 3, 6.4], target: [0, 0.15, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0.15, 0], minDistance: 3, maxDistance: 12 });
  const material = new THREE.PointsMaterial({
    size: 4,
    sizeAttenuation: true,
    vertexColors: true
  });
  const state = {
    count: 3200,
    shape: 'sphere',
    rotate: true
  };
  let points = new THREE.Points(createPointCloudGeometry(state.count, state.shape), material);

  scene.add(createGrid({ y: -1.45 }), points);

  bindSelect('point-count', (value) => {
    state.count = Number(value);
    rebuildPoints();
  });

  bindSelect('cloud-shape', (value) => {
    state.shape = value;
    rebuildPoints();
  });

  bindRange('point-size', (value) => {
    material.size = value;
    writeState();
  }, { format: (value) => value.toFixed(1) });

  bindCheckbox('size-attenuation', (enabled) => {
    material.sizeAttenuation = enabled;
    material.needsUpdate = true;
    writeState();
  });

  function rebuildPoints() {
    const oldGeometry = points.geometry;
    points.geometry = createPointCloudGeometry(state.count, state.shape);
    oldGeometry.dispose();
    writeState();
  }

  function writeState() {
    const position = points.geometry.getAttribute('position');
    const color = points.geometry.getAttribute('color');
    const seed = points.geometry.getAttribute('aSeed');

    writeText('attribute-state', `position: itemSize=${position.itemSize}, count=${position.count}
color: itemSize=${color.itemSize}, count=${color.count}
aSeed: itemSize=${seed.itemSize}, count=${seed.count}`);
    writeText('observe-state', `当前只有 1 个 THREE.Points；sizeAttenuation=${material.sizeAttenuation}`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      points.rotation.y = elapsed * 0.13;
      points.rotation.x = Math.sin(elapsed * 0.21) * 0.12;
    },
    render() {
      renderer.render(scene, camera);
      writeText('draw-state', formatRenderInfo(renderer));
    }
  });

  writeState();

  window.addEventListener('beforeunload', () => {
    stop();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createPointCloudGeometry(count, shape) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const random = seededRandom(count * 17 + shape.length * 101);
  const innerColor = new THREE.Color('#45b3a7');
  const outerColor = new THREE.Color('#f08a4b');
  const highColor = new THREE.Color('#7c9cff');
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const positionOffset = index * 3;
    const seed = random();
    const point = getPointPosition(index, count, shape, random);
    const heightMix = THREE.MathUtils.clamp((point.y + 1.8) / 3.6, 0, 1);
    const radiusMix = THREE.MathUtils.clamp(point.length() / 2.3, 0, 1);

    positions[positionOffset] = point.x;
    positions[positionOffset + 1] = point.y;
    positions[positionOffset + 2] = point.z;
    seeds[index] = seed;

    color.copy(innerColor).lerp(outerColor, radiusMix).lerp(highColor, heightMix * 0.35);
    colors[positionOffset] = color.r;
    colors[positionOffset + 1] = color.g;
    colors[positionOffset + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function getPointPosition(index, count, shape, random) {
  if (shape === 'disk') {
    const angle = index * 2.399963 + random() * 0.28;
    const radius = Math.sqrt(random()) * 2.25;
    const arm = Math.sin(index * 0.031) * 0.26;
    return new THREE.Vector3(
      Math.cos(angle + arm) * radius,
      (random() - 0.5) * 0.36,
      Math.sin(angle + arm) * radius
    );
  }

  if (shape === 'wave') {
    const side = Math.ceil(Math.sqrt(count));
    const x = ((index % side) / (side - 1) - 0.5) * 4.4;
    const z = (Math.floor(index / side) / (side - 1) - 0.5) * 4.4;
    const y = Math.sin(x * 2.2) * 0.32 + Math.cos(z * 2.6) * 0.26 + (random() - 0.5) * 0.05;
    return new THREE.Vector3(x, y, z);
  }

  const theta = random() * Math.PI * 2;
  const phi = Math.acos(2 * random() - 1);
  const radius = Math.cbrt(random()) * 2.05;
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * radius,
    Math.cos(phi) * radius,
    Math.sin(phi) * Math.sin(theta) * radius
  );
}
