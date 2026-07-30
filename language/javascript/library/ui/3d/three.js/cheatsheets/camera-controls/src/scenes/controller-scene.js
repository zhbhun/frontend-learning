/*
本文件为 MapControls、TrackballControls、FlyControls、FirstPersonControls 和
PointerLockControls 提供同一组可观察场景。每个 Story 都创建一个独立控制器，
把右侧 Controls 里的参数同步到真实 API，并在读数中显示更新方式、焦点或相机位置。

读代码先看 createControls()：它决定控制器类型；再看渲染循环里的 update 分支，
其中 FlyControls 和 FirstPersonControls 使用秒级 delta，PointerLockControls 由指针事件驱动。
预期观察：五个 Canvas 的场景相同，但相机的移动模型、滚转能力和生命周期接入方式不同。
*/

import * as THREE from 'three';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

import {
  createCameraTargetScene,
  createRenderLoop,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects
} from '../../../../assets/shared-scene.js';

const CONTROLLER_LABELS = {
  map: 'MapControls',
  trackball: 'TrackballControls',
  fly: 'FlyControls',
  firstPerson: 'FirstPersonControls',
  pointerLock: 'PointerLockControls'
};

const UPDATE_LABELS = {
  map: 'update()',
  trackball: 'update()',
  fly: 'update(delta)',
  firstPerson: 'update(delta)',
  pointerLock: '指针事件'
};

const initialState = {
  enableDamping: true,
  maxPolarAngle: Math.PI / 2.2,
  staticMoving: false,
  dynamicDampingFactor: 0.2,
  movementSpeed: 5,
  rollSpeed: Math.PI / 12,
  dragToLook: true,
  lookSpeed: 0.05,
  lookVertical: true,
  pointerSpeed: 1
};

export function createCameraControlScene(canvas, onSnapshot, type) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();
  world.targetMarker.visible = type === 'map' || type === 'trackball';

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  placeCamera(camera, 12);

  const controls = createControls(type, camera, renderer.domElement);
  let pointerLockHandler;

  if (type === 'pointerLock') {
    pointerLockHandler = () => controls.lock();
    renderer.domElement.addEventListener('click', pointerLockHandler);
  }

  function syncControls() {
    if (type === 'map') {
      controls.enableDamping = state.enableDamping;
      controls.maxPolarAngle = state.maxPolarAngle;
    }

    if (type === 'trackball') {
      controls.staticMoving = state.staticMoving;
      controls.dynamicDampingFactor = state.dynamicDampingFactor;
    }

    if (type === 'fly') {
      controls.movementSpeed = state.movementSpeed;
      controls.rollSpeed = state.rollSpeed;
      controls.dragToLook = state.dragToLook;
    }

    if (type === 'firstPerson') {
      controls.movementSpeed = state.movementSpeed;
      controls.lookSpeed = state.lookSpeed;
      controls.lookVertical = state.lookVertical;
    }

    if (type === 'pointerLock') {
      controls.pointerSpeed = state.pointerSpeed;
    }

    if (type === 'fly' || type === 'firstPerson') {
      controls.update(0);
    } else if (type !== 'pointerLock') {
      controls.update();
    }
  }

  function publishSnapshot() {
    const hasTarget = 'target' in controls;
    const focus = hasTarget ? formatVector(controls.target) : '无固定 target';
    const value = hasTarget
      ? camera.position.distanceTo(controls.target).toFixed(2)
      : formatVector(camera.position);
    const lockState = type === 'pointerLock'
      ? controls.isLocked
        ? '已锁定'
        : '未锁定'
      : '不适用';

    onSnapshot?.({
      controller: CONTROLLER_LABELS[type],
      updateMode: UPDATE_LABELS[type],
      focus,
      value,
      lockState
    });
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    publishSnapshot();
  }

  const loop = createRenderLoop(canvas, (delta) => {
    rotateObjects(world.objects, delta);

    if (type === 'fly' || type === 'firstPerson') {
      controls.update(delta);
    } else if (type !== 'pointerLock') {
      controls.update();
    }

    renderer.render(world.scene, camera);
    publishSnapshot();
  });

  syncControls();
  resize();
  loop.renderOnce();

  const observer = createResizeObserver(canvas, resize);

  return {
    apply(nextState) {
      Object.assign(state, nextState);
      syncControls();
      publishSnapshot();
    },
    dispose() {
      loop.dispose();
      observer.disconnect();

      if (pointerLockHandler) {
        renderer.domElement.removeEventListener('click', pointerLockHandler);
      }

      controls.dispose();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}

function createControls(type, camera, domElement) {
  switch (type) {
    case 'map':
      return new MapControls(camera, domElement);
    case 'trackball':
      return new TrackballControls(camera, domElement);
    case 'fly':
      return new FlyControls(camera, domElement);
    case 'firstPerson':
      return new FirstPersonControls(camera, domElement);
    case 'pointerLock':
      return new PointerLockControls(camera, domElement);
    default:
      throw new Error(`未知的相机控制器类型：${type}`);
  }
}
