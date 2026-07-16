/*
本示例演示 GridHelper 的 size 和 divisions 如何决定地面网格范围。
读代码先看 rebuildGridHelper()：页面控件直接对应 new THREE.GridHelper(size, divisions)。
预期观察：size 改变网格总覆盖区域，divisions 改变分段数；每格大小始终是 size / divisions。
*/

import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createDebugTarget,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  gridSize: 8,
  divisions: 8
};

export function createGridHelperScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();

  const target = createDebugTarget();
  target.scale.setScalar(0.65);
  scene.add(target);

  let gridHelper;

  function rebuildGridHelper() {
    if (gridHelper) {
      scene.remove(gridHelper);
      disposeObjectTree(gridHelper);
    }

    // size 是总宽深，divisions 是分段数；两者改变时重建几何线段。
    gridHelper = new THREE.GridHelper(
      state.gridSize,
      state.divisions,
      '#8292a0',
      '#d3dde6'
    );
    gridHelper.position.y = -0.72;
    scene.add(gridHelper);
  }

  function publishSnapshot() {
    const halfSize = state.gridSize / 2;

    onSnapshot?.({
      gridSize: state.gridSize,
      divisions: state.divisions,
      cellSize: state.gridSize / state.divisions,
      rangeText: `${(-halfSize).toFixed(1)} 到 ${halfSize.toFixed(1)}`
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    renderer.render(scene, camera);
    publishSnapshot();
  }

  rebuildGridHelper();
  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setGridSize(value) {
      state.gridSize = value;
      rebuildGridHelper();
      render();
    },
    setDivisions(value) {
      state.divisions = Math.max(1, Math.round(value));
      rebuildGridHelper();
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
