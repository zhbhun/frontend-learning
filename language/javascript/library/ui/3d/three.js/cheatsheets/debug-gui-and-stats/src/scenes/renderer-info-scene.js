/*
本示例演示 stats.js 和 renderer.info 的分工。
读代码先看 render() 末尾：stats 包住一帧，renderer.render() 之后读取 renderer.info。
控件对应 API：对象数量改变 scene 中 Mesh 个数，CanvasTexture 开关改变 material.map 和纹理资源。
预期观察：对象越多 draw calls 和 triangles 越高；开启贴图会增加 textures，材质变体可能让 programs 增加。
*/

import * as THREE from 'three';
import Stats from 'stats.js';
import {
  addBaseLights,
  createBaseScene,
  createCamera,
  createCanvasTexture,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  objectCount: 1,
  useTexture: true
};

export function createRendererInfoScene(canvas, statsMount, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const stats = new Stats();
  const statsElement = stats.dom || stats.domElement;
  let objectGroup = null;
  let frameId = 0;

  addBaseLights(scene);
  stats.showPanel(0);
  statsMount.append(statsElement);

  rebuildObjects();
  render();

  function rebuildObjects() {
    if (objectGroup) {
      scene.remove(objectGroup);
      disposeObjectTree(objectGroup);
    }

    objectGroup = createObjectGroup(state.objectCount, state.useTexture);
    scene.add(objectGroup);
  }

  function render(time = 0) {
    stats.begin();
    resizeRendererAndCamera(renderer, camera, canvas);

    if (objectGroup) {
      objectGroup.rotation.y = time * 0.00025;
    }

    renderer.render(scene, camera);
    stats.end();
    publishSnapshot();
    frameId = requestAnimationFrame(render);
  }

  function publishSnapshot() {
    const info = renderer.info;

    onSnapshot?.({
      objectCount: state.objectCount,
      calls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      toolbarText: `calls ${formatNumber(info.render.calls)}`
    });
  }

  return {
    setObjectCount(count) {
      state.objectCount = count;
      rebuildObjects();
    },
    setUseTexture(enabled) {
      state.useTexture = enabled;
      rebuildObjects();
    },
    dispose() {
      cancelAnimationFrame(frameId);
      statsElement.remove();
      if (objectGroup) {
        scene.remove(objectGroup);
        disposeObjectTree(objectGroup);
      }
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createObjectGroup(count, useTexture) {
  const group = new THREE.Group();
  group.name = 'rendererInfoObjects';

  const geometry = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  const texture = useTexture ? createCanvasTexture('info') : null;
  const material = new THREE.MeshStandardMaterial({
    color: useTexture ? '#ffffff' : '#4f8cff',
    roughness: 0.54,
    metalness: 0.06,
    map: texture
  });
  const columns = Math.ceil(Math.sqrt(count));
  const spacing = 0.52;
  const offset = ((columns - 1) * spacing) / 2;

  // 共享 geometry/material 能让 memory 读数稳定；每个 Mesh 仍然产生独立 draw call。
  for (let index = 0; index < count; index += 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((index % columns) * spacing - offset, 0.35, Math.floor(index / columns) * spacing - offset);
    mesh.rotation.set(index * 0.07, index * 0.04, 0);
    group.add(mesh);
  }

  return group;
}
