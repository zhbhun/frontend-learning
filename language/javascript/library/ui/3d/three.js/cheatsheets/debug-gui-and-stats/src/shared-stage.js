import * as THREE from 'three';

export function createRenderer(canvas, clearColor = '#eef2f6') {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(4.8, 3.2, 6.2);
  camera.lookAt(0, 0.55, 0);
  return camera;
}

export function createBaseScene(background = '#eef2f6') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function addBaseLights(scene) {
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#6d8295', 0.72);
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-3.6, 4.5, 4.2);
  scene.add(hemisphere, key);
  return { hemisphere, key };
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startRenderLoop(renderer, scene, camera, canvas, onFrame = () => {}) {
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

export function createDebugMesh() {
  const geometry = new THREE.TorusKnotGeometry(0.62, 0.22, 96, 16);
  const material = new THREE.MeshStandardMaterial({
    color: '#4f8cff',
    roughness: 0.48,
    metalness: 0.18
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'debugMesh';
  mesh.position.y = 0.7;
  return mesh;
}

export function createFloor(size = 5) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: '#dfe8ef', roughness: 0.78 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  return floor;
}

export function createCanvasTexture(label = 'debug') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#256f85';
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = '#e58b35';
  context.fillRect(64, 64, 64, 64);
  context.fillStyle = '#172029';
  context.font = 'bold 18px sans-serif';
  context.fillText(label, 18, 74);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = `${label}Texture`;
  return texture;
}

export function formatNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN') : '0';
}

export function formatVector(vector) {
  return `${vector.x.toFixed(3)} x ${vector.y.toFixed(3)} x ${vector.z.toFixed(3)}`;
}

export function collectSceneStats(root) {
  const stats = {
    nodes: 0,
    meshes: 0,
    lights: 0,
    helpers: 0,
    materials: new Set()
  };

  root.traverse((object) => {
    stats.nodes += 1;

    if (object.isMesh) {
      stats.meshes += 1;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => stats.materials.add(material));
    }

    if (object.isLight) {
      stats.lights += 1;
    }

    if (object.type?.endsWith('Helper')) {
      stats.helpers += 1;
    }
  });

  return {
    nodes: stats.nodes,
    meshes: stats.meshes,
    lights: stats.lights,
    helpers: stats.helpers,
    materials: stats.materials.size
  };
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
