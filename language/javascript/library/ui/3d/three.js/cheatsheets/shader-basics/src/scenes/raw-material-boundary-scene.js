/*
 * 本示例演示什么：
 * 左侧用 ShaderMaterial 省略 three.js 自动注入的 position / uv / modelViewMatrix / projectionMatrix 声明；
 * 右侧用 RawShaderMaterial 手动声明这些内置变量，观察两者最终可以画出相同几何。
 * 读代码先看哪里：
 * 先对比 shaderMaterialVertexShader 与 rawMaterialVertexShader，注意 Raw 版本多出的 attribute / uniform 声明。
 * 控件对应哪些 API：
 * 动画速度 -> 两个材质共享的 uTime；显示坐标轴 -> AxesHelper.visible。
 * 预期观察什么：
 * 画面相近，但 RawShaderMaterial 更接近底层 WebGL：少声明一个内置变量就会进入编译错误。
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

const shaderMaterialVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 moved = position;
    moved.z += sin((position.x + uTime) * 4.0) * 0.08;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(moved, 1.0);
  }
`;

const shaderMaterialFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec3 color = mix(vec3(0.16, 0.50, 0.85), vec3(0.94, 0.48, 0.26), vUv.x);
    color += sin(uTime + vUv.y * 8.0) * 0.06;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const rawMaterialVertexShader = /* glsl */ `
  precision mediump float;

  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 moved = position;
    moved.z += sin((position.x + uTime) * 4.0) * 0.08;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(moved, 1.0);
  }
`;

const rawMaterialFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uTime;

  varying vec2 vUv;

  void main() {
    vec3 color = mix(vec3(0.14, 0.62, 0.48), vec3(0.94, 0.70, 0.28), vUv.x);
    color += cos(uTime + vUv.y * 8.0) * 0.06;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createRawMaterialBoundaryLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [3.4, 2.2, 4.8], target: [0, 0, 0] });
  const controls = createControls(camera, canvas, { minDistance: 3, maxDistance: 8 });
  const sharedUniforms = {
    uTime: { value: 0 }
  };
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: sharedUniforms,
    vertexShader: shaderMaterialVertexShader,
    fragmentShader: shaderMaterialFragmentShader,
    side: THREE.DoubleSide
  });
  const rawMaterial = new THREE.RawShaderMaterial({
    uniforms: sharedUniforms,
    vertexShader: rawMaterialVertexShader,
    fragmentShader: rawMaterialFragmentShader,
    side: THREE.DoubleSide
  });
  const shaderMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45, 18, 18), shaderMaterial);
  const rawMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45, 18, 18), rawMaterial);
  const axes = new THREE.AxesHelper(2.4);
  const state = {
    timeSpeed: 0.8
  };

  shaderMesh.position.x = -1.05;
  rawMesh.position.x = 1.05;
  shaderMesh.rotation.x = -0.35;
  rawMesh.rotation.x = -0.35;
  scene.add(createGrid({ y: -1.05 }), axes, shaderMesh, rawMesh);

  bindRange('time-speed', (value) => {
    state.timeSpeed = value;
    writeState();
  });

  bindCheckbox('show-axes', (checked) => {
    axes.visible = checked;
    writeState();
  });

  function writeState() {
    writeText('shader-state', 'ShaderMaterial：可直接使用 position / uv / modelViewMatrix / projectionMatrix');
    writeText('raw-state', 'RawShaderMaterial：手动声明 attribute、uniform、precision');
    writeText('boundary-state', `uTime=${formatNumber(sharedUniforms.uTime.value)}；axes=${axes.visible}`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      sharedUniforms.uTime.value = elapsed * state.timeSpeed;
      shaderMesh.rotation.y = Math.sin(elapsed * 0.45) * 0.2;
      rawMesh.rotation.y = Math.sin(elapsed * 0.45) * 0.2;
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
