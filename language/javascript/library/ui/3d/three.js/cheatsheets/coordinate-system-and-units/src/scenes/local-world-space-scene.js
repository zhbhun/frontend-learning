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
  angle: 45,
  parentX: 0,
  childX: 1.6
};

function formatVector(vector) {
  return `(${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)})`;
}

export function createLocalWorldSpaceScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  camera.position.set(5.4, 3.5, 6.8);
  camera.lookAt(0.6, 0.35, 0);

  const scene = createBaseScene();

  const parent = new THREE.Group();
  parent.name = 'parentSpace';

  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.6, 24),
    new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.4 })
  );
  pivot.name = 'parentOrigin';
  pivot.position.y = 0.3;

  const child = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.42 })
  );
  child.name = 'childObject';
  child.position.y = 0.3;

  const parentAxes = new THREE.AxesHelper(1.35);
  const armData = new Float32Array(6);
  const armGeometry = new THREE.BufferGeometry();
  armGeometry.setAttribute('position', new THREE.BufferAttribute(armData, 3));
  const localArm = new THREE.Line(
    armGeometry,
    new THREE.LineBasicMaterial({ color: '#256f85', linewidth: 2 })
  );
  localArm.name = 'childLocalXArm';

  parent.add(pivot, child, parentAxes, localArm);
  scene.add(parent);

  function updateLocalArm() {
    // localArm 挂在 parent 下，所以它的坐标和 child.position 一样都是局部空间。
    armData[0] = 0;
    armData[1] = 0.3;
    armData[2] = 0;
    armData[3] = child.position.x;
    armData[4] = child.position.y;
    armData[5] = child.position.z;
    armGeometry.attributes.position.needsUpdate = true;
    armGeometry.computeBoundingSphere();
  }

  function updateTransforms() {
    parent.position.x = state.parentX;
    parent.rotation.y = THREE.MathUtils.degToRad(state.angle);
    child.position.x = state.childX;
    updateLocalArm();
  }

  function publishSnapshot() {
    const childWorldPosition = child.getWorldPosition(new THREE.Vector3());

    onSnapshot?.({
      angle: state.angle,
      radians: THREE.MathUtils.degToRad(state.angle),
      childLocal: formatVector(child.position),
      childWorld: formatVector(childWorldPosition)
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    updateTransforms();
    publishSnapshot();
    renderer.render(scene, camera);
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setAngle(angle) {
      state.angle = angle;
      render();
    },
    setParentX(parentX) {
      state.parentX = parentX;
      render();
    },
    setChildX(childX) {
      state.childX = childX;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
