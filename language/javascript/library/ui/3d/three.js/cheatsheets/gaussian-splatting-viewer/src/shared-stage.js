import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const resizeCache = new WeakMap();

export function createRenderer(canvas, { clearColor = '#161a21', pixelRatioLimit = 2 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(getLimitedPixelRatio(pixelRatioLimit));
  renderer.setClearColor(clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createScene(background = '#161a21') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function createCamera({
  position = [5.2, 3.2, 7.2],
  target = [0, 0, 0],
  fov = 45,
  near = 0.05,
  far = 160
} = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  camera.position.fromArray(position);
  camera.lookAt(...target);
  return camera;
}

export function createControls(camera, canvas, { target = [0, 0, 0], minDistance = 2.8, maxDistance = 18 } = {}) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.target.fromArray(target);
  controls.update();
  return controls;
}

export function addBaseLights(scene) {
  const ambient = new THREE.HemisphereLight('#f5f0da', '#3a4659', 1.65);
  const key = new THREE.DirectionalLight('#fff6df', 2.2);
  key.position.set(4.5, 5.8, 3.8);
  scene.add(ambient, key);
}

export function createGrid({ size = 9, divisions = 18, y = -1.25 } = {}) {
  const grid = new THREE.GridHelper(size, divisions, '#7b866f', '#333c3b');
  grid.position.y = y;
  return grid;
}

export function syncRendererAndCamera(renderer, camera, canvas, { pixelRatioLimit = 2 } = {}) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));
  const pixelRatio = getLimitedPixelRatio(pixelRatioLimit);
  const previous = resizeCache.get(canvas);
  const size = {
    width,
    height,
    pixelRatio,
    drawingWidth: Math.round(width * pixelRatio),
    drawingHeight: Math.round(height * pixelRatio)
  };

  if (
    previous &&
    previous.width === size.width &&
    previous.height === size.height &&
    previous.pixelRatio === size.pixelRatio
  ) {
    return previous;
  }

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  resizeCache.set(canvas, size);
  return size;
}

export function startFrameLoop({ renderer, camera, canvas, controls, getPixelRatioLimit, onFrame, render }) {
  let frameId = 0;

  function tick(time) {
    const size = syncRendererAndCamera(renderer, camera, canvas, {
      pixelRatioLimit: getPixelRatioLimit?.() ?? 2
    });

    controls?.update();
    onFrame?.(time * 0.001, size);
    render?.(size);
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
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

  return {
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size
  };
}

export function createLabel(text, position, { width = 512, height = 128, scale = [1.75, 0.44, 1] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  context.fillStyle = 'rgba(22, 26, 33, 0.76)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fbfaf6';
  context.font = '700 44px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.fromArray(position);
  sprite.scale.fromArray(scale);
  return sprite;
}

export function formatNumber(value, digits = 2) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatRenderInfo(renderer) {
  const { render, memory } = renderer.info;
  return `calls=${render.calls}；points=${render.points}；triangles=${render.triangles}；geometries=${memory.geometries}；textures=${memory.textures}`;
}

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function getLimitedPixelRatio(limit) {
  return Math.max(0.75, Math.min(window.devicePixelRatio || 1, limit));
}

function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value && value.isTexture) {
      textures.add(value);
    }
  });
}
