/*
本示例演示 scene.remove()、dispose() 和业务引用清理的生命周期差异。
读代码先看 addBatch()、replaceTextures()、removeHalf()：它们分别创建、替换和移除资源。
控件对应 API：安全释放开关 -> 是否调用 geometry/material/texture.dispose()；释放保留引用 -> 清理 retainedResources 数组。
预期观察：只移除对象但不 dispose 时 memory.geometries/textures 读数会保留；释放保留引用后读数才回落。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  createBaseScene,
  createCamera,
  createCanvasTexture,
  createRenderer,
  disposeObjectTree,
  disposeRetainedResource,
  formatNumber,
  readRendererInfo,
  startRenderLoop
} from '../shared-stage.js';

const initialState = {
  safeDispose: true,
  lastAction: '等待操作'
};

export function createDisposeLifecycleScene(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const state = { ...initialState };
  const activeGroup = new THREE.Group();
  const retainedResources = [];
  let serial = 0;

  addBaseLights(scene);
  scene.add(activeGroup);

  const stop = startRenderLoop(
    renderer,
    scene,
    camera,
    canvas,
    (time) => {
      activeGroup.rotation.y = time * 0.12;
    },
    publishSnapshot
  );

  function addBatch() {
    for (let index = 0; index < 8; index += 1) {
      activeGroup.add(createTrackedMesh(serial));
      serial += 1;
    }

    layoutActiveObjects();
    state.lastAction = '添加 8 个独立 geometry/material/texture';
  }

  function replaceTextures() {
    let replaced = 0;

    activeGroup.children.forEach((object) => {
      if (!object.isMesh || !object.material?.map) {
        return;
      }

      const oldTexture = object.material.map;
      object.material.map = createCanvasTexture({
        size: 128,
        label: `R${serial}`,
        hue: 40 + serial * 19
      });
      object.material.needsUpdate = true;
      serial += 1;
      replaced += 1;

      if (state.safeDispose) {
        disposeRetainedResource(oldTexture);
      } else {
        retainedResources.push(oldTexture);
      }
    });

    state.lastAction = replaced > 0 ? `替换 ${replaced} 张贴图` : '没有可替换的贴图';
  }

  function removeHalf() {
    const targets = activeGroup.children.slice(0, Math.ceil(activeGroup.children.length / 2));

    targets.forEach((object) => {
      activeGroup.remove(object);

      if (state.safeDispose) {
        disposeObjectTree(object);
      } else {
        retainedResources.push(object);
      }
    });

    layoutActiveObjects();
    state.lastAction = targets.length > 0 ? `移除 ${targets.length} 个对象` : '没有对象可移除';
  }

  function clearScene() {
    const targets = activeGroup.children.slice();

    targets.forEach((object) => {
      activeGroup.remove(object);

      if (state.safeDispose) {
        disposeObjectTree(object);
      } else {
        retainedResources.push(object);
      }
    });

    state.lastAction = targets.length > 0 ? `清空 ${targets.length} 个对象` : '当前已经为空';
  }

  function releaseRetained() {
    const count = retainedResources.length;
    retainedResources.splice(0).forEach((resource) => disposeRetainedResource(resource));
    state.lastAction = count > 0 ? `释放 ${count} 个保留引用` : '没有保留引用';
  }

  function layoutActiveObjects() {
    const columns = Math.ceil(Math.sqrt(activeGroup.children.length || 1));
    const spacing = 0.58;
    const offset = ((columns - 1) * spacing) / 2;

    activeGroup.children.forEach((object, index) => {
      object.position.set((index % columns) * spacing - offset, 0, Math.floor(index / columns) * spacing - offset);
    });
  }

  function publishSnapshot() {
    const info = readRendererInfo(renderer);
    onSnapshot?.({
      ...info,
      active: activeGroup.children.length,
      retained: retainedResources.length,
      lastAction: state.lastAction
    });
  }

  addBatch();

  return {
    setSafeDispose(value) {
      state.safeDispose = value;
      state.lastAction = value ? '后续操作会 dispose 旧资源' : '后续操作会保留旧资源引用';
    },
    addBatch,
    replaceTextures,
    removeHalf,
    clearScene,
    releaseRetained,
    dispose() {
      stop();
      clearScene();
      releaseRetained();
      scene.remove(activeGroup);
      renderer.dispose();
    }
  };
}

function createTrackedMesh(index) {
  const geometry = index % 2 === 0
    ? new THREE.BoxGeometry(0.34, 0.34, 0.34)
    : new THREE.SphereGeometry(0.21, 16, 8);
  const material = new THREE.MeshStandardMaterial({
    map: createCanvasTexture({ size: 128, label: `M${index}`, hue: 205 + index * 17 }),
    roughness: 0.58,
    metalness: 0.05
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(index * 0.08, index * 0.05, 0);
  return mesh;
}

export function formatDisposeSnapshot(snapshot) {
  return {
    active: formatNumber(snapshot.active),
    retained: formatNumber(snapshot.retained),
    geometries: formatNumber(snapshot.geometries),
    textures: formatNumber(snapshot.textures),
    programs: formatNumber(snapshot.programs),
    lastAction: snapshot.lastAction
  };
}
