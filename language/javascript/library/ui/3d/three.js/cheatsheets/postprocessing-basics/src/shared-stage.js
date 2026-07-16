import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const resizeCache = new WeakMap();

export function createRenderer(canvas, { clearColor = '#121923', pixelRatio = Math.min(window.devicePixelRatio, 2) } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 100);
  camera.position.set(4.8, 3.1, 6.4);
  camera.lookAt(0, 0.35, 0);
  return camera;
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.6;
  controls.maxDistance = 11;
  controls.target.set(0, 0.35, 0);
  controls.update();
  return controls;
}

export function createBaseScene(background = '#121923') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  const hemisphere = new THREE.HemisphereLight('#f7fbff', '#263440', 0.72);
  const key = new THREE.DirectionalLight('#ffffff', 1.65);
  key.position.set(-3.6, 4.8, 4.2);
  const rim = new THREE.DirectionalLight('#9ed6ff', 0.42);
  rim.position.set(3.8, 2.6, -4.5);
  const grid = new THREE.GridHelper(7, 14, '#617080', '#283646');
  grid.position.y = -1.02;

  scene.add(hemisphere, key, rim, grid);
  return { scene, lights: { hemisphere, key, rim }, grid };
}

export function createShowcaseObjects() {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 1.05, 1.05),
    new THREE.MeshStandardMaterial({ color: '#4f8cff', roughness: 0.38, metalness: 0.12 })
  );
  box.name = '立方体';
  box.position.set(-1.7, -0.35, 0);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 48, 24),
    new THREE.MeshStandardMaterial({ color: '#44b37f', roughness: 0.26, metalness: 0.28 })
  );
  sphere.name = '球体';
  sphere.position.set(0, -0.32, 0);

  const torus = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.46, 0.16, 96, 14),
    new THREE.MeshStandardMaterial({ color: '#f08a4b', roughness: 0.48, metalness: 0.18 })
  );
  torus.name = '圆环';
  torus.position.set(1.72, -0.28, 0);

  return [box, sphere, torus];
}

export function createFloor() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.5),
    new THREE.MeshStandardMaterial({ color: '#202c38', roughness: 0.84, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.04;
  return floor;
}

export function syncRendererCameraComposer(renderer, camera, composer, canvas, { pixelRatio } = {}) {
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

  if (composer) {
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
  }

  resizeCache.set(canvas, size);
  return size;
}

export function startFrameLoop({ renderer, camera, composer, canvas, controls, getPixelRatio, onFrame, render }) {
  let frameId = 0;

  function tick(time) {
    const size = syncRendererCameraComposer(renderer, camera, composer, canvas, {
      pixelRatio: getPixelRatio?.()
    });

    controls?.update();
    onFrame?.(time * 0.001, size);

    if (render) {
      render(size);
    } else {
      composer.render();
    }

    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

export function getPointerNdc(event, canvas, target) {
  const rect = canvas.getBoundingClientRect();
  target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  target.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return target;
}

export function formatNumber(value, digits = 2) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function formatSize(size) {
  return `${size.width} x ${size.height} CSS；${size.drawingWidth} x ${size.drawingHeight} buffer；PR ${formatNumber(size.pixelRatio)}`;
}

export function passNames(composer) {
  return composer.passes.map((pass) => `${pass.constructor.name}${pass.enabled === false ? ' disabled' : ''}`).join(' -> ');
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
