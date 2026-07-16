import * as THREE from 'three';

export function createRenderer(canvas, clearColor = '#eef3f6') {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function createCamera({ position = [6.6, 5.2, 8.2], target = [0, 0.9, 0] } = {}) {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  camera.position.set(...position);
  camera.lookAt(...target);
  return camera;
}

export function createBaseScene(background = '#eef3f6') {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  return scene;
}

export function addBaseLights(scene) {
  const ambient = new THREE.HemisphereLight('#ffffff', '#64748b', 0.76);
  const key = new THREE.DirectionalLight('#ffffff', 1.65);
  key.position.set(-4.5, 7.2, 5.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(ambient, key);
  return { ambient, key };
}

export function addReferenceGrid(scene, size = 12) {
  const grid = new THREE.GridHelper(size, size, '#93a4b7', '#d4dde7');
  grid.position.y = 0.01;
  scene.add(grid);
  return grid;
}

export function createGroundMesh({ width = 12, depth = 7, thickness = 0.2, color = '#8fb3a5' } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, thickness, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0.04
    })
  );
  mesh.position.y = -thickness / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent?.clientWidth ?? canvas.clientWidth));
  const height = Math.max(1, Math.floor(parent?.clientHeight ?? canvas.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startRenderLoop({ renderer, scene, camera, canvas, onFrame = () => {}, onAfterRender = () => {} }) {
  let frameId = 0;
  let lastTime = 0;

  function render(timeMs = 0) {
    const time = timeMs * 0.001;
    const delta = lastTime > 0 ? time - lastTime : 0;
    lastTime = time;

    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame({ time, delta });
    renderer.render(scene, camera);
    onAfterRender();
    frameId = requestAnimationFrame(render);
  }

  frameId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frameId);
}

export function syncMeshToBody(mesh, body, offsetX = 0) {
  const position = body.translation();
  const rotation = body.rotation();

  mesh.position.set(position.x + offsetX, position.y, position.z);
  mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
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

export function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value?.isTexture) {
      textures.add(value);
    }
  });
}

export function disposeRendererLesson({ stop, scene, renderer }) {
  stop?.();
  disposeObjectTree(scene);
  renderer.dispose();
}

export function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

export function formatVector(vector, digits = 2) {
  return `(${formatNumber(vector.x, digits)}, ${formatNumber(vector.y, digits)}, ${formatNumber(vector.z, digits)})`;
}

export function makeBodyLabelTexture(text, color = '#263241') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(255,255,255,0.86)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = 'bold 28px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTextSprite(text, position, color = '#263241') {
  const texture = makeBodyLabelTexture(text, color);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(...position);
  sprite.scale.set(1.8, 0.45, 1);
  return sprite;
}

export function createColliderWire(kind, options) {
  const material = new THREE.MeshBasicMaterial({
    color: '#e26d5a',
    wireframe: true,
    transparent: true,
    opacity: 0.9
  });

  if (kind === 'cuboid') {
    return new THREE.Mesh(new THREE.BoxGeometry(options.x * 2, options.y * 2, options.z * 2), material);
  }

  if (kind === 'ball') {
    return new THREE.Mesh(new THREE.SphereGeometry(options.radius, 18, 12), material);
  }

  return new THREE.Mesh(new THREE.CapsuleGeometry(options.radius, options.halfHeight * 2, 8, 16), material);
}
