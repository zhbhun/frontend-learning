import * as THREE from 'three';
import {
  createBackPlate,
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';

const SIDE_MAP = {
  front: THREE.FrontSide,
  back: THREE.BackSide,
  double: THREE.DoubleSide
};

const SIDE_LABEL = {
  front: 'FrontSide',
  back: 'BackSide',
  double: 'DoubleSide'
};

export function createTransparencyDepthLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene } = createBaseScene();
  const camera = createCamera();
  const state = {
    opacity: 0.55,
    side: 'double',
    transparent: true,
    depthTest: true,
    depthWrite: false,
    wireframe: false
  };
  const blueMaterial = new THREE.MeshStandardMaterial({
    color: '#2f83d8',
    transparent: state.transparent,
    opacity: state.opacity,
    side: SIDE_MAP[state.side],
    depthTest: state.depthTest,
    depthWrite: state.depthWrite
  });
  const orangeMaterial = new THREE.MeshStandardMaterial({
    color: '#d6832b',
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const planeGeometry = new THREE.PlaneGeometry(2.45, 2.45, 1, 1);
  const bluePlane = new THREE.Mesh(planeGeometry, blueMaterial);
  const orangePlane = new THREE.Mesh(planeGeometry, orangeMaterial);
  const solidSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.38 })
  );

  bluePlane.rotation.y = -0.58;
  orangePlane.rotation.y = 0.58;
  orangePlane.position.z = 0.05;
  solidSphere.position.set(0, -0.55, 0.2);
  scene.add(createBackPlate(), bluePlane, orangePlane, solidSphere);

  function updateMaterial() {
    blueMaterial.opacity = state.opacity;
    blueMaterial.transparent = state.transparent;
    blueMaterial.side = SIDE_MAP[state.side];
    blueMaterial.depthTest = state.depthTest;
    blueMaterial.depthWrite = state.depthWrite;
    blueMaterial.wireframe = state.wireframe;
    blueMaterial.needsUpdate = true;

    writeText('transparent-state', String(blueMaterial.transparent));
    writeText('opacity-state', formatNumber(blueMaterial.opacity));
    writeText('side-state', SIDE_LABEL[state.side]);
    writeText('depth-state', `test ${blueMaterial.depthTest}; write ${blueMaterial.depthWrite}`);
  }

  bindRange('opacity', 'opacity-value', formatNumber, (value) => {
    state.opacity = value;
    updateMaterial();
  });
  bindSelect('side', (value) => {
    state.side = value;
    updateMaterial();
  });
  bindCheckbox('transparent', (checked) => {
    state.transparent = checked;
    updateMaterial();
  });
  bindCheckbox('depth-test', (checked) => {
    state.depthTest = checked;
    updateMaterial();
  });
  bindCheckbox('depth-write', (checked) => {
    state.depthWrite = checked;
    updateMaterial();
  });
  bindCheckbox('wireframe', (checked) => {
    state.wireframe = checked;
    updateMaterial();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    bluePlane.rotation.z = Math.sin(time * 0.55) * 0.06;
    orangePlane.rotation.z = -Math.sin(time * 0.55) * 0.06;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
