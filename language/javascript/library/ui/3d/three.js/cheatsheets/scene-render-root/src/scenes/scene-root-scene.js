import * as THREE from 'three';
import {
  createCamera,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  cube: true,
  sphere: true,
  helper: true,
  light: true
};

export function createSceneRootScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f6');

  // 这些对象直接挂在 scene 上；切换控件时会 add/remove，观察 scene.children 变化。
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: '#4f8cff', roughness: 0.45 })
  );
  cube.position.set(-1.1, 0.15, 0);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 32, 18),
    new THREE.MeshStandardMaterial({ color: '#e58b35', roughness: 0.5 })
  );
  sphere.position.set(1.2, 0.15, 0);

  const axes = new THREE.AxesHelper(2.2);
  const grid = new THREE.GridHelper(6, 6, '#8292a0', '#d3dde6');
  grid.position.y = -0.65;

  const ambient = new THREE.HemisphereLight('#ffffff', '#778899', 0.55);
  const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
  keyLight.position.set(4, 5, 3);

  scene.add(grid, ambient);

  function setMounted(object, mounted) {
    if (mounted && !object.parent) {
      scene.add(object);
    }

    if (!mounted && object.parent) {
      scene.remove(object);
    }
  }

  function updateSceneTree() {
    setMounted(cube, state.cube);
    setMounted(sphere, state.sphere);
    setMounted(axes, state.helper);
    setMounted(keyLight, state.light);
  }

  function publishSnapshot() {
    let traversed = 0;
    let meshes = 0;
    let lights = 0;

    // traverse 从 scene 自己开始递归整棵树，常用于调试和批量处理。
    scene.traverse((object) => {
      traversed += 1;
      if (object.isMesh) meshes += 1;
      if (object.isLight) lights += 1;
    });

    onSnapshot?.({
      children: scene.children.length,
      meshes,
      lights,
      traversed
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    updateSceneTree();
    publishSnapshot();
    renderer.render(scene, camera);
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setCube(enabled) {
      state.cube = enabled;
      render();
    },
    setSphere(enabled) {
      state.sphere = enabled;
      render();
    },
    setHelper(enabled) {
      state.helper = enabled;
      render();
    },
    setLight(enabled) {
      state.light = enabled;
      render();
    },
    dispose() {
      observer.disconnect();
      scene.add(cube, sphere, axes, keyLight);
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
