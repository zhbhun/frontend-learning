/*
 * 本示例演示什么：
 * vertex shader 根据 uniform 计算波浪，把平面顶点沿 z 方向推开，再把高度用 varying 交给 fragment shader 上色。
 * 读代码先看哪里：
 * 先看 vertexShader 中 displacedPosition.z 的计算，再看 fragmentShader 如何读取 vHeight。
 * 控件对应哪些 API：
 * 振幅 -> uAmplitude；频率 -> uFrequency；速度 -> uSpeed；线框 -> material.wireframe。
 * 预期观察什么：
 * 振幅越大顶点位移越明显；频率越高波峰更密；线框能直接看见 PlaneGeometry 分段被 shader 推动。
 */

import * as THREE from 'three';
import {
  createCamera,
  createControls,
  createGrid,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatNumber,
  startFrameLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uSpeed;

  varying float vHeight;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec3 displacedPosition = position;
    float waveA = sin((position.x * uFrequency) + (uTime * uSpeed * 2.0));
    float waveB = cos((position.y * uFrequency * 1.4) - (uTime * uSpeed * 1.35));
    float height = (waveA + waveB) * 0.5;

    displacedPosition.z += height * uAmplitude;
    vHeight = height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying vec2 vUv;

  void main() {
    vec3 lowColor = vec3(0.10, 0.30, 0.45);
    vec3 highColor = vec3(0.95, 0.48, 0.24);
    float band = smoothstep(-0.7, 0.85, vHeight);
    vec3 color = mix(lowColor, highColor, band);
    float gridLine = smoothstep(0.018, 0.0, abs(fract(vUv.x * 12.0) - 0.5));

    gl_FragColor = vec4(color + gridLine * 0.08, 1.0);
  }
`;

export function createVertexDisplacementLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [3.3, 2.8, 4.2], target: [0, 0, 0] });
  const controls = createControls(camera, canvas, { minDistance: 2.8, maxDistance: 8 });
  const uniforms = {
    uTime: { value: 0 },
    uAmplitude: { value: 0.26 },
    uFrequency: { value: 2.4 },
    uSpeed: { value: 1 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    wireframe: true
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.6, 96, 72), material);

  mesh.rotation.x = -Math.PI / 3.2;
  scene.add(createGrid({ y: -1.18 }), mesh);

  bindRange('amplitude', (value) => {
    uniforms.uAmplitude.value = value;
    writeState();
  });

  bindRange('frequency', (value) => {
    uniforms.uFrequency.value = value;
    writeState();
  });

  bindRange('speed', (value) => {
    uniforms.uSpeed.value = value;
    writeState();
  });

  bindCheckbox('wireframe', (checked) => {
    // wireframe 属于材质渲染状态；这里作为观察网格分段的开关使用。
    material.wireframe = checked;
    writeState();
  });

  function writeState() {
    writeText('vertex-state', `position.z += height * ${formatNumber(uniforms.uAmplitude.value)}；frequency=${formatNumber(uniforms.uFrequency.value)}`);
    writeText('fragment-state', `vHeight 插值后混合低色/高色；wireframe=${material.wireframe}`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      uniforms.uTime.value = elapsed;
      writeState();
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
