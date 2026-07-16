/*
 * 本示例演示什么：
 * vertex shader 读取 uv、position 和 normal，写入 varying；fragment shader 接收的是已经插值后的值。
 * 读代码先看哪里：
 * 先看 vertexShader 里的 vUv / vLocalY / vNormalY，再看 fragmentShader 中 uGradientMode 如何选择可视化来源。
 * 控件对应哪些 API：
 * 渐变来源 -> uGradientMode；分界锐度 -> uContrast；旋转观察 -> mesh.rotation。
 * 预期观察什么：
 * UV 渐变固定在表面坐标；局部高度跟模型自身 y 值相关；法线朝向会随表面方向改变。
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
import { bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';

const modeMap = {
  uv: 0,
  height: 1,
  normal: 2
};

const modeLabel = {
  uv: 'vUv.y',
  height: 'vLocalY',
  normal: 'vNormalY'
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vLocalY;
  varying float vNormalY;

  void main() {
    vUv = uv;
    vLocalY = position.y;
    vNormalY = normal.y * 0.5 + 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform int uGradientMode;
  uniform float uContrast;

  varying vec2 vUv;
  varying float vLocalY;
  varying float vNormalY;

  void main() {
    float value = vUv.y;

    if (uGradientMode == 1) {
      value = vLocalY * 0.5 + 0.5;
    } else if (uGradientMode == 2) {
      value = vNormalY;
    }

    float mixedValue = pow(clamp(value, 0.0, 1.0), uContrast);
    vec3 shadow = vec3(0.08, 0.16, 0.25);
    vec3 middle = vec3(0.18, 0.57, 0.52);
    vec3 highlight = vec3(0.95, 0.65, 0.26);
    vec3 color = mix(shadow, middle, smoothstep(0.0, 0.65, mixedValue));

    color = mix(color, highlight, smoothstep(0.62, 1.0, mixedValue));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createVaryingGradientLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [3.2, 2.4, 4.6], target: [0, 0.15, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0.15, 0], minDistance: 2.8, maxDistance: 8 });
  const state = {
    mode: 'uv',
    rotate: true
  };
  const uniforms = {
    uGradientMode: { value: modeMap.uv },
    uContrast: { value: 1.25 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 32), material);

  scene.add(createGrid({ y: -1.18 }), mesh);

  bindSelect('gradient-mode', (value) => {
    state.mode = value;
    uniforms.uGradientMode.value = modeMap[value];
    writeState();
  });

  bindRange('contrast', (value) => {
    uniforms.uContrast.value = value;
    writeState();
  });

  bindCheckbox('rotate-model', (checked) => {
    state.rotate = checked;
    writeState();
  });

  function writeState() {
    writeText('varying-state', `${modeLabel[state.mode]} 从 vertex shader 写出，在三角形内部自动插值`);
    writeText('interpolation-state', `fragment shader 读取插值值；contrast=${formatNumber(uniforms.uContrast.value)}`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      if (state.rotate) {
        mesh.rotation.y = elapsed * 0.38;
        mesh.rotation.x = Math.sin(elapsed * 0.35) * 0.16;
      }

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
