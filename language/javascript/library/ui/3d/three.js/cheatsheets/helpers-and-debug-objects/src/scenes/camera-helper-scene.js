/*
本示例演示 CameraHelper 如何把另一个相机的视锥体画出来。
读代码先看 debugCamera 和 syncDebugCamera()：页面控件写回 fov、near、far。
预期观察：fov 改变视锥开口，near/far 改变近远裁剪面；改投影参数后要先 updateProjectionMatrix()，再 cameraHelper.update()。
*/

import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createDebugTarget,
  createFloor,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  fov: 40,
  near: 0.5,
  far: 8
};

export function createCameraHelperScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  camera.position.set(6, 4, 7.5);
  camera.lookAt(0, 0.6, 0);

  const scene = createBaseScene();
  const target = createDebugTarget();
  scene.add(createFloor(), target);

  const debugCamera = new THREE.PerspectiveCamera(state.fov, 1, state.near, state.far);
  debugCamera.position.set(-2.7, 2.3, 4.6);
  debugCamera.lookAt(0, 0.45, 0);
  scene.add(debugCamera);

  const cameraHelper = new THREE.CameraHelper(debugCamera);
  scene.add(cameraHelper);

  function syncDebugCamera() {
    debugCamera.fov = state.fov;
    debugCamera.near = state.near;
    debugCamera.far = Math.max(state.far, state.near + 0.5);

    // 透视参数进入 projectionMatrix；Helper 读取相机矩阵后才知道视锥新形状。
    debugCamera.updateProjectionMatrix();
    debugCamera.updateMatrixWorld();
    cameraHelper.update();
  }

  function publishSnapshot() {
    onSnapshot?.({
      fov: debugCamera.fov,
      near: debugCamera.near,
      far: debugCamera.far,
      rangeText: `${debugCamera.near.toFixed(1)} 到 ${debugCamera.far.toFixed(1)}`,
      updateText: 'updateProjectionMatrix() + helper.update()'
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    syncDebugCamera();
    renderer.render(scene, camera);
    publishSnapshot();
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setFov(value) {
      state.fov = value;
      render();
    },
    setNear(value) {
      state.near = value;
      render();
    },
    setFar(value) {
      state.far = value;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
