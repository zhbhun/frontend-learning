/*
本示例演示 DirectionalLightHelper 如何显示方向光的位置和照射方向。
读代码先看 directionalLight、directionalLight.target 和 syncLight()：
页面控件分别移动 light.position.x 和 light.target.position.x。
预期观察：方向光从 light.position 指向 target.position；两者改变后要更新矩阵，再 lightHelper.update()。
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
  lightX: 3,
  targetX: 0
};

export function createDirectionalLightHelperScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  camera.position.set(5.6, 3.7, 7.1);
  camera.lookAt(0, 0.5, 0);

  const scene = createBaseScene();
  const target = createDebugTarget();
  scene.add(createFloor(), target);

  const directionalLight = new THREE.DirectionalLight('#ffffff', 2.2);
  directionalLight.position.set(state.lightX, 4, 2);
  directionalLight.target.position.set(state.targetX, 0.45, 0);
  scene.add(directionalLight, directionalLight.target);

  // size 只影响 helper 图标线段大小，不改变真实光照范围或强度。
  const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.8);
  scene.add(lightHelper);

  const direction = new THREE.Vector3();

  function syncLight() {
    directionalLight.position.x = state.lightX;
    directionalLight.target.position.x = state.targetX;

    directionalLight.updateMatrixWorld();
    directionalLight.target.updateMatrixWorld();
    lightHelper.update();
  }

  function publishSnapshot() {
    direction.copy(directionalLight.target.position).sub(directionalLight.position).normalize();

    onSnapshot?.({
      lightX: state.lightX,
      targetX: state.targetX,
      lightPositionText: formatVector(directionalLight.position),
      targetPositionText: formatVector(directionalLight.target.position),
      directionText: formatVector(direction)
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    syncLight();
    renderer.render(scene, camera);
    publishSnapshot();
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setLightX(value) {
      state.lightX = value;
      render();
    },
    setTargetX(value) {
      state.targetX = value;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
