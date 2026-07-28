/*
本示例演示 camera.position、camera.lookAt() 和 camera.up 如何决定“从哪里看、朝哪看”。
Controls 里的 posX / posY / posZ 直通 camera.position，lookAtY 决定 lookAt 的目标高度，
up 在 (0,1,0) 和 (0,0,1) 之间切换。

读代码先看 applyPlacement()：它是这三件事唯一的落点，投影参数从头到尾没有被碰过。
预期观察：红色小球标出 lookAt 的目标，它始终位于画面正中；改 position 只换站位，
画面中心不动；把 up 切成 z 轴，整个画面会绕视线滚转 90 度。
*/

import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  readCanvasSize,
  rotateObjects
} from '../../../../assets/shared-scene.js';

const UP_VECTORS = {
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1)
};

const initialState = {
  posX: 8,
  posY: 4.7,
  posZ: 8,
  lookAtY: 0.7,
  up: 'y'
};

export function createPlacementScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const lookAtPoint = new THREE.Vector3();
  const direction = new THREE.Vector3();

  function applyPlacement() {
    camera.position.set(state.posX, state.posY, state.posZ);
    camera.up.copy(UP_VECTORS[state.up]);

    lookAtPoint.set(0, state.lookAtY, 0);
    world.targetMarker.position.copy(lookAtPoint);

    // lookAt 只在调用的这一刻算一次朝向，所以每次改完位置或 up 都要重新调用。
    camera.lookAt(lookAtPoint);
  }

  function publishSnapshot() {
    camera.getWorldDirection(direction);

    onSnapshot?.({
      positionText: formatVector(camera.position),
      lookAtText: formatVector(lookAtPoint),
      directionText: formatVector(direction),
      upText: formatVector(camera.up)
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
    renderer.render(world.scene, camera);
    publishSnapshot();
  });

  applyPlacement();
  resize();
  loop.renderOnce();

  const observer = createResizeObserver(canvas, resize);

  return {
    setPosition(posX, posY, posZ) {
      state.posX = posX;
      state.posY = posY;
      state.posZ = posZ;
      applyPlacement();
    },
    setLookAtY(lookAtY) {
      state.lookAtY = lookAtY;
      applyPlacement();
    },
    setUp(up) {
      state.up = up;
      applyPlacement();
    },
    dispose() {
      loop.dispose();
      observer.disconnect();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
