import * as THREE from 'three';

export function createRenderer(canvas, { shadows = false } = {}) {
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
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(5.2, 3.4, 6.4);
  camera.lookAt(0, 0.45, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');
  return scene;
}

export function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 7),
    new THREE.MeshStandardMaterial({
      color: '#dfe7ef',
      roughness: 0.86,
      metalness: 0.02
    })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.05;
  return ground;
}

export function createLitObject(color = '#2f83d8') {
  return new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.68, 0.2, 96, 14),
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.08,
      roughness: 0.48
    })
  );
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
  if (Math.abs(value) < 0.00001) {
    return '0';
  }

  if (Math.abs(value) < 0.1) {
    return value.toFixed(4);
  }

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
