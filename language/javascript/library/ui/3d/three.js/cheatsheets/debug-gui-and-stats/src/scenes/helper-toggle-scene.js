/*
本示例演示如何把 Helper 组织成独立调试层，并观察 update() 的时机。
读代码先看 helperMap 和 syncHelpers()：页面开关只改 visible，变换后是否刷新由 autoUpdate 控制。
控件对应 API：AxesHelper/GridHelper/BoxHelper/CameraHelper/DirectionalLightHelper 的 visible，以及 boxHelper.update() / cameraHelper.update() / lightHelper.update()。
预期观察：关闭 update() 后，目标、相机 far 或光源方向变化，helper 线框会停留在旧状态。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  createBaseScene,
  createCamera,
  createDebugMesh,
  createFloor,
  createRenderer,
  disposeObjectTree,
  startRenderLoop
} from '../shared-stage.js';

const initialState = {
  axes: true,
  grid: true,
  box: true,
  camera: true,
  light: true,
  autoUpdate: true,
  rotationY: 25,
  cameraFar: 7
};

export function createHelperToggleScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  camera.position.set(6.2, 4, 7.4);
  camera.lookAt(0, 0.6, 0);

  const scene = createBaseScene();
  const lights = addBaseLights(scene);
  const target = new THREE.Group();
  const mesh = createDebugMesh();
  const localAxes = new THREE.AxesHelper(1.5);
  const debugGroup = new THREE.Group();
  debugGroup.name = 'debugHelperLayer';

  target.name = 'targetWithLocalAxes';
  target.add(mesh, localAxes);
  scene.add(createFloor(), target);

  const debugCamera = new THREE.PerspectiveCamera(38, 1, 0.35, state.cameraFar);
  debugCamera.position.set(-2.9, 2.1, 4.3);
  debugCamera.lookAt(0, 0.6, 0);
  scene.add(debugCamera);

  lights.key.target.position.set(0.4, 0.4, 0);
  scene.add(lights.key.target);

  const gridHelper = new THREE.GridHelper(5, 10, '#5b7186', '#c4d0da');
  const boxHelper = new THREE.BoxHelper(target, '#d45b3f');
  const cameraHelper = new THREE.CameraHelper(debugCamera);
  const lightHelper = new THREE.DirectionalLightHelper(lights.key, 0.7);
  debugGroup.add(gridHelper, boxHelper, cameraHelper, lightHelper);
  scene.add(debugGroup);

  const helperMap = {
    axes: localAxes,
    grid: gridHelper,
    box: boxHelper,
    camera: cameraHelper,
    light: lightHelper
  };

  function syncHelpers() {
    target.rotation.y = THREE.MathUtils.degToRad(state.rotationY);
    debugCamera.far = state.cameraFar;
    lights.key.target.position.x = Math.sin(target.rotation.y) * 0.9;

    Object.entries(helperMap).forEach(([key, helper]) => {
      helper.visible = state[key];
    });

    if (state.autoUpdate) {
      // 不同 helper 读取不同来源：包围盒读目标世界矩阵，相机 helper 读投影矩阵，光源 helper 读 light.target。
      target.updateMatrixWorld(true);
      debugCamera.updateProjectionMatrix();
      debugCamera.updateMatrixWorld(true);
      lights.key.target.updateMatrixWorld(true);
      boxHelper.update();
      cameraHelper.update();
      lightHelper.update();
    }

    publishSnapshot();
  }

  function publishSnapshot() {
    const visibleCount = Object.values(helperMap).filter((helper) => helper.visible).length;

    onSnapshot?.({
      visibleCount,
      updateText: state.autoUpdate ? '已更新' : '保持旧线框',
      toolbarText: state.autoUpdate ? 'updated' : 'stale'
    });
  }

  syncHelpers();
  const stop = startRenderLoop(renderer, scene, camera, canvas, syncHelpers);

  return {
    setAxes(enabled) {
      state.axes = enabled;
      syncHelpers();
    },
    setGrid(enabled) {
      state.grid = enabled;
      syncHelpers();
    },
    setBox(enabled) {
      state.box = enabled;
      syncHelpers();
    },
    setCamera(enabled) {
      state.camera = enabled;
      syncHelpers();
    },
    setLight(enabled) {
      state.light = enabled;
      syncHelpers();
    },
    setAutoUpdate(enabled) {
      state.autoUpdate = enabled;
      syncHelpers();
    },
    setRotationY(value) {
      state.rotationY = value;
      syncHelpers();
    },
    setCameraFar(value) {
      state.cameraFar = value;
      syncHelpers();
    },
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
