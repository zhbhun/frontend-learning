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
  camera.position.set(4.8, 3, 6.2);
  camera.lookAt(0, 0.25, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const ambient = new THREE.HemisphereLight('#ffffff', '#64748b', 0.65);
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(-2.6, 4.2, 3.4);
  const fill = new THREE.DirectionalLight('#c7e8ff', 0.35);
  fill.position.set(3.2, 2.5, -3.5);

  const grid = new THREE.GridHelper(8, 8, '#94a3b8', '#cbd5e1');
  grid.position.y = -1.25;

  scene.add(ambient, key, fill, grid);
  return { scene, ambient, key, fill };
}

export function createStudioGeometry() {
  return new THREE.TorusKnotGeometry(0.62, 0.2, 96, 14);
}

export function createBackPlate() {
  const geometry = new THREE.PlaneGeometry(7.5, 4.2);
  const material = new THREE.MeshBasicMaterial({
    color: '#dbeafe',
    side: THREE.DoubleSide
  });
  const plate = new THREE.Mesh(geometry, material);
  plate.position.set(0, 0.4, -1.25);
  return plate;
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
