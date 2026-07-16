/*
 * 本示例演示什么：
 * ShaderMaterial 的 uniform 如何由 JavaScript 写入 shader，用同一个平面观察颜色、时间、分辨率和指针位置。
 * 读代码先看哪里：
 * 先看 uniforms 对象，再看 vertexShader 里 three.js 自动提供的 position / uv / projectionMatrix / modelViewMatrix。
 * 控件对应哪些 API：
 * 主色 / 辅色 -> uniforms.uBaseColor / uAccentColor；时间速度 -> uTime 的增长；画布尺寸 -> uResolution；鼠标移动 -> uPointer。
 * 预期观察什么：
 * 改颜色会立即改变片元颜色；改时间速度会改变动画节奏；移动鼠标会让亮点位置跟随指针。
 */

import * as THREE from 'three';
import {
  createCamera,
  createControls,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatNumber,
  formatSize,
  getPointerUv,
  startFrameLoop
} from '../shared-stage.js';
import { bindColor, bindRange, writeText } from '../shared-ui.js';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec3 uBaseColor;
  uniform vec3 uAccentColor;

  varying vec2 vUv;

  void main() {
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 centeredUv = (vUv - 0.5) * aspect;
    vec2 pointerUv = (uPointer - 0.5) * aspect;

    float wave = 0.5 + 0.5 * sin((centeredUv.x * 8.0) + uTime * 2.2);
    float pointerGlow = smoothstep(0.32, 0.0, distance(centeredUv, pointerUv));
    vec3 color = mix(uBaseColor, uAccentColor, wave * 0.72 + pointerGlow * 0.28);

    gl_FragColor = vec4(color + pointerGlow * 0.18, 1.0);
  }
`;

export function createUniformColorLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [0, 0, 4.4], target: [0, 0, 0], fov: 42 });
  const controls = createControls(camera, canvas, { minDistance: 3.2, maxDistance: 6 });
  const pointer = new THREE.Vector2(0.5, 0.5);
  const state = {
    timeSpeed: 1
  };
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: pointer },
    uBaseColor: { value: new THREE.Color('#2f83d8') },
    uAccentColor: { value: new THREE.Color('#f08a4b') }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.25, 1, 1), material);

  scene.add(mesh);

  canvas.addEventListener('pointermove', (event) => {
    getPointerUv(event, canvas, pointer);
    writeState();
  });

  bindColor('base-color', (value) => {
    // uniform 里的 Color 对象可以复用；改 value 不需要 material.needsUpdate。
    uniforms.uBaseColor.value.set(value);
    writeState();
  });

  bindColor('accent-color', (value) => {
    uniforms.uAccentColor.value.set(value);
    writeState();
  });

  bindRange('time-speed', (value) => {
    state.timeSpeed = value;
    writeState();
  });

  function writeState(size) {
    writeText('uniform-state', `uTime=${formatNumber(uniforms.uTime.value)}；主色=${uniforms.uBaseColor.value.getHexString()}；辅色=${uniforms.uAccentColor.value.getHexString()}`);
    writeText('resolution-state', size ? formatSize(size) : `${uniforms.uResolution.value.x} x ${uniforms.uResolution.value.y}`);
    writeText('pointer-state', `uPointer=(${formatNumber(pointer.x)}, ${formatNumber(pointer.y)})`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed, size) {
      uniforms.uTime.value = elapsed * state.timeSpeed;
      uniforms.uResolution.value.set(size.drawingWidth, size.drawingHeight);
      writeState(size);
    },
    render() {
      renderer.render(scene, camera);
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
