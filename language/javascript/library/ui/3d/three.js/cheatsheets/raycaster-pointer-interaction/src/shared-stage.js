import * as THREE from 'three';

export const LAYER_NAMES = new Map([
  [0, 'layer 0'],
  [1, 'layer 1'],
  [2, 'layer 2']
]);

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
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(5, 3.4, 6.4);
  camera.lookAt(0, 0.35, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const ambient = new THREE.HemisphereLight('#ffffff', '#64748b', 0.74);
  const key = new THREE.DirectionalLight('#ffffff', 1.45);
  key.position.set(-3.2, 4.8, 4.2);
  const fill = new THREE.DirectionalLight('#c7e8ff', 0.36);
  fill.position.set(3.4, 2.4, -3.8);

  const grid = new THREE.GridHelper(8, 8, '#94a3b8', '#cbd5e1');
  grid.position.y = -1.22;

  scene.add(ambient, key, fill, grid);
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

export function getPointerNdc(event, canvas, target) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return target.set(x, y);
}

export function createPickableMesh({ name, geometry, color, position, layer = 0 }) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.04
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.layers.set(layer);
  mesh.userData.baseColor = new THREE.Color(color);
  mesh.userData.layer = layer;
  return mesh;
}

export function createPickableSet() {
  return [
    createPickableMesh({
      name: '蓝色盒子',
      geometry: new THREE.BoxGeometry(1, 1, 1),
      color: '#2f83d8',
      position: new THREE.Vector3(-1.7, -0.15, 0)
    }),
    createPickableMesh({
      name: '绿色球体',
      geometry: new THREE.SphereGeometry(0.62, 32, 20),
      color: '#36a269',
      position: new THREE.Vector3(0, -0.1, 0)
    }),
    createPickableMesh({
      name: '橙色圆环',
      geometry: new THREE.TorusKnotGeometry(0.42, 0.16, 72, 12),
      color: '#d6832b',
      position: new THREE.Vector3(1.75, -0.1, 0)
    })
  ];
}

export function applyObjectState(object, state) {
  if (!object) {
    return;
  }

  const baseColor = object.userData.baseColor;
  object.scale.setScalar(state === 'selected' ? 1.16 : state === 'hover' ? 1.08 : 1);
  object.material.color.copy(baseColor);
  object.material.emissive.set(state === 'selected' ? '#7f1d1d' : state === 'hover' ? '#b45309' : '#000000');
}

export function formatVector2(vector) {
  return `x ${formatNumber(vector.x)}, y ${formatNumber(vector.y)}`;
}

export function formatVector3(vector) {
  return `x ${formatNumber(vector.x)}, y ${formatNumber(vector.y)}, z ${formatNumber(vector.z)}`;
}

export function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

export function formatLayer(layer) {
  return LAYER_NAMES.get(layer) ?? `layer ${layer}`;
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
