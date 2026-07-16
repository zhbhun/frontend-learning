/*
 * 本示例演示什么：
 * 在 BufferGeometry 上添加自定义 attribute：aScale 控制每个点大小，aTint 控制每个点颜色。
 * 读代码先看哪里：
 * 先看 createPointGeometry() 里 setAttribute('aScale' / 'aTint')，再看 vertexShader 如何声明 attribute。
 * 控件对应哪些 API：
 * 点大小 -> uniforms.uPointSize；扩散半径 -> uniforms.uSpread；重写 attribute -> BufferAttribute.array + needsUpdate。
 * 预期观察什么：
 * 点大小 uniform 会整体放大；aScale / aTint 是每个顶点自己的数据，重写后只有对应点的大小和颜色分布改变。
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
import { bindButton, bindRange, readElement, writeText } from '../shared-ui.js';

const pointCount = 520;

const vertexShader = /* glsl */ `
  uniform float uPointSize;
  uniform float uSpread;

  attribute float aScale;
  attribute vec3 aTint;

  varying vec3 vTint;

  void main() {
    vTint = aTint;

    vec3 spreadPosition = position * uSpread;
    vec4 mvPosition = modelViewMatrix * vec4(spreadPosition, 1.0);

    gl_PointSize = uPointSize * aScale * (260.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vTint;

  void main() {
    vec2 pointUv = gl_PointCoord - 0.5;
    float distanceToCenter = length(pointUv);
    float alpha = smoothstep(0.5, 0.18, distanceToCenter);

    if (alpha <= 0.02) {
      discard;
    }

    gl_FragColor = vec4(vTint, alpha);
  }
`;

export function createCustomAttributeLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#111827' });
  const scene = createScene('#111827');
  const camera = createCamera({ position: [3.6, 2.4, 5.2], target: [0, 0.2, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0.2, 0], minDistance: 2.8, maxDistance: 9 });
  const geometry = createPointGeometry();
  const uniforms = {
    uPointSize: { value: 22 },
    uSpread: { value: 1 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  const state = {
    rotate: true,
    updateCount: 0
  };

  scene.add(createGrid({ y: -1.1 }), points);

  bindRange('point-size', (value) => {
    uniforms.uPointSize.value = value;
    writeState();
  }, { format: (value) => value.toFixed(0) });

  bindRange('spread', (value) => {
    uniforms.uSpread.value = value;
    writeState();
  });

  bindButton('shuffle-attributes', () => {
    // 只改 TypedArray 不会自动上传到 GPU；needsUpdate 是动态 attribute 的关键更新点。
    rewritePointAttributes(geometry);
    state.updateCount += 1;
    writeState('已设置 aScale.needsUpdate 与 aTint.needsUpdate');
  });

  bindButton('toggle-rotation', () => {
    state.rotate = !state.rotate;
    readElement('toggle-rotation').textContent = state.rotate ? '暂停旋转' : '继续旋转';
    writeState();
  });

  function writeState(updateText = '-') {
    writeText('count-state', `${pointCount} 个 position 顶点`);
    writeText('attribute-state', `aScale itemSize=1；aTint itemSize=3；uPointSize=${formatNumber(uniforms.uPointSize.value, 0)}`);
    writeText('update-state', `重写次数=${state.updateCount}；${updateText}`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      if (state.rotate) {
        points.rotation.y = elapsed * 0.22;
        points.rotation.x = Math.sin(elapsed * 0.24) * 0.18;
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

function createPointGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointCount * 3);
  const scales = new Float32Array(pointCount);
  const tints = new Float32Array(pointCount * 3);

  for (let index = 0; index < pointCount; index += 1) {
    const radius = Math.sqrt(Math.random()) * 1.25;
    const angle = index * 2.399963 + Math.random() * 0.18;
    const height = (Math.random() - 0.5) * 1.55;
    const positionOffset = index * 3;

    positions[positionOffset] = Math.cos(angle) * radius;
    positions[positionOffset + 1] = height;
    positions[positionOffset + 2] = Math.sin(angle) * radius;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
  rewritePointAttributes(geometry);
  return geometry;
}

function rewritePointAttributes(geometry) {
  const scaleAttribute = geometry.getAttribute('aScale');
  const tintAttribute = geometry.getAttribute('aTint');
  const colorA = new THREE.Color('#34b3a0');
  const colorB = new THREE.Color('#f08a4b');
  const colorC = new THREE.Color('#6d8cff');
  const mixed = new THREE.Color();

  for (let index = 0; index < pointCount; index += 1) {
    const y = geometry.getAttribute('position').getY(index);
    const wave = 0.5 + 0.5 * Math.sin(index * 0.17 + y * 2.4);
    const colorMix = Math.random();

    scaleAttribute.setX(index, 0.5 + wave * 1.15 + Math.random() * 0.35);

    mixed.copy(colorA).lerp(colorB, colorMix);
    mixed.lerp(colorC, Math.max(0, y) * 0.25);
    tintAttribute.setXYZ(index, mixed.r, mixed.g, mixed.b);
  }

  scaleAttribute.needsUpdate = true;
  tintAttribute.needsUpdate = true;
}
