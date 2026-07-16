export function createCamera(THREE, { position = [3.4, 2.2, 4.6], target = [0, 0.15, 0] } = {}) {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  camera.position.fromArray(position);
  camera.lookAt(...target);
  return camera;
}

export function createBaseScene(THREE, { background = '#101827' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  const ambient = new THREE.AmbientLight('#ffffff', 0.65);
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(3, 4, 2);

  const fill = new THREE.DirectionalLight('#7fb8ff', 0.8);
  fill.position.set(-3, 2, -2);

  scene.add(ambient, key, fill);
  return scene;
}

export function createGrid(THREE, { y = -0.85 } = {}) {
  const grid = new THREE.GridHelper(5.5, 11, '#7891aa', '#27364a');
  grid.position.y = y;
  return grid;
}

export function syncRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));
  const pixelRatio = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2));

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  return {
    width,
    height,
    pixelRatio,
    drawingWidth: Math.round(width * pixelRatio),
    drawingHeight: Math.round(height * pixelRatio)
  };
}

export function startLoop(onFrame) {
  let frameId = 0;
  let previousTime = 0;

  function tick(time) {
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    onFrame(time * 0.001, delta);
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

export function disposeScene(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  scene.traverse((object) => {
    if (object.geometry) {
      geometries.add(object.geometry);
    }

    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];

    objectMaterials.forEach((material) => {
      materials.add(material);
      collectMaterialTextures(material, textures);
    });
  });

  textures.forEach((texture) => texture.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function getWebGPUBackendLabel(THREE, renderer) {
  if (renderer.coordinateSystem === THREE.WebGPUCoordinateSystem) {
    return 'WebGPU 后端';
  }

  if (renderer.coordinateSystem === THREE.WebGLCoordinateSystem) {
    return 'WebGL2 fallback 后端';
  }

  return '未知后端';
}

function collectMaterialTextures(material, textures) {
  Object.values(material).forEach((value) => {
    if (value && value.isTexture) {
      textures.add(value);
    }
  });
}
