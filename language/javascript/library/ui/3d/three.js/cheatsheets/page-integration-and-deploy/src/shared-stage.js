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
  camera.position.set(4.8, 3.6, 6.4);
  camera.lookAt(0, 0.2, 0);
  return camera;
}

export function createScene(background = '#dfe8e7') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function addBaseLights(scene) {
  const ambient = new THREE.HemisphereLight('#ffffff', '#6e7f83', 0.72);
  const key = new THREE.DirectionalLight('#ffffff', 1.48);
  key.position.set(-4.2, 5.4, 4.8);
  const fill = new THREE.DirectionalLight('#d8f0ff', 0.34);
  fill.position.set(3.8, 2.4, -3.8);
  scene.add(ambient, key, fill);
  return { ambient, key, fill };
}

export function addReferenceGrid(scene) {
  const grid = new THREE.GridHelper(8, 8, '#8fa0a3', '#c4ceca');
  grid.position.y = -1.12;
  scene.add(grid);
  return grid;
}

export function createHeroMesh(color = '#28747c') {
  const geometry = new THREE.TorusKnotGeometry(0.72, 0.22, 96, 14);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.14
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.12;
  return mesh;
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

  if (camera.aspect !== width / height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  renderer.getDrawingBufferSize(bufferVector);

  return {
    width,
    height,
    bufferWidth: bufferVector.x,
    bufferHeight: bufferVector.y,
    pixelRatio,
    deviceRatio,
    aspect: camera.aspect,
    sizeChanged
  };
}

export function getPointerNdc(event, canvas, target) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return target.set(x, y);
}

export function startRenderLoop(renderFrame) {
  let frameId = 0;
  let running = true;

  function loop(time) {
    if (!running) {
      return;
    }

    renderFrame(time);
    frameId = requestAnimationFrame(loop);
  }

  frameId = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
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

export function createCheckerTexture({
  size = 256,
  label = 'TEX',
  hue = 176
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const cell = size / 8;
  context.fillStyle = '#fbfcfa';
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const even = (x / cell + y / cell) % 2 === 0;
      context.fillStyle = even
        ? `hsl(${hue} 46% 42%)`
        : `hsl(${(hue + 155) % 360} 62% 52%)`;
      context.fillRect(x, y, cell, cell);
    }
  }

  context.fillStyle = 'rgba(31, 42, 46, 0.84)';
  context.font = `bold ${Math.max(18, size / 8)}px sans-serif`;
  context.fillText(label, size * 0.08, size * 0.2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = `${label}CanvasTexture`;
  return texture;
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
