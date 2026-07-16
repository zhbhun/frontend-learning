import * as THREE from 'three';

const initialState = {
  running: true,
  parentRotation: 25,
  parentScale: 1,
  childOffset: { x: 2.2, y: 0.6 },
  lastTime: 0,
  animationId: 0
};

export function createHierarchyScene(canvas, onSnapshot) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#eef4f8', 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef4f8');

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(4.6, 3.2, 6.4);
  camera.lookAt(0, 0.5, 0);

  const grid = new THREE.GridHelper(6, 6, '#8fa5ad', '#d1dde2');
  scene.add(grid);
  scene.add(new THREE.AxesHelper(2.2));

  const parent = new THREE.Object3D();
  parent.position.set(0, 0.55, 0);
  scene.add(parent);

  const parentGeometry = new THREE.BoxGeometry(1.2, 0.35, 0.7);
  const parentMaterial = new THREE.MeshNormalMaterial({ flatShading: true });
  const parentMesh = new THREE.Mesh(parentGeometry, parentMaterial);
  parent.add(parentMesh);
  parent.add(new THREE.AxesHelper(1.4));

  const child = new THREE.Object3D();
  child.position.set(initialState.childOffset.x, initialState.childOffset.y, 0);
  parent.add(child);

  const childGeometry = new THREE.SphereGeometry(0.36, 24, 16);
  const childMaterial = new THREE.MeshNormalMaterial({ flatShading: true });
  const childMesh = new THREE.Mesh(childGeometry, childMaterial);
  child.add(childMesh);
  child.add(new THREE.AxesHelper(0.9));

  const markerGeometry = new THREE.SphereGeometry(0.09, 16, 10);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#d7263d' });
  const worldMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  scene.add(worldMarker);

  const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3()
  ]);
  const connectorMaterial = new THREE.LineBasicMaterial({ color: '#4a6670' });
  const connector = new THREE.Line(connectorGeometry, connectorMaterial);
  scene.add(connector);

  const state = {
    ...initialState,
    childOffset: { ...initialState.childOffset }
  };

  const parentWorld = new THREE.Vector3();
  const childWorld = new THREE.Vector3();
  const connectorPositions = connectorGeometry.attributes.position;

  function syncTransforms() {
    parent.rotation.y = THREE.MathUtils.degToRad(state.parentRotation);
    parent.scale.setScalar(state.parentScale);
    child.position.set(state.childOffset.x, state.childOffset.y, 0);
  }

  function syncHelpers() {
    parent.getWorldPosition(parentWorld);
    child.getWorldPosition(childWorld);
    worldMarker.position.copy(childWorld);

    connectorPositions.setXYZ(0, parentWorld.x, parentWorld.y, parentWorld.z);
    connectorPositions.setXYZ(1, childWorld.x, childWorld.y, childWorld.z);
    connectorPositions.needsUpdate = true;
  }

  function publishSnapshot() {
    onSnapshot?.({
      running: state.running,
      parentRotation: state.parentRotation,
      parentScale: state.parentScale,
      parentWorld: parentWorld.clone(),
      childLocal: child.position.clone(),
      childWorld: childWorld.clone()
    });
  }

  function resize() {
    const parentElement = canvas.parentElement;
    const width = Math.max(1, Math.floor(parentElement.clientWidth));
    const height = Math.max(1, Math.floor(parentElement.clientHeight));

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    if (state.running) {
      state.parentRotation = ((state.parentRotation + delta * 28 + 180) % 360) - 180;
      child.rotation.y += delta * 0.8;
    }

    syncTransforms();
    syncHelpers();
    renderer.render(scene, camera);
    publishSnapshot();
    state.animationId = window.requestAnimationFrame(render);
  }

  resize();
  render();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);

  return {
    toggleRunning() {
      state.running = !state.running;
      return state.running;
    },
    setParentRotation(rotation) {
      state.parentRotation = rotation;
      state.running = false;
    },
    setParentScale(scale) {
      state.parentScale = scale;
    },
    setChildOffset(offset) {
      state.childOffset.x = offset.x;
      state.childOffset.y = offset.y;
    },
    reset() {
      state.running = true;
      state.parentRotation = initialState.parentRotation;
      state.parentScale = initialState.parentScale;
      state.childOffset = { ...initialState.childOffset };
      child.rotation.set(0, 0, 0);
    },
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      observer.disconnect();
      parentGeometry.dispose();
      parentMaterial.dispose();
      childGeometry.dispose();
      childMaterial.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      connectorGeometry.dispose();
      connectorMaterial.dispose();
      renderer.dispose();
    }
  };
}
