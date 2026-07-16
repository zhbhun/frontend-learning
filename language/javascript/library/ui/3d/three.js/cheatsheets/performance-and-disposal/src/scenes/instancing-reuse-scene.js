/*
本示例演示普通 Mesh 复用资源和 InstancedMesh 的 draw call 差异。
读代码先看 rebuildObjects()：普通模式创建很多 Mesh，实例化模式只创建一个 InstancedMesh。
控件对应 API：渲染方式 -> Mesh / InstancedMesh；实例数量 -> count；颜色开关 -> 普通 Mesh 的 material.color 与 InstancedMesh 的 setColorAt()。
预期观察：两种模式 triangles 接近，但普通 Mesh 的 calls 接近对象数量，InstancedMesh 的 calls 通常保持为 1。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  readRendererInfo,
  startRenderLoop
} from '../shared-stage.js';

const initialState = {
  mode: 'mesh',
  count: 400,
  useColors: true
};

export function createInstancingReuseScene(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const state = { ...initialState };
  let objectRoot = null;

  addBaseLights(scene);
  rebuildObjects();

  const stop = startRenderLoop(
    renderer,
    scene,
    camera,
    canvas,
    (time) => {
      if (objectRoot) {
        objectRoot.rotation.y = time * 0.16;
      }
    },
    publishSnapshot
  );

  function rebuildObjects() {
    if (objectRoot) {
      scene.remove(objectRoot);
      disposeObjectTree(objectRoot);
    }

    objectRoot = state.mode === 'instanced'
      ? createInstancedCubes(state.count, state.useColors)
      : createMeshCubes(state.count, state.useColors);
    scene.add(objectRoot);
  }

  function publishSnapshot() {
    const info = readRendererInfo(renderer);
    onSnapshot?.({
      ...info,
      objects: objectRoot?.userData.objects ?? 0,
      mode: state.mode
    });
  }

  return {
    setMode(value) {
      state.mode = value;
      rebuildObjects();
    },
    setCount(value) {
      state.count = value;
      rebuildObjects();
    },
    setUseColors(value) {
      state.useColors = value;
      rebuildObjects();
    },
    dispose() {
      stop();
      if (objectRoot) {
        scene.remove(objectRoot);
        disposeObjectTree(objectRoot);
      }
      renderer.dispose();
    }
  };
}

function createMeshCubes(count, useColors) {
  const group = new THREE.Group();
  const geometry = createSharedGeometry();
  const material = useColors ? null : createSharedMaterial(false);
  const columns = Math.ceil(Math.sqrt(count));
  const spacing = 0.28;
  const offset = ((columns - 1) * spacing) / 2;

  for (let index = 0; index < count; index += 1) {
    const meshMaterial = useColors ? createSharedMaterial(false, colorForIndex(index)) : material;
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.position.set((index % columns) * spacing - offset, 0, Math.floor(index / columns) * spacing - offset);
    mesh.rotation.set(index * 0.013, index * 0.021, 0);
    group.add(mesh);
  }

  group.userData.objects = count;
  return group;
}

function createInstancedCubes(count, useColors) {
  const geometry = createSharedGeometry();
  const material = createSharedMaterial(useColors);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const columns = Math.ceil(Math.sqrt(count));
  const spacing = 0.28;
  const offset = ((columns - 1) * spacing) / 2;

  mesh.name = 'instancedCubes';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  for (let index = 0; index < count; index += 1) {
    dummy.position.set((index % columns) * spacing - offset, 0, Math.floor(index / columns) * spacing - offset);
    dummy.rotation.set(index * 0.013, index * 0.021, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);

    if (useColors) {
      mesh.setColorAt(index, colorForIndex(index));
    }
  }

  mesh.instanceMatrix.needsUpdate = true;

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  mesh.userData.objects = 1;
  return mesh;
}

function createSharedGeometry() {
  return new THREE.BoxGeometry(0.18, 0.18, 0.18);
}

function createSharedMaterial(useColors, color = '#2f83d8') {
  return new THREE.MeshStandardMaterial({
    color: useColors ? '#ffffff' : color,
    roughness: 0.52,
    metalness: 0.08,
    vertexColors: useColors
  });
}

function colorForIndex(index) {
  const color = new THREE.Color();
  color.setHSL((index * 0.027) % 1, 0.62, 0.5);
  return color;
}

export function formatInstancingSnapshot(snapshot) {
  return {
    objects: snapshot.mode === 'instanced'
      ? `${formatNumber(snapshot.objects)} InstancedMesh`
      : `${formatNumber(snapshot.objects)} Mesh`,
    calls: formatNumber(snapshot.calls),
    triangles: formatNumber(snapshot.triangles),
    geometries: formatNumber(snapshot.geometries),
    textures: formatNumber(snapshot.textures),
    programs: formatNumber(snapshot.programs)
  };
}
