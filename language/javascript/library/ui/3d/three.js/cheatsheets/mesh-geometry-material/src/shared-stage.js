import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#f0f4f2', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
  camera.position.set(4.4, 2.8, 6.2);
  camera.lookAt(0, 0.35, 0);
  return camera;
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

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f0f4f2');

  const grid = new THREE.GridHelper(7, 7, '#8aa098', '#d6e0dc');
  grid.position.y = -0.7;
  scene.add(grid);
  scene.add(new THREE.AxesHelper(2.2));

  const hemi = new THREE.HemisphereLight('#ffffff', '#7c8f86', 0.7);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 5, 3);
  scene.add(hemi, key);

  return scene;
}

export function formatVector(vector) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}

export function getVertexCount(geometry) {
  const position = geometry.getAttribute('position');
  return position ? position.count : 0;
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
