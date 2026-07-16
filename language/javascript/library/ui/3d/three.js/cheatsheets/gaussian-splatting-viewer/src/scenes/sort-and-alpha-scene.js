/*
 * 本示例演示什么：
 * 三个半透明 billboard 在不同绘制顺序下的颜色叠加差异，以及 depthWrite / alphaTest 对遮挡的影响。
 * 读代码先看哪里：
 * 先看 applyOrderMode() 怎样切换 three.js 自动对象排序和手动添加顺序，再看 createSoftDisc() 的透明材质。
 * 页面控件对应哪些关键状态：
 * 绘制顺序控制 renderer.sortObjects 和对象添加顺序；depthWrite 控制透明片元是否写深度；alphaTest 会丢弃低透明边缘。
 * 预期观察什么：
 * 远处先画通常更稳定；近处先画会让颜色叠加反常；depthWrite 打开后半透明边缘可能把后面的片元硬挡掉。
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
  startFrameLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';

const planes = [
  { name: '远：橙色', z: -0.72, x: -0.28, color: '#d77b42' },
  { name: '中：绿色', z: 0, x: 0, color: '#55b087' },
  { name: '近：蓝色', z: 0.72, x: 0.28, color: '#6685d9' }
];

export function createSortAndAlphaLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#171b22' });
  const scene = createScene('#171b22');
  const camera = createCamera({ position: [0, 1.55, 5.8], target: [0, 0.05, 0], fov: 42 });
  const controls = createControls(camera, canvas, { target: [0, 0.05, 0], minDistance: 3.8, maxDistance: 9 });
  const group = new THREE.Group();
  const state = {
    sortMode: 'auto',
    opacity: 0.66,
    alphaTest: 0.02,
    depthWrite: false,
    sway: true
  };
  const discs = planes.map(createSoftDisc);

  scene.add(createGrid({ size: 7, divisions: 14, y: -1.22 }), group);
  scene.add(createLabel('半透明 billboard', [0, -1.03, 0], { scale: [2.25, 0.44, 1] }));
  applyOrderMode();

  bindSelect('sort-mode', (value) => {
    state.sortMode = value;
    applyOrderMode();
    writeState();
  });

  bindRange('opacity', (value) => {
    state.opacity = value;
    discs.forEach((disc) => {
      disc.material.uniforms.uOpacity.value = value;
    });
    writeState();
  }, { format: (value) => value.toFixed(2) });

  bindRange('alpha-test', (value) => {
    state.alphaTest = value;
    discs.forEach((disc) => {
      disc.material.uniforms.uAlphaTest.value = value;
    });
    writeState();
  }, { format: (value) => value.toFixed(2) });

  bindCheckbox('depth-write', (enabled) => {
    state.depthWrite = enabled;
    discs.forEach((disc) => {
      disc.material.depthWrite = enabled;
    });
    writeState();
  });

  bindCheckbox('camera-sway', (enabled) => {
    state.sway = enabled;
    writeState();
  });

  function applyOrderMode() {
    group.clear();

    if (state.sortMode === 'auto') {
      renderer.sortObjects = true;
      discs.forEach((disc) => group.add(disc));
      return;
    }

    renderer.sortObjects = false;
    const ordered = [...discs].sort((a, b) => {
      return state.sortMode === 'back-first'
        ? a.userData.depth - b.userData.depth
        : b.userData.depth - a.userData.depth;
    });
    ordered.forEach((disc) => group.add(disc));
  }

  function writeState() {
    const order = group.children.map((disc) => disc.userData.label).join(' -> ');
    const modeText = state.sortMode === 'auto'
      ? 'renderer.sortObjects=true，由 three.js 按对象排序'
      : `renderer.sortObjects=false，当前添加顺序：${order}`;

    writeText('order-state', modeText);
    writeText('material-state', `opacity=${state.opacity.toFixed(2)}；alphaTest=${state.alphaTest.toFixed(2)}；depthWrite=${state.depthWrite}`);
    writeText('observe-state', `读数：${formatRenderInfo(renderer)}
真实 splat viewer 往往要在单个 buffer 内排序，不能只依赖对象级排序。`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      if (state.sway) {
        camera.position.x = Math.sin(elapsed * 0.45) * 0.58;
        camera.lookAt(0, 0.05, 0);
      }

      discs.forEach((disc) => {
        // billboard 要跟随相机朝向；真实 3DGS 会把椭球投影成屏幕椭圆。
        disc.quaternion.copy(camera.quaternion);
      });
    },
    render() {
      renderer.render(scene, camera);
      writeState();
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

function createSoftDisc({ name, x, z, color }) {
  const geometry = new THREE.PlaneGeometry(2.18, 2.18);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.66 },
      uAlphaTest: { value: 0.02 }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uAlphaTest;
      varying vec2 vUv;

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float radius = dot(centered, centered);
        float alpha = (1.0 - smoothstep(0.24, 1.0, radius)) * uOpacity;

        if (alpha <= uAlphaTest) {
          discard;
        }

        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0, z);
  mesh.userData.label = name;
  mesh.userData.depth = z;
  return mesh;
}
