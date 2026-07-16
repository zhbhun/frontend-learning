import * as THREE from 'three';
import {
  createCamera,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  background: '#dbeafe',
  fog: true,
  near: 4,
  far: 13
};

export function createBackgroundFogScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  camera.position.set(4.5, 2.6, 8.5);
  camera.lookAt(0, 0.25, -4.2);

  const scene = new THREE.Scene();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 18),
    new THREE.MeshStandardMaterial({ color: '#f3f7fb', roughness: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.65, -4.8);

  const rowMaterial = new THREE.MeshStandardMaterial({
    color: '#4f8cff',
    roughness: 0.42,
    metalness: 0.05
  });
  const rowGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);

  // 一排物体沿 z 轴伸向远处，用来观察 Fog 的 near/far 如何影响深度感。
  for (let index = 0; index < 9; index += 1) {
    const mesh = new THREE.Mesh(rowGeometry, rowMaterial);
    mesh.position.set(index % 2 === 0 ? -0.65 : 0.65, -0.25, -index * 1.45);
    scene.add(mesh);
  }

  const hemi = new THREE.HemisphereLight('#ffffff', '#8fa2b7', 0.65);
  const key = new THREE.DirectionalLight('#ffffff', 2.1);
  key.position.set(3, 5, 4);
  scene.add(floor, hemi, key);

  function updateSceneState() {
    const far = Math.max(state.near + 0.5, state.far);

    scene.background = new THREE.Color(state.background);
    scene.fog = state.fog ? new THREE.Fog(state.background, state.near, far) : null;
  }

  function publishSnapshot() {
    const far = Math.max(state.near + 0.5, state.far);

    onSnapshot?.({
      background: state.background,
      fog: state.fog,
      near: state.near,
      far
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    updateSceneState();
    publishSnapshot();
    renderer.render(scene, camera);
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setBackground(color) {
      state.background = color;
      render();
    },
    setFog(enabled) {
      state.fog = enabled;
      render();
    },
    setNear(near) {
      state.near = near;
      render();
    },
    setFar(far) {
      state.far = far;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
