import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
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
  camera.position.set(5.6, 3.8, 6.8);
  camera.lookAt(0, 0.35, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const ambient = new THREE.HemisphereLight('#ffffff', '#64748b', 0.8);
  const key = new THREE.DirectionalLight('#ffffff', 1.55);
  key.position.set(-3.5, 5, 4.5);
  const fill = new THREE.DirectionalLight('#bfdbfe', 0.42);
  fill.position.set(4, 2.5, -3.5);

  const grid = new THREE.GridHelper(10, 10, '#94a3b8', '#cbd5e1');
  grid.position.y = -1.25;

  scene.add(ambient, key, fill, grid);
  return scene;
}

export function createTransformableMesh() {
  const geometry = new THREE.BoxGeometry(1.6, 1.15, 1.1);
  const material = new THREE.MeshStandardMaterial({
    color: '#2563eb',
    roughness: 0.38,
    metalness: 0.08
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = '蓝色盒子';
  mesh.position.y = -0.15;
  mesh.rotation.set(0.12, 0.55, 0);
  return mesh;
}

export function createSelectableObjects() {
  const definitions = [
    {
      name: '蓝色盒子',
      geometry: new THREE.BoxGeometry(1.2, 1.2, 1.2),
      color: '#2563eb',
      position: [-2, -0.15, 0]
    },
    {
      name: '绿色球体',
      geometry: new THREE.SphereGeometry(0.72, 32, 20),
      color: '#16a34a',
      position: [0, -0.05, 0]
    },
    {
      name: '橙色圆柱',
      geometry: new THREE.CylinderGeometry(0.62, 0.75, 1.4, 32),
      color: '#ea580c',
      position: [2, -0.05, 0]
    }
  ];

  return definitions.map(({ name, geometry, color, position }) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.userData.baseEmissive = material.emissive.clone();
    return mesh;
  });
}

export function applySelectionState(object, selected) {
  object.material.emissive.copy(object.userData.baseEmissive);
  object.material.emissiveIntensity = 1;

  if (selected) {
    object.material.emissive.set('#7c2d12');
    object.material.emissiveIntensity = 0.48;
  }
}

export function keepTransformControlsVisible(helper) {
  helper.traverse((object) => {
    object.renderOrder = Infinity;

    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];

    materials.forEach((material) => {
      // 与官方 TransformControls gizmo 保持一致：控制器作为编辑器叠层，
      // 不参与场景深度遮挡，也不受场景 tone mapping 改变颜色。
      material.depthTest = false;
      material.depthWrite = false;
      material.toneMapped = false;
      material.needsUpdate = true;
    });
  });
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
    frameId = window.requestAnimationFrame(render);
  }

  frameId = window.requestAnimationFrame(render);
  return () => window.cancelAnimationFrame(frameId);
}

export function getPointerNdc(event, canvas, target) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return target.set(x, y);
}

export function formatVector3(vector) {
  return `x ${formatNumber(vector.x)}, y ${formatNumber(vector.y)}, z ${formatNumber(vector.z)}`;
}

export function formatEulerDegrees(euler) {
  return `x ${formatDegrees(euler.x)}, y ${formatDegrees(euler.y)}, z ${formatDegrees(euler.z)}`;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatDegrees(value) {
  return Number.isFinite(value) ? `${THREE.MathUtils.radToDeg(value).toFixed(1)}°` : '-';
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
