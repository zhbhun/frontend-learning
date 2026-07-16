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
  camera.position.set(5.4, 3.2, 6.6);
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
  grid.position.y = -1.05;

  scene.add(ambient, key, fill, grid);
  return scene;
}

export function createWebXrPracticeWorld() {
  const scene = createBaseScene();
  const animated = new THREE.Group();
  animated.name = 'WebXR 练习物体';

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.08, 56),
    new THREE.MeshStandardMaterial({
      color: '#dbe8f2',
      roughness: 0.72,
      metalness: 0.02
    })
  );
  floor.position.y = -1.08;

  const cube = createPickableMesh('蓝色盒子', new THREE.BoxGeometry(0.72, 0.72, 0.72), '#2f83d8');
  cube.position.set(-1.15, -0.48, 0);

  const sphere = createPickableMesh('绿色球体', new THREE.SphereGeometry(0.43, 32, 20), '#36a269');
  sphere.position.set(0, -0.44, -0.16);

  const knot = createPickableMesh(
    '橙色圆环',
    new THREE.TorusKnotGeometry(0.32, 0.12, 72, 12),
    '#d6832b'
  );
  knot.position.set(1.18, -0.46, 0.02);

  animated.add(cube, sphere, knot);
  scene.add(floor, animated);

  return {
    scene,
    animated,
    pickables: [cube, sphere, knot]
  };
}

export function createPickableMesh(name, geometry, color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.04
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.userData.baseColor = new THREE.Color(color);
  return mesh;
}

export function resizeForCanvas(renderer, camera, canvas) {
  if (renderer.xr.isPresenting) {
    return;
  }

  const parent = canvas.parentElement;
  const width = Math.max(1, Math.floor(parent.clientWidth));
  const height = Math.max(1, Math.floor(parent.clientHeight));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function startAnimationLoop(renderer, scene, camera, canvas, onFrame = () => {}) {
  const state = {
    previousTime: 0,
    frameCount: 0
  };

  function render(time = 0, xrFrame = null) {
    resizeForCanvas(renderer, camera, canvas);

    const elapsed = time * 0.001;
    const delta = state.previousTime ? Math.min(0.05, elapsed - state.previousTime) : 0;
    state.previousTime = elapsed;
    state.frameCount += 1;

    onFrame({
      elapsed,
      delta,
      frameCount: state.frameCount,
      xrFrame,
      isPresenting: renderer.xr.isPresenting
    });

    renderer.render(scene, camera);
  }

  // setAnimationLoop 会在普通 canvas 和 XR session 下切换正确的帧来源。
  renderer.setAnimationLoop(render);
  return () => renderer.setAnimationLoop(null);
}

export function formatBoolean(value) {
  return value ? '是' : '否';
}

export function formatSize(renderer) {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  return `${Math.round(size.x)} x ${Math.round(size.y)} CSS px`;
}

export function formatDegrees(value) {
  return `${value.toFixed(0)}°`;
}

export function setPickState(object, state) {
  if (!object) {
    return;
  }

  const baseColor = object.userData.baseColor;
  object.material.color.copy(baseColor);
  object.material.emissive.set(state === 'active' ? '#7f1d1d' : state === 'hover' ? '#b45309' : '#000000');
  object.scale.setScalar(state === 'active' ? 1.16 : state === 'hover' ? 1.08 : 1);
}

export function raycastFromObject(raycaster, originObject, targets) {
  const rotation = new THREE.Matrix4();
  rotation.identity().extractRotation(originObject.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(originObject.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation).normalize();
  return raycaster.intersectObjects(targets, false);
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
