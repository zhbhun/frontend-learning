import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const resizeCache = new WeakMap();

export function createRenderer(canvas, { clearColor = '#111827', pixelRatio = Math.min(window.devicePixelRatio, 2) } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createScene(background = '#111827') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function createCamera({
  position = [3.8, 2.6, 5.2],
  target = [0, 0, 0],
  fov = 45,
  near = 0.05,
  far = 100
} = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  camera.position.fromArray(position);
  camera.lookAt(...target);
  return camera;
}

export function createControls(camera, canvas, { target = [0, 0, 0], minDistance = 2.2, maxDistance = 10 } = {}) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.target.fromArray(target);
  controls.update();
  return controls;
}

export function createGrid({ size = 6, divisions = 12, y = -1.05 } = {}) {
  const grid = new THREE.GridHelper(size, divisions, '#6c7a89', '#2d3a48');
  grid.position.y = y;
  return grid;
}

export function syncRendererAndCamera(renderer, camera, canvas, { pixelRatio } = {}) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));
  const ratio = Math.max(0.5, Math.min(pixelRatio ?? window.devicePixelRatio, 2));
  const previous = resizeCache.get(canvas);
  const size = {
    width,
    height,
    pixelRatio: ratio,
    drawingWidth: Math.round(width * ratio),
    drawingHeight: Math.round(height * ratio)
  };

  if (
    previous &&
    previous.width === size.width &&
    previous.height === size.height &&
    previous.pixelRatio === size.pixelRatio
  ) {
    return previous;
  }

  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  resizeCache.set(canvas, size);
  return size;
}

export function startFrameLoop({ renderer, camera, canvas, controls, getPixelRatio, onFrame, render }) {
  let frameId = 0;

  function tick(time) {
    const size = syncRendererAndCamera(renderer, camera, canvas, {
      pixelRatio: getPixelRatio?.()
    });

    controls?.update();
    onFrame?.(time * 0.001, size);

    if (render) {
      render(size);
    } else {
      renderer.render(camera.parent ?? new THREE.Scene(), camera);
    }

    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

export function getPointerUv(event, canvas, target) {
  const rect = canvas.getBoundingClientRect();
  target.x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
  target.y = THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
  return target;
}

export function formatNumber(value, digits = 2) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function formatSize(size) {
  return `${size.width} x ${size.height} CSS；${size.drawingWidth} x ${size.drawingHeight} buffer；PR ${formatNumber(size.pixelRatio)}`;
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
