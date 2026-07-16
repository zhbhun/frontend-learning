import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf2f1', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  camera.position.set(4.2, 2.8, 6.1);
  camera.lookAt(0, 0.15, 0);
  return camera;
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.2;
  controls.maxDistance = 12;
  controls.target.set(0, 0.1, 0);
  controls.update();
  return controls;
}

export function createStudioScene(renderer, { environment = true, background = '#edf2f1' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#61727b', 0.72);
  const key = new THREE.DirectionalLight('#ffffff', 1.75);
  key.position.set(-3.6, 4.8, 3.8);
  const fill = new THREE.DirectionalLight('#aad8ff', 0.35);
  fill.position.set(3.8, 2.2, -3.4);

  const grid = new THREE.GridHelper(7, 14, '#64748b', '#c7d2d7');
  grid.position.y = -1.12;

  const environmentTexture = createRoomEnvironmentTexture(renderer);
  if (environment) {
    scene.environment = environmentTexture;
  }

  scene.add(hemisphere, key, fill, grid);

  return {
    scene,
    lights: { hemisphere, key, fill },
    grid,
    environmentTexture,
    dispose() {
      environmentTexture.dispose();
    }
  };
}

export function createRoomEnvironmentTexture(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;

  room.dispose();
  pmrem.dispose();
  return texture;
}

export function createStudioGeometry() {
  return new THREE.TorusKnotGeometry(0.64, 0.2, 108, 16);
}

export function createBackgroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#30788e');
  gradient.addColorStop(0.54, '#f8faf9');
  gradient.addColorStop(1, '#d95832');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(255, 255, 255, 0.24)';
  for (let x = -canvas.height; x < canvas.width; x += 44) {
    context.beginPath();
    context.moveTo(x, canvas.height);
    context.lineTo(x + canvas.height, 0);
    context.lineTo(x + canvas.height + 16, 0);
    context.lineTo(x + 16, canvas.height);
    context.closePath();
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createColorMapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#30788e');
  gradient.addColorStop(0.45, '#42a66b');
  gradient.addColorStop(1, '#d95832');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let y = 0; y < canvas.height; y += 36) {
    context.fillRect(0, y, canvas.width, 5);
  }

  context.fillStyle = 'rgba(32, 48, 58, 0.72)';
  context.font = 'bold 44px sans-serif';
  context.fillText('sRGB', 24, 62);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoughnessDataTexture(size = 96) {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const stripe = Math.floor(x / 12) % 2;
      const ramp = y / (size - 1);
      const value = Math.round((stripe ? 0.85 : 0.18) * 255 * (0.75 + ramp * 0.25));

      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

export function createStripeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 192;

  const context = canvas.getContext('2d');
  context.fillStyle = '#f8faf9';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const colors = ['#30788e', '#42a66b', '#d95832', '#20303a'];
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(index * 96, 0, 54, canvas.height);
  });

  context.strokeStyle = 'rgba(32, 48, 58, 0.35)';
  context.lineWidth = 4;
  for (let y = 0; y <= canvas.height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startRenderLoop(renderer, scene, camera, canvas, controls, onFrame = () => {}) {
  let frameId = 0;

  function render(time) {
    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame(time * 0.001);
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  frameId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frameId);
}

export function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
