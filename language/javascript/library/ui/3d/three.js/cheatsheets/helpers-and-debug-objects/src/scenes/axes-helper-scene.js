/*
本示例演示 AxesHelper 如何显示对象的局部 X/Y/Z 轴。
读代码先看 rebuildAxesHelper() 和 target.add(axesHelper)：
页面的“轴长度”会重新创建 AxesHelper(size)，页面的“目标旋转 Y”会旋转父对象。
预期观察：Helper 挂到 target 后，红/绿/蓝三条轴会跟着 target 的局部空间一起旋转。
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
  helperSize: 1.7,
  rotationY: 30
};

export function createAxesHelperScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();

  const target = createDebugTarget();
  scene.add(createFloor(), target);

  let axesHelper;

  function rebuildAxesHelper() {
    if (axesHelper) {
      target.remove(axesHelper);
      disposeObjectTree(axesHelper);
    }

    // size 是构造参数；改变长度时重建 helper，避免把构造语义藏进 scale。
    axesHelper = new THREE.AxesHelper(state.helperSize);
    target.add(axesHelper);
  }

  function syncTarget() {
    target.rotation.y = THREE.MathUtils.degToRad(state.rotationY);
  }

  function publishSnapshot() {
    onSnapshot?.({
      helperSize: state.helperSize,
      rotationY: state.rotationY,
      mountText: 'target.add(helper)'
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    syncTarget();
    renderer.render(scene, camera);
    publishSnapshot();
  }

  rebuildAxesHelper();
  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setHelperSize(value) {
      state.helperSize = value;
      rebuildAxesHelper();
      render();
    },
    setRotationY(value) {
      state.rotationY = value;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
