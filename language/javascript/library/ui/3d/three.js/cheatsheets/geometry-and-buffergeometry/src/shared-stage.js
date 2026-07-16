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
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(4.2, 3.1, 6.2);
  camera.lookAt(0, 0.25, 0);
  return camera;
}

export function createBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  const ambient = new THREE.HemisphereLight('#ffffff', '#6b7f92', 0.7);
  const key = new THREE.DirectionalLight('#ffffff', 1.15);
  key.position.set(-4, 5, 4);

  const grid = new THREE.GridHelper(6, 6, '#94a3b8', '#cbd5e1');
  grid.position.y = -1.45;

  const axes = new THREE.AxesHelper(1.2);
  axes.position.set(-2.6, -1.44, -2.6);

  scene.add(ambient, key, grid, axes);
  return scene;
}

export function createPreviewMesh(geometry, material = createDefaultSurfaceMaterial()) {
  const group = new THREE.Group();
  const surface = new THREE.Mesh(geometry, material);
  const wireframe = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: '#1f2937',
      wireframe: true,
      transparent: true,
      opacity: 0.42
    })
  );

  wireframe.renderOrder = 1;
  group.add(surface, wireframe);

  return {
    group,
    surface,
    wireframe,
    setGeometry(nextGeometry) {
      const oldGeometry = surface.geometry;
      surface.geometry = nextGeometry;
      wireframe.geometry = nextGeometry;
      oldGeometry.dispose();
    }
  };
}

export function createDefaultSurfaceMaterial() {
  return new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92
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

export function getGeometryStats(geometry) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const vertexCount = position ? position.count : 0;
  const indexCount = index ? index.count : 0;
  const triangleCount = index ? indexCount / 3 : vertexCount / 3;

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  return {
    vertexCount,
    indexCount,
    triangleCount,
    size,
    hasNormal: Boolean(geometry.getAttribute('normal')),
    hasUv: Boolean(geometry.getAttribute('uv'))
  };
}

export function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
