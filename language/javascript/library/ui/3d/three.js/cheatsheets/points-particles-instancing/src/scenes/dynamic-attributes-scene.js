/*
 * 本示例演示什么：
 * 粒子常把 position/color/size 放在 BufferAttribute 中；改 TypedArray 后必须设置 needsUpdate 才会重新上传到 GPU。
 * 读代码先看哪里：
 * 先看 createDynamicPointGeometry() 创建 position/aColor/aSize，再看 updateAttributes() 直接改 attribute.array。
 * 控件对应哪些 API：
 * 上传 position/color/aSize -> 对应 attribute.needsUpdate；基础点径 -> uniforms.uBaseSize；动画速度 -> uniforms.uTime 的推进速度。
 * 预期观察什么：
 * 关闭某个上传开关后，CPU 数组仍在变化，但对应的画面变化会停在上一次上传的状态。
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
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

const pointCount = 820;

const vertexShader = /* glsl */ `
  uniform float uBaseSize;

  attribute vec3 aColor;
  attribute float aSize;

  varying vec3 vColor;

  void main() {
    vColor = aColor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uBaseSize * aSize * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 pointUv = gl_PointCoord - 0.5;
    float alpha = 1.0 - smoothstep(0.34, 0.5, length(pointUv));

    if (alpha <= 0.01) {
      discard;
    }

    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function createDynamicAttributesLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [4.2, 2.8, 5.6], target: [0, 0, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0, 0], minDistance: 2.8, maxDistance: 11 });
  const geometry = createDynamicPointGeometry();
  const uniforms = {
    uBaseSize: { value: 18 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  const state = {
    speed: 1,
    uploadPosition: true,
    uploadColor: true,
    uploadSize: true,
    uploadCounts: {
      position: 0,
      color: 0,
      size: 0
    }
  };

  scene.add(createGrid({ y: -1.35 }), points);

  bindRange('motion-speed', (value) => {
    state.speed = value;
    writeState();
  });

  bindRange('base-size', (value) => {
    uniforms.uBaseSize.value = value;
    writeState();
  }, { format: (value) => value.toFixed(0) });

  bindCheckbox('upload-position', (enabled) => {
    state.uploadPosition = enabled;
    writeState();
  });

  bindCheckbox('upload-color', (enabled) => {
    state.uploadColor = enabled;
    writeState();
  });

  bindCheckbox('upload-size', (enabled) => {
    state.uploadSize = enabled;
    writeState();
  });

  function writeState() {
    const position = geometry.getAttribute('position');
    const color = geometry.getAttribute('aColor');
    const size = geometry.getAttribute('aSize');

    writeText('update-state', `position=${state.uploadPosition} (${state.uploadCounts.position})
aColor=${state.uploadColor} (${state.uploadCounts.color})
aSize=${state.uploadSize} (${state.uploadCounts.size})`);
    writeText('attribute-state', `position itemSize=${position.itemSize}；aColor itemSize=${color.itemSize}；aSize itemSize=${size.itemSize}
usage=${position.usage === THREE.DynamicDrawUsage ? 'DynamicDrawUsage' : position.usage}
render: ${formatRenderInfo(renderer)}`);
    writeText('observe-state', `关闭上传后，TypedArray 继续写入，但 GPU buffer 不会收到这一类新数据。`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      updateAttributes(geometry, elapsed * state.speed, state);
      points.rotation.y = elapsed * 0.09;
    },
    render() {
      renderer.render(scene, camera);
      writeState();
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createDynamicPointGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const sizes = new Float32Array(pointCount);
  const phases = new Float32Array(pointCount);
  const basePositions = new Float32Array(pointCount * 3);
  const random = seededRandom(1049);

  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3;
    const angle = index * 2.399963;
    const radius = 0.28 + Math.sqrt(random()) * 1.95;
    const y = (random() - 0.5) * 1.65;

    basePositions[offset] = Math.cos(angle) * radius;
    basePositions[offset + 1] = y;
    basePositions[offset + 2] = Math.sin(angle) * radius;
    phases[index] = random() * Math.PI * 2;
    sizes[index] = 0.8 + random() * 0.9;
  }

  positions.set(basePositions);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.userData.basePositions = basePositions;
  geometry.userData.phases = phases;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.7);
  return geometry;
}

function updateAttributes(geometry, time, state) {
  const positionAttribute = geometry.getAttribute('position');
  const colorAttribute = geometry.getAttribute('aColor');
  const sizeAttribute = geometry.getAttribute('aSize');
  const positions = positionAttribute.array;
  const colors = colorAttribute.array;
  const sizes = sizeAttribute.array;
  const { basePositions, phases } = geometry.userData;

  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3;
    const phase = phases[index];
    const wave = Math.sin(time * 1.8 + phase);
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + phase * 1.7);

    positions[offset] = basePositions[offset] + Math.sin(time + phase) * 0.1;
    positions[offset + 1] = basePositions[offset + 1] + wave * 0.32;
    positions[offset + 2] = basePositions[offset + 2] + Math.cos(time * 0.8 + phase) * 0.1;

    colors[offset] = 0.18 + pulse * 0.32;
    colors[offset + 1] = 0.52 + (1 - pulse) * 0.34;
    colors[offset + 2] = 0.78 + wave * 0.12;

    sizes[index] = 0.65 + pulse * 1.25;
  }

  if (state.uploadPosition) {
    positionAttribute.needsUpdate = true;
    state.uploadCounts.position += 1;
  }

  if (state.uploadColor) {
    colorAttribute.needsUpdate = true;
    state.uploadCounts.color += 1;
  }

  if (state.uploadSize) {
    sizeAttribute.needsUpdate = true;
    state.uploadCounts.size += 1;
  }
}
