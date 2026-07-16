/*
 * 本示例演示什么：
 * ShaderMaterial 可以在 vertex shader 中写 gl_PointSize，并在 fragment shader 中用 gl_PointCoord 把方形点切成圆点、光环或星芒。
 * 读代码先看哪里：
 * 先看 vertexShader 里的 gl_PointSize 和 aSeed/aScale，再看 fragmentShader 如何用 gl_PointCoord 计算 alpha。
 * 控件对应哪些 API：
 * 点大小/边缘柔和/时间速度 -> uniform；片元形状 -> uniform int uShapeMode；每点差异 -> BufferGeometry attribute。
 * 预期观察什么：
 * gl_PointSize 决定屏幕点块大小，gl_PointCoord 只在每个点块内部工作，不能改变真实几何或让点互相精确遮挡。
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
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

const pointCount = 760;
const shapeModes = {
  disc: 0,
  ring: 1,
  spark: 2
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPointSize;

  attribute float aSeed;
  attribute float aScale;
  attribute vec3 aTint;

  varying vec3 vTint;
  varying float vSeed;

  void main() {
    vTint = aTint;
    vSeed = aSeed;

    vec3 animated = position;
    animated.y += sin(uTime * 1.4 + aSeed * 18.0) * 0.18;
    animated.xz += vec2(cos(uTime * 0.7 + aSeed * 12.0), sin(uTime * 0.8 + aSeed * 14.0)) * 0.05;

    vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
    gl_PointSize = uPointSize * aScale * (260.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uSoftness;
  uniform int uShapeMode;

  varying vec3 vTint;
  varying float vSeed;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    float distanceToCenter = length(centered);
    float disc = 1.0 - smoothstep(0.5 - uSoftness, 0.5, distanceToCenter);
    float alpha = disc;

    if (uShapeMode == 1) {
      float ring = 1.0 - smoothstep(0.035, 0.035 + uSoftness, abs(distanceToCenter - 0.31));
      alpha = max(ring, disc * 0.18);
    } else if (uShapeMode == 2) {
      float angle = atan(centered.y, centered.x);
      float spokes = pow(abs(cos(angle * 4.0 + vSeed * 6.2831)), 18.0);
      float core = 1.0 - smoothstep(0.0, 0.22, distanceToCenter);
      alpha = max(core, spokes * disc);
    }

    if (alpha <= 0.01) {
      discard;
    }

    vec3 glow = vTint + vec3(0.22, 0.16, 0.08) * alpha;
    gl_FragColor = vec4(glow, alpha);
  }
`;

export function createShaderPointsLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [4.5, 2.9, 5.9], target: [0, 0.1, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0.1, 0], minDistance: 2.7, maxDistance: 11 });
  const uniforms = {
    uTime: { value: 0 },
    uPointSize: { value: 34 },
    uSoftness: { value: 0.08 },
    uShapeMode: { value: shapeModes.ring }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(createShaderPointGeometry(), material);
  const state = {
    timeSpeed: 1,
    shapeName: 'ring'
  };

  scene.add(createGrid({ y: -1.25 }), points);

  bindSelect('shape-mode', (value) => {
    state.shapeName = value;
    uniforms.uShapeMode.value = shapeModes[value];
    writeState();
  });

  bindRange('shader-size', (value) => {
    uniforms.uPointSize.value = value;
    writeState();
  }, { format: (value) => value.toFixed(0) });

  bindRange('softness', (value) => {
    uniforms.uSoftness.value = value;
    writeState();
  }, { format: (value) => value.toFixed(2) });

  bindRange('time-speed', (value) => {
    state.timeSpeed = value;
    writeState();
  });

  function writeState() {
    writeText('uniform-state', `uPointSize=${uniforms.uPointSize.value}
uSoftness=${uniforms.uSoftness.value.toFixed(2)}
uShapeMode=${state.shapeName}
uTime=${uniforms.uTime.value.toFixed(2)}`);
    writeText('shader-state', `vertex: gl_PointSize；fragment: gl_PointCoord
render: ${formatRenderInfo(renderer)}`);
    writeText('observe-state', `形状变化来自片元 alpha；点的位置仍只是一批 position 顶点。`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      uniforms.uTime.value = elapsed * state.timeSpeed;
      points.rotation.y = elapsed * 0.08;
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

function createShaderPointGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointCount * 3);
  const seeds = new Float32Array(pointCount);
  const scales = new Float32Array(pointCount);
  const tints = new Float32Array(pointCount * 3);
  const random = seededRandom(2243);
  const colorA = new THREE.Color('#42ead2');
  const colorB = new THREE.Color('#ff9f5a');
  const colorC = new THREE.Color('#7b93ff');
  const tint = new THREE.Color();

  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3;
    const radius = 0.35 + Math.sqrt(random()) * 1.95;
    const angle = index * 2.399963 + random() * 0.12;
    const height = (random() - 0.5) * 1.7;
    const seed = random();

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = height;
    positions[offset + 2] = Math.sin(angle) * radius;
    seeds[index] = seed;
    scales[index] = 0.45 + random() * 1.25;

    tint.copy(colorA).lerp(colorB, seed).lerp(colorC, Math.max(0, height) * 0.26);
    tints[offset] = tint.r;
    tints[offset + 1] = tint.g;
    tints[offset + 2] = tint.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
