import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  groupX: 0,
  rotationY: 0,
  scale: 1,
  axes: true
};

function createVehicleGroup() {
  const vehicle = new THREE.Group();
  vehicle.name = 'vehicle';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#4f8cff', roughness: 0.42 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: '#e58b35', roughness: 0.52 });
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#243746', roughness: 0.65 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1), bodyMaterial);
  body.name = 'body';
  body.position.y = 0.15;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.82), accentMaterial);
  cabin.name = 'cabin';
  cabin.position.set(-0.35, 0.78, 0);

  const wheels = new THREE.Group();
  wheels.name = 'wheels';
  const wheelGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.24, 32);

  for (const x of [-0.82, 0.82]) {
    for (const z of [-0.58, 0.58]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.name = 'wheel';
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, -0.22, z);
      wheels.add(wheel);
    }
  }

  vehicle.add(body, cabin, wheels);

  return { vehicle, body, materials: [bodyMaterial, accentMaterial, wheelMaterial] };
}

export function createGroupContainerScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const { vehicle, body } = createVehicleGroup();
  const axes = new THREE.AxesHelper(1.7);

  scene.add(vehicle);

  function setAxesMounted() {
    if (state.axes && !axes.parent) {
      vehicle.add(axes);
    }

    if (!state.axes && axes.parent) {
      vehicle.remove(axes);
    }
  }

  function updateGroupTransform() {
    // Group 只改整组的局部坐标系；子对象的 local position 不会被改写。
    vehicle.position.x = state.groupX;
    vehicle.rotation.y = THREE.MathUtils.degToRad(state.rotationY);
    vehicle.scale.setScalar(state.scale);
    setAxesMounted();
  }

  function publishSnapshot() {
    let traversed = 0;
    vehicle.traverse(() => {
      traversed += 1;
    });

    const groupWorldPosition = vehicle.getWorldPosition(new THREE.Vector3());

    onSnapshot?.({
      children: vehicle.children.length,
      traversed,
      worldX: groupWorldPosition.x,
      bodyLocalX: body.position.x,
      groupX: state.groupX,
      rotationY: state.rotationY,
      scale: state.scale
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    updateGroupTransform();
    publishSnapshot();
    renderer.render(scene, camera);
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setGroupX(groupX) {
      state.groupX = groupX;
      render();
    },
    setRotationY(rotationY) {
      state.rotationY = rotationY;
      render();
    },
    setScale(scale) {
      state.scale = scale;
      render();
    },
    setAxes(enabled) {
      state.axes = enabled;
      render();
    },
    dispose() {
      observer.disconnect();
      if (!axes.parent) {
        disposeObjectTree(axes);
      }
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
