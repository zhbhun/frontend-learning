import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects
} from '../shared-scene.js';

const initialState = {
  fov: 55,
  near: 0.1,
  far: 40,
  distance: 8,
  lastTime: 0,
  animationId: 0
};

export function createPerspectiveScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  // 透视投影用 fov 产生近大远小；near/far 限制相机能看见的深度范围。
  const camera = new THREE.PerspectiveCamera(state.fov, 1, state.near, state.far);
  placeCamera(camera, state.distance);

  function updateProjection(width, height) {
    camera.fov = state.fov;
    camera.aspect = width / height;
    camera.near = state.near;
    camera.far = Math.max(state.far, state.near + 0.1);
    camera.updateProjectionMatrix();
  }

  function publishSnapshot() {
    onSnapshot?.({
      fov: camera.fov,
      aspect: camera.aspect,
      near: camera.near,
      far: camera.far,
      distance: state.distance,
      positionText: formatVector(camera.position)
    });
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    updateProjection(width, height);
    publishSnapshot();
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    rotateObjects(world.objects, delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
    state.animationId = window.requestAnimationFrame(render);
  }

  resize();
  render();

  const observer = createResizeObserver(canvas, resize);

  return {
    setFov(fov) {
      state.fov = fov;
      resize();
    },
    setNear(near) {
      state.near = near;
      resize();
    },
    setFar(far) {
      state.far = far;
      resize();
    },
    setDistance(distance) {
      state.distance = distance;
      placeCamera(camera, distance);
      publishSnapshot();
    },
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      observer.disconnect();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
