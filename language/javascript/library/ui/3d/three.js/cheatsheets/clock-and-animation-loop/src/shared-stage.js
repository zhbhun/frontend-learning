import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf2f7', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(4.8, 3.2, 6.3);
  camera.lookAt(0, 0.2, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf2f7');

  const ambient = new THREE.HemisphereLight('#ffffff', '#64748b', 0.75);
  const key = new THREE.DirectionalLight('#ffffff', 1.35);
  key.position.set(-3.4, 4.5, 3.6);

  const grid = new THREE.GridHelper(7, 7, '#94a3b8', '#cbd5e1');
  grid.position.y = -1.15;

  scene.add(ambient, key, grid);
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

export function startAnimationLoop(renderer, scene, camera, canvas, onFrame) {
  function render(timestamp) {
    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame(timestamp);
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(render);
  return () => renderer.setAnimationLoop(null);
}

export function createReferenceLine() {
  const points = [
    new THREE.Vector3(-2.4, -0.55, 0),
    new THREE.Vector3(2.4, -0.55, 0)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: '#64748b' });
  return new THREE.Line(geometry, material);
}

export function createTickMarks() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: '#94a3b8' });

  for (let i = -2; i <= 2; i += 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i, -0.72, 0),
      new THREE.Vector3(i, -0.38, 0)
    ]);
    group.add(new THREE.Line(geometry, material));
  }

  return group;
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

export function formatSeconds(value) {
  return `${value.toFixed(3)} s`;
}

export function formatMilliseconds(value) {
  return `${(value * 1000).toFixed(1)} ms`;
}

export function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
