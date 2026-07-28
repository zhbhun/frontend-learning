/*
本示例演示 PerspectiveCamera 的 fov、near、far 和相机距离如何影响透视画面。
Storybook 的 Controls 面板直接对应 camera.fov / camera.near / camera.far，distance 走 placeCamera()。

读代码先看 updateProjection()：它把当前状态写回投影参数，再调用 updateProjectionMatrix() 生效。
预期观察：fov 越大视角越广、边缘透视感越强；near 超过最近物体的深度会把它切掉；
far 小于最远物体的深度会让它消失；距离拉大物体整体变小。
*/

import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects
} from '../../../../assets/shared-scene.js';

const initialState = {
  fov: 55,
  near: 0.1,
  far: 40,
  distance: 12
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

  const loop = createRenderLoop(canvas, (delta) => {
    rotateObjects(world.objects, delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
  });

  resize();
  loop.renderOnce();

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
      loop.dispose();
      observer.disconnect();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
