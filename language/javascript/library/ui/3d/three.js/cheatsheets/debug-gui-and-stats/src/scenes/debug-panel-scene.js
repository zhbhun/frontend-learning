/*
本示例演示如何用 lil-gui 在运行时改 three.js 状态。
读代码先看 createGui() 和 syncFromGui()：GUI 控件写回材质、光照和 Object3D 变换。
控件对应 API：material.color / roughness / metalness / wireframe / flatShading，light.intensity，mesh.rotation / scale。
预期观察：颜色、粗糙度、金属度和光照会立即改变明暗；flatShading 改变 shader 分支，需要 material.needsUpdate。
*/

import * as THREE from 'three';
import GUI from 'lil-gui';
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
  材质颜色: '#4f8cff',
  粗糙度: 0.48,
  金属度: 0.18,
  线框: false,
  平面着色: false,
  光照强度: 1.6,
  旋转Y: 0,
  缩放: 1
};

export function createDebugPanelScene(canvas, guiMount, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const lights = addBaseLights(scene);
  const mesh = createDebugMesh();
  const grid = new THREE.GridHelper(5, 10, '#60768a', '#c6d3de');
  const axes = new THREE.AxesHelper(1.6);

  scene.add(createFloor(), grid, mesh, axes);

  const gui = createGui(guiMount, state, syncFromGui);

  function syncFromGui() {
    mesh.material.color.set(state.材质颜色);
    mesh.material.roughness = state.粗糙度;
    mesh.material.metalness = state.金属度;
    mesh.material.wireframe = state.线框;

    if (mesh.material.flatShading !== state.平面着色) {
      mesh.material.flatShading = state.平面着色;
      // flatShading 会切换 shader 变体；只改属性不标记 needsUpdate 时画面可能不刷新。
      mesh.material.needsUpdate = true;
    }

    lights.key.intensity = state.光照强度;
    mesh.rotation.y = THREE.MathUtils.degToRad(state.旋转Y);
    mesh.scale.setScalar(state.缩放);

    onSnapshot?.({
      materialText: `roughness ${state.粗糙度.toFixed(2)}, metalness ${state.金属度.toFixed(2)}`,
      lightText: state.光照强度.toFixed(2),
      objectText: `rotationY ${state.旋转Y.toFixed(0)}°, scale ${state.缩放.toFixed(2)}`,
      toolbarText: state.平面着色 ? 'flatShading' : 'smooth'
    });
  }

  syncFromGui();
  const stop = startRenderLoop(renderer, scene, camera, canvas);

  return {
    dispose() {
      stop();
      gui.destroy();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createGui(container, state, onChange) {
  const gui = new GUI({
    container,
    title: 'lil-gui 调参'
  });

  const material = gui.addFolder('材质');
  material.addColor(state, '材质颜色').name('颜色').onChange(onChange);
  material.add(state, '粗糙度', 0, 1, 0.01).name('粗糙度').onChange(onChange);
  material.add(state, '金属度', 0, 1, 0.01).name('金属度').onChange(onChange);
  material.add(state, '线框').name('线框').onChange(onChange);
  material.add(state, '平面着色').name('平面着色').onChange(onChange);
  material.open();

  const light = gui.addFolder('光照');
  light.add(state, '光照强度', 0, 4, 0.05).name('方向光强度').onChange(onChange);
  light.open();

  const object = gui.addFolder('对象');
  object.add(state, '旋转Y', -180, 180, 1).name('旋转 Y').onChange(onChange);
  object.add(state, '缩放', 0.4, 1.8, 0.05).name('缩放').onChange(onChange);
  object.open();

  return gui;
}
