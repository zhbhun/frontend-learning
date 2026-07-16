import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#eef2f6', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(4.8, 3.1, 6.2);
  camera.lookAt(0, 0.25, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const ambient = new THREE.HemisphereLight('#ffffff', '#64748b', 0.7);
  const key = new THREE.DirectionalLight('#ffffff', 1.5);
  key.position.set(-3.5, 4.6, 3.8);
  scene.add(ambient, key);

  const grid = new THREE.GridHelper(7, 7, '#94a3b8', '#cbd5e1');
  grid.position.y = -1.25;
  scene.add(grid);

  return scene;
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startRenderLoop(renderer, scene, camera, canvas, onFrame) {
  let frameId = 0;

  function render(time) {
    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame(time * 0.001);
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  frameId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frameId);
}

export function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function degreesToRadians(value) {
  return THREE.MathUtils.degToRad(value);
}

export function disposeObjectTree(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) {
      geometries.add(child.geometry);
    }

    const childMaterials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];

    childMaterials.forEach((material) => {
      materials.add(material);
      collectMaterialTextures(material, textures);
    });
  });

  textures.forEach((texture) => texture.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value && value.isTexture) {
      textures.add(value);
    }
  });
}

export function createCheckerCanvas({ size = 256, cells = 8, label = 'UV' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const cell = size / cells;

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? '#2f83d8' : '#f8fafc';
      context.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  context.strokeStyle = 'rgba(17, 24, 39, 0.55)';
  context.lineWidth = 3;
  for (let i = 0; i <= cells; i += 1) {
    context.beginPath();
    context.moveTo(i * cell, 0);
    context.lineTo(i * cell, size);
    context.moveTo(0, i * cell);
    context.lineTo(size, i * cell);
    context.stroke();
  }

  context.fillStyle = '#d6832b';
  context.font = 'bold 42px sans-serif';
  context.fillText(label, 18, 52);
  return canvas;
}

export function createOrientationCanvas({ width = 256, height = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.fillStyle = '#2f83d8';
  context.fillRect(0, 0, width, height / 2);
  context.fillStyle = '#d6832b';
  context.fillRect(0, height / 2, width, height / 2);

  context.fillStyle = 'rgba(255, 255, 255, 0.86)';
  context.font = 'bold 42px sans-serif';
  context.fillText('TOP', 22, 70);
  context.fillStyle = 'rgba(17, 24, 39, 0.82)';
  context.fillText('BOTTOM', 22, height - 38);

  context.strokeStyle = 'rgba(17, 24, 39, 0.55)';
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
  return canvas;
}

export function createGradientCanvas({ width = 256, height = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#2f83d8');
  gradient.addColorStop(0.48, '#36a269');
  gradient.addColorStop(1, '#d6832b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255, 255, 255, 0.72)';
  for (let y = 0; y < height; y += 32) {
    context.fillRect(0, y, width, 4);
  }

  return canvas;
}
