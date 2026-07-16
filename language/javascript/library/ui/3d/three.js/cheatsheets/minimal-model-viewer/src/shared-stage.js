import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf2f1', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

export function createViewerScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf2f1');

  const hemisphere = new THREE.HemisphereLight('#ffffff', '#61727b', 0.9);
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(-3.8, 5.2, 4.4);
  const fill = new THREE.DirectionalLight('#aad8ff', 0.45);
  fill.position.set(4, 2.2, -3.5);

  const grid = new THREE.GridHelper(6, 12, '#64748b', '#c7d2d7');
  grid.position.y = -0.52;

  const environment = createRoomEnvironmentTexture(renderer);
  scene.environment = environment;
  scene.add(hemisphere, key, fill, grid);

  return {
    scene,
    grid,
    lights: { hemisphere, key, fill },
    environment,
    dispose() {
      environment.dispose();
      disposeObjectTree(grid);
    }
  };
}

export function createRoomEnvironmentTexture(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;

  room.dispose();
  pmrem.dispose();
  return texture;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  camera.position.set(3.2, 2.2, 4.4);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.4;
  controls.maxDistance = 40;
  controls.target.set(0, 0, 0);
  controls.update();
  return controls;
}

export function resizeRendererAndCamera(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startRenderLoop(renderer, scene, camera, canvas, controls, onFrame = () => {}) {
  let frameId = 0;

  function render(time) {
    resizeRendererAndCamera(renderer, camera, canvas);
    onFrame(time * 0.001);
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  frameId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frameId);
}

export function frameObject(camera, controls, object, { fitRatio = 1.7, direction, minDistance = 1.8 } = {}) {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object, true);
  if (box.isEmpty()) {
    return null;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = Math.max(minDistance, (maxSize * fitRatio) / (2 * Math.tan(fov / 2)));
  const viewDirection = direction || new THREE.Vector3(0.85, 0.52, 1).normalize();

  camera.position.copy(center).addScaledVector(viewDirection, distance);
  camera.near = Math.max(0.01, distance / 100);
  camera.far = Math.max(100, distance * 100);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();

  return { box, center, size, distance };
}

export function createPlaceholderRoot(label, color = '#d95832') {
  const group = new THREE.Group();
  group.name = label;

  const geometry = new THREE.BoxGeometry(1.15, 1.15, 1.15);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.05,
    wireframe: true
  });
  const box = new THREE.Mesh(geometry, material);
  const axes = new THREE.AxesHelper(1.6);

  group.add(box, axes);
  return group;
}

export function collectModelStats(gltf) {
  const materials = new Set();
  const textures = new Set();
  let meshCount = 0;
  let nodeCount = 0;

  gltf.scene.traverse((object) => {
    nodeCount += 1;

    if (!object.isMesh) {
      return;
    }

    meshCount += 1;
    const childMaterials = Array.isArray(object.material) ? object.material : [object.material];
    childMaterials.forEach((material) => {
      if (!material) {
        return;
      }

      materials.add(material);
      collectMaterialTextures(material, textures);
    });
  });

  return {
    nodeCount,
    meshCount,
    materialCount: materials.size,
    textureCount: textures.size,
    animationCount: gltf.animations.length,
    sceneCount: gltf.scenes.length
  };
}

export function formatVector(vector) {
  return [vector.x, vector.y, vector.z].map(formatNumber).join(' x ');
}

export function formatNumber(value) {
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
}

export function shortUrl(url) {
  return url.split('/').slice(-2).join('/');
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
    const image = texture.image;
    texture.dispose();

    // GLTFLoader 可能通过 ImageBitmap 承载图片；如果浏览器提供 close()，销毁时一起释放。
    if (image && typeof image.close === 'function') {
      image.close();
    }
  });

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
