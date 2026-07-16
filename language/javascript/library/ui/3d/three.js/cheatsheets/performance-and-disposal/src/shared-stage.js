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
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  camera.position.set(5.2, 4.1, 7.2);
  camera.lookAt(0, 0.2, 0);
  return camera;
}

export function createBaseScene(background = '#eef2f6') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function addBaseLights(scene) {
  const ambient = new THREE.HemisphereLight('#ffffff', '#6b7f94', 0.72);
  const key = new THREE.DirectionalLight('#ffffff', 1.55);
  key.position.set(-4.4, 5.2, 4.6);
  scene.add(ambient, key);
  return { ambient, key };
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent?.clientWidth ?? canvas.clientWidth));
  const height = Math.max(1, Math.floor(parent?.clientHeight ?? canvas.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startRenderLoop(renderer, scene, camera, canvas, onFrame = () => {}, onAfterRender = () => {}) {
  let frameId = 0;

  function render(time) {
    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame(time * 0.001);
    renderer.render(scene, camera);
    onAfterRender(readRendererInfo(renderer));
    frameId = requestAnimationFrame(render);
  }

  frameId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frameId);
}

export function renderOnce(renderer, scene, camera, canvas) {
  resizeRendererAndCamera(renderer, camera, canvas);
  renderer.render(scene, camera);
  return readRendererInfo(renderer);
}

export function readRendererInfo(renderer) {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0
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

  textures.forEach((texture) => disposeTexture(texture));
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function disposeRetainedResource(resource) {
  if (!resource) {
    return;
  }

  if (resource.isObject3D) {
    disposeObjectTree(resource);
    return;
  }

  if (resource.isTexture) {
    disposeTexture(resource);
    return;
  }

  if (typeof resource.dispose === 'function') {
    resource.dispose();
  }
}

export function disposeTexture(texture) {
  texture.dispose();

  if (texture.image && typeof texture.image.close === 'function') {
    texture.image.close();
  }
}

export function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value && value.isTexture) {
      textures.add(value);
    }
  });
}

export function formatNumber(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('zh-CN') : '0';
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function createPatternCanvas({ size = 256, label = 'TEX', hue = 205 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const cell = Math.max(8, size / 8);

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const even = ((x / cell) + (y / cell)) % 2 === 0;
      context.fillStyle = even ? `hsl(${hue} 70% 48%)` : `hsl(${(hue + 145) % 360} 62% 52%)`;
      context.fillRect(x, y, cell, cell);
    }
  }

  context.strokeStyle = 'rgba(17, 24, 39, 0.45)';
  context.lineWidth = Math.max(2, size / 96);
  context.strokeRect(context.lineWidth, context.lineWidth, size - context.lineWidth * 2, size - context.lineWidth * 2);
  context.fillStyle = 'rgba(17, 24, 39, 0.82)';
  context.font = `bold ${Math.max(16, size / 9)}px sans-serif`;
  context.fillText(label, Math.max(10, size / 16), Math.max(28, size / 5));
  return canvas;
}

export function createCanvasTexture({ size = 256, label = 'TEX', hue = 205 } = {}) {
  const texture = new THREE.CanvasTexture(createPatternCanvas({ size, label, hue }));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = `${label}CanvasTexture`;
  return texture;
}

export function createDataTexture({ size = 256, hueOffset = 0 } = {}) {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const band = (Math.floor(x / Math.max(4, size / 16)) + Math.floor(y / Math.max(4, size / 16))) % 2;
      data[index] = band ? 47 + hueOffset : 232;
      data[index + 1] = band ? 131 : 248 - hueOffset * 0.2;
      data[index + 2] = band ? 216 - hueOffset * 0.25 : 252;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = `${size}DataTexture`;
  return texture;
}

export function estimateRgbaTextureBytes(size, count, useMipmaps) {
  const base = size * size * 4 * count;
  return Math.round(useMipmaps ? base * (4 / 3) : base);
}
