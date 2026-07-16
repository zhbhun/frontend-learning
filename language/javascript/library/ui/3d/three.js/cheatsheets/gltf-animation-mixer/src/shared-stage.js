import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#eef3f0', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef3f0');

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#66737a', 0.85);
  const key = new THREE.DirectionalLight('#ffffff', 1.85);
  key.position.set(-3.5, 5.2, 4.2);
  const fill = new THREE.DirectionalLight('#bde4ff', 0.5);
  fill.position.set(3.5, 2.4, -3.2);

  const grid = new THREE.GridHelper(5, 10, '#71818a', '#c8d2d4');
  grid.position.y = -0.64;

  const line = createReferenceLine();
  scene.add(hemisphere, key, fill, grid, line);
  return scene;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  camera.position.set(3.2, 2.15, 4.3);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.update();
  return controls;
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startAnimationLoop(renderer, scene, camera, canvas, controls, onFrame) {
  function render(timestamp) {
    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame(timestamp);
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(render);
  return () => renderer.setAnimationLoop(null);
}

export function frameObject(camera, controls, object, { fitRatio = 1.9 } = {}) {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object, true);
  if (box.isEmpty()) {
    return null;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = Math.max(3.1, (maxSize * fitRatio) / (2 * Math.tan(fov / 2)));
  const viewDirection = new THREE.Vector3(0.82, 0.54, 1).normalize();

  camera.position.copy(center).addScaledVector(viewDirection, distance);
  camera.near = Math.max(0.01, distance / 100);
  camera.far = Math.max(100, distance * 100);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
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

  textures.forEach((texture) => {
    const image = texture.image;
    texture.dispose();

    if (image && typeof image.close === 'function') {
      image.close();
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function formatSeconds(value) {
  return `${value.toFixed(3)} s`;
}

export function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function createReferenceLine() {
  const points = [
    new THREE.Vector3(-1.15, -0.52, 0),
    new THREE.Vector3(1.15, -0.52, 0)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: '#b95a3a' });
  return new THREE.Line(geometry, material);
}

function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value && value.isTexture) {
      textures.add(value);
    }
  });
}
