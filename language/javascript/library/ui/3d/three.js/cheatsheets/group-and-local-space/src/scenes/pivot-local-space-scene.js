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
  offset: 1.2,
  pivotX: 0
};

export function createPivotLocalSpaceScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  camera.position.set(4.8, 3.2, 6.8);
  camera.lookAt(0.7, 0.3, 0);

  const scene = createBaseScene();
  const pivotGroup = new THREE.Group();
  pivotGroup.name = 'doorPivot';

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.55, 0.12),
    new THREE.MeshStandardMaterial({ color: '#4f8cff', roughness: 0.45 })
  );
  panel.name = 'panel';
  panel.position.y = 0.15;

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.9, 24),
    new THREE.MeshStandardMaterial({ color: '#e58b35', roughness: 0.5 })
  );
  hinge.name = 'pivotMarker';
  hinge.position.y = 0.15;

  const axes = new THREE.AxesHelper(1.4);
  pivotGroup.add(hinge, panel, axes);
  scene.add(pivotGroup);

  function updateGroupTransform() {
    // panel 偏离 group 原点；旋转 pivotGroup 时，panel 会围绕这个原点运动。
    pivotGroup.position.x = state.pivotX;
    pivotGroup.rotation.y = THREE.MathUtils.degToRad(state.angle);
    panel.position.x = state.offset;
  }

  function publishSnapshot() {
    const panelWorldPosition = panel.getWorldPosition(new THREE.Vector3());
    const pivotWorldPosition = pivotGroup.getWorldPosition(new THREE.Vector3());

    onSnapshot?.({
      angle: state.angle,
      offset: state.offset,
      pivotX: state.pivotX,
      panelLocalX: panel.position.x,
      panelWorldX: panelWorldPosition.x,
      panelWorldZ: panelWorldPosition.z,
      pivotWorldX: pivotWorldPosition.x
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
    setAngle(angle) {
      state.angle = angle;
      render();
    },
    setOffset(offset) {
      state.offset = offset;
      render();
    },
    setPivotX(pivotX) {
      state.pivotX = pivotX;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
