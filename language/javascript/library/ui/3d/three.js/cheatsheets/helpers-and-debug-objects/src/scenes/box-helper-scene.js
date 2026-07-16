/*
本示例演示 BoxHelper 如何包住一个 Object3D 子树。
读代码先看 boxHelper.update()：页面的“调用 update()”控制目标变换后是否刷新包围盒线框。
预期观察：BoxHelper 显示世界轴对齐包围盒；目标旋转后盒子不会斜着跟随，而是按世界 X/Y/Z 重新包住对象。
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
  formatVector,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  rotationY: 30,
  scale: 1,
  updateHelper: true
};

export function createBoxHelperScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();

  const target = createDebugTarget();
  scene.add(createFloor(), target);

  const boxHelper = new THREE.BoxHelper(target, '#d45b3f');
  scene.add(boxHelper);

  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  function syncTarget() {
    target.rotation.y = THREE.MathUtils.degToRad(state.rotationY);
    target.scale.setScalar(state.scale);

    // Object3D 变换改变后，BoxHelper 不会自动重新计算；需要主动 update()。
    if (state.updateHelper) {
      boxHelper.update();
    }
  }

  function publishSnapshot() {
    box.setFromObject(target);
    box.getSize(size);

    onSnapshot?.({
      rotationY: state.rotationY,
      scale: state.scale,
      updateHelper: state.updateHelper,
      sizeText: formatVector(size),
      helperText: state.updateHelper ? '已调用 update()' : '保持旧线框'
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    syncTarget();
    renderer.render(scene, camera);
    publishSnapshot();
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setRotationY(value) {
      state.rotationY = value;
      render();
    },
    setScale(value) {
      state.scale = value;
      render();
    },
    setUpdateHelper(enabled) {
      state.updateHelper = enabled;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
