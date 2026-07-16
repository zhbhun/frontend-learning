/*
 * 本示例演示什么：
 * PointsMaterial 的点默认是屏幕方块；map、alphaTest、transparent 和 depthWrite 决定它看起来像圆点还是透明方片。
 * 读代码先看哪里：
 * 先看 createCircleTexture() 如何用 CanvasTexture 做圆形 alpha，再看 applyMaterialState() 写回 PointsMaterial。
 * 控件对应哪些 API：
 * 点贴图 -> material.map；alphaTest -> material.alphaTest；transparent/depthWrite/sizeAttenuation -> 同名材质状态。
 * 预期观察什么：
 * alphaTest 会裁掉贴图透明边；transparent 负责混合；depthWrite 开启时，半透明点更容易互相遮挡出硬边。
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

export function createPointMaterialAlphaLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#101827' });
  const scene = createScene('#101827');
  const camera = createCamera({ position: [4.4, 2.7, 5.8], target: [0, 0.2, 0] });
  const controls = createControls(camera, canvas, { target: [0, 0.2, 0], minDistance: 2.7, maxDistance: 10 });
  const textures = {
    hard: createCircleTexture('hard'),
    soft: createCircleTexture('soft')
  };
  const material = new THREE.PointsMaterial({
    color: '#78d8ff',
    map: textures.hard,
    size: 28,
    alphaTest: 0.08,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true
  });
  const points = new THREE.Points(createLayeredPointGeometry(900), material);
  const referencePlane = createReferencePlane();
  const state = {
    mapMode: 'hard'
  };

  scene.add(createGrid({ y: -1.25 }), referencePlane, points);

  bindSelect('map-mode', (value) => {
    state.mapMode = value;
    applyMaterialState();
  });

  bindRange('alpha-test', (value) => {
    material.alphaTest = value;
    material.needsUpdate = true;
    writeState();
  }, { format: (value) => value.toFixed(2) });

  bindRange('material-size', (value) => {
    material.size = value;
    writeState();
  }, { format: (value) => value.toFixed(0) });

  bindCheckbox('transparent', (enabled) => {
    material.transparent = enabled;
    material.needsUpdate = true;
    writeState();
  });

  bindCheckbox('depth-write', (enabled) => {
    material.depthWrite = enabled;
    material.needsUpdate = true;
    writeState();
  });

  bindCheckbox('material-attenuation', (enabled) => {
    material.sizeAttenuation = enabled;
    material.needsUpdate = true;
    writeState();
  });

  function applyMaterialState() {
    material.map = state.mapMode === 'none' ? null : textures[state.mapMode];
    material.needsUpdate = true;
    writeState();
  }

  function writeState() {
    writeText('material-state', `size=${material.size}；alphaTest=${material.alphaTest.toFixed(2)}
transparent=${material.transparent}；depthWrite=${material.depthWrite}
sizeAttenuation=${material.sizeAttenuation}`);
    writeText('texture-state', material.map ? `${state.mapMode} CanvasTexture；map.needsUpdate=${material.map.needsUpdate}` : '无贴图：点会以屏幕方块绘制');
    writeText('observe-state', `render: ${formatRenderInfo(renderer)}`);
  }

  const stop = startFrameLoop({
    renderer,
    camera,
    canvas,
    controls,
    onFrame(elapsed) {
      points.rotation.y = elapsed * 0.1;
      referencePlane.rotation.z = Math.sin(elapsed * 0.24) * 0.08;
    },
    render() {
      renderer.render(scene, camera);
      writeState();
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    controls.dispose();
    Object.values(textures).forEach((texture) => texture.dispose());
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createLayeredPointGeometry(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const random = seededRandom(731);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const layer = index % 6;
    const angle = random() * Math.PI * 2;
    const radius = 0.5 + Math.sqrt(random()) * 1.85;

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = (layer - 2.5) * 0.16 + (random() - 0.5) * 0.08;
    positions[offset + 2] = Math.sin(angle) * radius + layer * 0.12;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function createCircleTexture(mode) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(48, 48, mode === 'soft' ? 4 : 30, 48, 48, 45);

  if (mode === 'soft') {
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.58, 'rgba(255,255,255,0.82)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.86, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createReferencePlane() {
  const geometry = new THREE.PlaneGeometry(4.2, 2.2);
  const material = new THREE.MeshBasicMaterial({
    color: '#2d4c68',
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.rotation.x = -0.38;
  mesh.rotation.y = 0.48;
  mesh.position.y = 0.02;
  return mesh;
}
