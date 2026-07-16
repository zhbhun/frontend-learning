/*
本示例演示纹理数量、尺寸、复用、filter 和 mipmap 的预算关系。
读代码先看 rebuildTextures()：它决定创建几份 Texture，以及多个材质是否共享同一份 Texture。
控件对应 API：CanvasTexture/DataTexture 来源、texture.generateMipmaps、texture.minFilter、material.map 和 texture.needsUpdate。
预期观察：renderer.info.memory.textures 只随纹理份数变化，不反映尺寸；尺寸和 mipmap 需要看 estimated 估算值。
*/

import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createCanvasTexture,
  createDataTexture,
  createRenderer,
  disposeObjectTree,
  estimateRgbaTextureBytes,
  formatBytes,
  formatNumber,
  readRendererInfo,
  startRenderLoop
} from '../shared-stage.js';

const MIN_FILTERS = {
  'linear-mipmap': THREE.LinearMipmapLinearFilter,
  linear: THREE.LinearFilter,
  nearest: THREE.NearestFilter
};

const initialState = {
  source: 'canvas',
  size: 256,
  textureCount: 4,
  reuseTexture: true,
  generateMipmaps: true,
  minFilter: 'linear-mipmap'
};

export function createTextureBudgetScene(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const state = { ...initialState };
  let planeGroup = null;

  camera.position.set(4.2, 3.2, 5.8);
  camera.lookAt(0, 0, 0);
  rebuildTextures();

  const stop = startRenderLoop(
    renderer,
    scene,
    camera,
    canvas,
    (time) => {
      if (planeGroup) {
        planeGroup.rotation.y = Math.sin(time * 0.35) * 0.22;
      }
    },
    publishSnapshot
  );

  function rebuildTextures() {
    if (planeGroup) {
      scene.remove(planeGroup);
      disposeObjectTree(planeGroup);
    }

    planeGroup = createPlaneGroup(state);
    scene.add(planeGroup);
  }

  function publishSnapshot() {
    const info = readRendererInfo(renderer);
    const textureInstances = state.reuseTexture ? 1 : state.textureCount;
    onSnapshot?.({
      ...info,
      estimatedBytes: estimateRgbaTextureBytes(state.size, textureInstances, state.generateMipmaps),
      filterLabel: planeGroup?.userData.filterLabel ?? '',
      textureVersion: planeGroup?.userData.textureVersion ?? 0
    });
  }

  return {
    setSource(value) {
      state.source = value;
      rebuildTextures();
    },
    setSize(value) {
      state.size = Number(value);
      rebuildTextures();
    },
    setTextureCount(value) {
      state.textureCount = Number(value);
      rebuildTextures();
    },
    setReuseTexture(value) {
      state.reuseTexture = value;
      rebuildTextures();
    },
    setGenerateMipmaps(value) {
      state.generateMipmaps = value;
      rebuildTextures();
    },
    setMinFilter(value) {
      state.minFilter = value;
      rebuildTextures();
    },
    dispose() {
      stop();
      if (planeGroup) {
        scene.remove(planeGroup);
        disposeObjectTree(planeGroup);
      }
      renderer.dispose();
    }
  };
}

function createPlaneGroup(state) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(1.05, 1.05);
  const columns = Math.ceil(Math.sqrt(state.textureCount));
  const spacing = 1.22;
  const offset = ((columns - 1) * spacing) / 2;
  const sharedTexture = state.reuseTexture ? createConfiguredTexture(state, 0) : null;
  const materials = [];

  for (let index = 0; index < state.textureCount; index += 1) {
    const texture = sharedTexture ?? createConfiguredTexture(state, index);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((index % columns) * spacing - offset, Math.floor(index / columns) * -spacing + offset, 0);
    group.add(mesh);
    materials.push(material);
  }

  group.userData.filterLabel = buildFilterLabel(state);
  group.userData.textureVersion = sharedTexture?.version ?? materials[0]?.map?.version ?? 0;
  return group;
}

function createConfiguredTexture(state, index) {
  const texture = state.source === 'data'
    ? createDataTexture({ size: state.size, hueOffset: index * 9 })
    : createCanvasTexture({ size: state.size, label: `${state.size}`, hue: 205 + index * 22 });

  texture.generateMipmaps = state.generateMipmaps;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = resolveMinFilter(state);
  texture.needsUpdate = true;
  return texture;
}

function resolveMinFilter(state) {
  if (!state.generateMipmaps && state.minFilter === 'linear-mipmap') {
    return THREE.LinearFilter;
  }

  return MIN_FILTERS[state.minFilter];
}

function buildFilterLabel(state) {
  const requested = state.minFilter;
  const actual = !state.generateMipmaps && requested === 'linear-mipmap' ? 'linear' : requested;
  const mip = state.generateMipmaps ? 'mipmap on' : 'mipmap off';
  return `${state.source}; ${mip}; requested ${requested}; actual ${actual}`;
}

export function formatTextureBudgetSnapshot(snapshot) {
  return {
    textures: formatNumber(snapshot.textures),
    estimated: formatBytes(snapshot.estimatedBytes),
    filter: snapshot.filterLabel,
    version: formatNumber(snapshot.textureVersion),
    calls: formatNumber(snapshot.calls),
    programs: formatNumber(snapshot.programs)
  };
}
