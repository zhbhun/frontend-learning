import * as THREE from 'three';

const sizeVector = new THREE.Vector2();
const bufferVector = new THREE.Vector2();

export function createRenderer(canvas, clearColor = '#dfe8e7') {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });

  renderer.setClearColor(clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(4.6, 3.4, 6.2);
  camera.lookAt(0, 0.15, 0);
  return camera;
}

export function createScene(background = '#dfe8e7') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function addStudioLights(scene) {
  const ambient = new THREE.HemisphereLight('#ffffff', '#667b7e', 0.72);
  const key = new THREE.DirectionalLight('#ffffff', 1.45);
  key.position.set(-4.2, 5.6, 4.8);
  const fill = new THREE.DirectionalLight('#d8f0ff', 0.36);
  fill.position.set(4, 2.2, -3.8);
  scene.add(ambient, key, fill);
  return { ambient, key, fill };
}

export function addReferenceGrid(scene) {
  const grid = new THREE.GridHelper(8, 8, '#8fa0a3', '#c4ceca');
  grid.position.y = -1.12;
  scene.add(grid);
  return grid;
}

export function syncRendererSize({
  renderer,
  camera,
  element,
  pixelRatioLimit = 2
}) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const deviceRatio = window.devicePixelRatio || 1;
  const pixelRatio = Math.max(1, Math.min(deviceRatio, pixelRatioLimit));

  if (renderer.getPixelRatio() !== pixelRatio) {
    renderer.setPixelRatio(pixelRatio);
  }

  renderer.getSize(sizeVector);
  const sizeChanged = sizeVector.x !== width || sizeVector.y !== height;

  if (sizeChanged) {
    renderer.setSize(width, height, false);
  }

  const nextAspect = width / height;
  if (camera.aspect !== nextAspect) {
    camera.aspect = nextAspect;
    camera.updateProjectionMatrix();
  }

  renderer.getDrawingBufferSize(bufferVector);

  return {
    width,
    height,
    bufferWidth: bufferVector.x,
    bufferHeight: bufferVector.y,
    pixelRatio,
    sizeChanged
  };
}

export function readRendererInfo(renderer) {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0
  };
}

export function createFrameworkMesh(color = '#28747c') {
  const geometry = new THREE.TorusKnotGeometry(0.72, 0.22, 96, 14);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.14
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.1;
  return mesh;
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

  textures.forEach((texture) => {
    texture.dispose();
    if (texture.image && typeof texture.image.close === 'function') {
      texture.image.close();
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());

  return {
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size
  };
}

function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value?.isTexture) {
      textures.add(value);
    }
  });
}
