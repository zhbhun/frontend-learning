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
  camera.position.set(5.2, 3.4, 6.4);
  camera.lookAt(0, 0.55, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const grid = new THREE.GridHelper(8, 8, '#7c8c99', '#d1dbe4');
  const axes = new THREE.AxesHelper(3);

  const ambient = new THREE.HemisphereLight('#ffffff', '#7b8fa4', 0.65);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 5, 3);

  scene.add(grid, axes, ambient, key);
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

export function createResizeObserver(canvas, render) {
  const observer = new ResizeObserver(render);
  observer.observe(canvas.parentElement);
  return observer;
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
