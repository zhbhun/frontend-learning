import * as THREE from 'three';

export const target = new THREE.Vector3(0, 0.7, 0);

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf3ef', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function readCanvasSize(canvas) {
  const parent = canvas.parentElement;

  return {
    width: Math.max(1, Math.floor(parent.clientWidth)),
    height: Math.max(1, Math.floor(parent.clientHeight))
  };
}

export function createResizeObserver(canvas, resize) {
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  return observer;
}

export function placeCamera(camera, distance) {
  camera.position.set(distance, distance * 0.5, distance);
  camera.lookAt(target);
}

export function formatVector(vector) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}

export function rotateObjects(objects, delta) {
  objects.forEach((object, index) => {
    object.rotation.x += delta * (0.14 + index * 0.04);
    object.rotation.y += delta * (0.2 + index * 0.05);
  });
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

export function createCameraTargetScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf3ef');

  const grid = new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7');
  scene.add(grid);
  scene.add(new THREE.AxesHelper(2.5));

  const group = new THREE.Group();
  scene.add(group);

  const materials = [
    new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 }),
    new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: '#2f8b72', roughness: 0.58 }),
    new THREE.MeshStandardMaterial({ color: '#8f5ac7', roughness: 0.5 })
  ];

  const geometries = [
    new THREE.BoxGeometry(1.05, 1.05, 1.05),
    new THREE.SphereGeometry(0.56, 28, 18),
    new THREE.ConeGeometry(0.62, 1.2, 28),
    new THREE.TorusGeometry(0.48, 0.18, 16, 28)
  ];

  const positions = [
    new THREE.Vector3(-3.0, 0.75, -3.2),
    new THREE.Vector3(-1.0, 0.75, -1.4),
    new THREE.Vector3(1.0, 0.75, 0.6),
    new THREE.Vector3(3.0, 0.75, 2.6)
  ];

  const padGeometry = new THREE.PlaneGeometry(1.55, 1.55);
  const padMaterials = ['#d8eadf', '#d9e7f0', '#eee1d2', '#eadbe5'].map(
    (color) =>
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide
      })
  );

  positions.forEach((position, index) => {
    const pad = new THREE.Mesh(padGeometry, padMaterials[index]);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(position.x, 0.02, position.z);
    group.add(pad);
  });

  const objects = positions.map((position, index) => {
    const mesh = new THREE.Mesh(geometries[index], materials[index]);
    mesh.position.copy(position);
    mesh.rotation.set(index * 0.22, index * 0.45, 0);
    group.add(mesh);
    return mesh;
  });

  const depthLineGeometry = new THREE.BufferGeometry().setFromPoints(
    positions.map((position) => position.clone().setY(0.08))
  );
  const depthLineMaterial = new THREE.LineBasicMaterial({ color: '#486156' });
  const depthLine = new THREE.Line(depthLineGeometry, depthLineMaterial);
  group.add(depthLine);

  const targetGeometry = new THREE.SphereGeometry(0.12, 16, 10);
  const targetMaterial = new THREE.MeshBasicMaterial({ color: '#9a3f32' });
  const targetMarker = new THREE.Mesh(targetGeometry, targetMaterial);
  targetMarker.position.copy(target);
  scene.add(targetMarker);

  const hemi = new THREE.HemisphereLight('#ffffff', '#78908a', 0.68);
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(3, 5, 4);
  scene.add(hemi, key);

  return {
    scene,
    objects,
    targetMarker
  };
}
