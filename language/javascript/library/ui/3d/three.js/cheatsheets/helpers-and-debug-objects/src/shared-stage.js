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
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(4.8, 3.2, 6.8);
  camera.lookAt(0, 0.45, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const ambient = new THREE.HemisphereLight('#ffffff', '#7b8fa4', 0.55);
  const key = new THREE.DirectionalLight('#ffffff', 1.2);
  key.position.set(-3, 4, 4);
  scene.add(ambient, key);

  return scene;
}

export function createDebugTarget() {
  const target = new THREE.Group();
  target.name = 'debugTarget';

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.85, 1.05),
    new THREE.MeshStandardMaterial({ color: '#4f8cff', roughness: 0.45 })
  );
  body.position.y = 0.1;

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 0.9, 28),
    new THREE.MeshStandardMaterial({ color: '#e58b35', roughness: 0.52 })
  );
  cap.position.set(0.55, 0.95, 0);

  target.add(body, cap);
  return target;
}

export function createFloor(size = 4.5) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: '#dfe8ef', roughness: 0.7 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.25;
  return floor;
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function createResizeObserver(canvas, render) {
  const observer = new ResizeObserver(render);
  observer.observe(canvas.parentElement);
  return observer;
}

export function formatVector(vector) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}

export function disposeObjectTree(object) {
  const geometries = new Set();
  const materials = new Set();

  object.traverse((child) => {
    if (child.geometry) {
      geometries.add(child.geometry);
    }

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => materials.add(material));
    } else if (child.material) {
      materials.add(child.material);
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
