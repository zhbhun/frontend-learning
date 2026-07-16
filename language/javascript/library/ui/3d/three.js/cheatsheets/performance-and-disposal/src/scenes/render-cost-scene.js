/*
本示例演示对象数量、几何复杂度和材质分组如何影响 renderer.info。
读代码先看 rebuildObjects()：它每次只按当前控件重建一组可渲染对象。
控件对应 API：对象数量 -> scene 中 Object3D 数量；对象类型和分段 -> BufferGeometry 顶点/索引；材质策略 -> material 复用和 geometry groups。
预期观察：普通对象数量会推高 calls；SphereGeometry 分段会推高 triangles；LineSegments 和 Points 分别推高 lines / points；双材质 groups 会让单个 Mesh 产生更多 calls。
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

const MATERIAL_COLORS = ['#2f83d8', '#d6832b', '#36a269', '#7c5cc4'];

const initialState = {
  objectCount: 48,
  primitiveKind: 'box',
  segmentCount: 16,
  materialMode: 'shared'
};

export function createRenderCostScene(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const state = { ...initialState };
  let objectGroup = null;

  addBaseLights(scene);
  rebuildObjects();

  const stop = startRenderLoop(
    renderer,
    scene,
    camera,
    canvas,
    (time) => {
      if (objectGroup) {
        objectGroup.rotation.y = time * 0.18;
      }
    },
    publishSnapshot
  );

  function rebuildObjects() {
    if (objectGroup) {
      scene.remove(objectGroup);
      disposeObjectTree(objectGroup);
    }

    objectGroup = createObjectGroup(state);
    scene.add(objectGroup);
  }

  function publishSnapshot() {
    const info = readRendererInfo(renderer);
    onSnapshot?.({
      ...info,
      materials: objectGroup?.userData.materials ?? 0,
      modeLabel: objectGroup?.userData.modeLabel ?? ''
    });
  }

  return {
    setObjectCount(value) {
      state.objectCount = value;
      rebuildObjects();
    },
    setPrimitiveKind(value) {
      state.primitiveKind = value;
      rebuildObjects();
    },
    setSegmentCount(value) {
      state.segmentCount = value;
      rebuildObjects();
    },
    setMaterialMode(value) {
      state.materialMode = value;
      rebuildObjects();
    },
    dispose() {
      stop();
      if (objectGroup) {
        scene.remove(objectGroup);
        disposeObjectTree(objectGroup);
      }
      renderer.dispose();
    }
  };
}

function createObjectGroup(state) {
  const group = new THREE.Group();
  const columns = Math.ceil(Math.sqrt(state.objectCount));
  const spacing = state.primitiveKind === 'sphere' ? 0.44 : 0.4;
  const offset = ((columns - 1) * spacing) / 2;
  const sharedGeometry = createGeometry(state.primitiveKind, state.segmentCount, state.materialMode);
  const sharedMaterial = createMaterial(state.primitiveKind, 0);
  const groupedMaterials = [createMaterial('box', 0), createMaterial('box', 1)];
  const materialSet = new Set();
  let modeLabel = state.materialMode;

  for (let index = 0; index < state.objectCount; index += 1) {
    const geometry = sharedGeometry;
    let material = sharedMaterial;

    if (state.materialMode === 'unique') {
      material = createMaterial(state.primitiveKind, index);
    }

    if (state.materialMode === 'groups' && state.primitiveKind === 'box') {
      material = groupedMaterials;
      modeLabel = 'groups: 每个 Box 两个 draw groups';
    } else if (state.materialMode === 'groups') {
      modeLabel = 'groups 只对 BoxGeometry 生效';
    }

    const object = createRenderableObject(state.primitiveKind, geometry, material);
    object.position.set((index % columns) * spacing - offset, 0, Math.floor(index / columns) * spacing - offset);
    object.rotation.set(index * 0.03, index * 0.05, 0);
    group.add(object);

    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((entry) => materialSet.add(entry));
  }

  group.userData.materials = materialSet.size;
  group.userData.modeLabel = modeLabel;
  return group;
}

function createRenderableObject(kind, geometry, material) {
  if (kind === 'line') {
    return new THREE.LineSegments(geometry, material);
  }

  if (kind === 'points') {
    return new THREE.Points(geometry, material);
  }

  return new THREE.Mesh(geometry, material);
}

function createGeometry(kind, segmentCount, materialMode) {
  if (kind === 'sphere') {
    return new THREE.SphereGeometry(0.18, segmentCount, Math.max(6, Math.floor(segmentCount / 2)));
  }

  if (kind === 'line') {
    const positions = [];
    const radius = 0.2;

    for (let index = 0; index < segmentCount; index += 1) {
      const a = (index / segmentCount) * Math.PI * 2;
      const b = ((index + 1) / segmentCount) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      positions.push(Math.cos(b) * radius, Math.sin(b) * radius, 0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }

  if (kind === 'points') {
    const positions = [];
    const side = Math.max(2, Math.floor(Math.sqrt(segmentCount * 4)));

    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        positions.push((x / (side - 1) - 0.5) * 0.34, (y / (side - 1) - 0.5) * 0.34, 0);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }

  const geometry = new THREE.BoxGeometry(0.26, 0.26, 0.26);

  // material 数组只有在 geometry groups 存在时才会拆成多次提交。
  if (materialMode === 'groups') {
    const drawCount = geometry.index.count;
    const firstCount = Math.floor(drawCount / 2);
    geometry.clearGroups();
    geometry.addGroup(0, firstCount, 0);
    geometry.addGroup(firstCount, drawCount - firstCount, 1);
  }

  return geometry;
}

function createMaterial(kind, index) {
  const color = MATERIAL_COLORS[index % MATERIAL_COLORS.length];

  if (kind === 'line') {
    return new THREE.LineBasicMaterial({ color });
  }

  if (kind === 'points') {
    return new THREE.PointsMaterial({
      color,
      size: 0.045,
      sizeAttenuation: true
    });
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.56,
    metalness: 0.08
  });
}

export function formatRenderCostSnapshot(snapshot) {
  return {
    calls: formatNumber(snapshot.calls),
    triangles: formatNumber(snapshot.triangles),
    points: formatNumber(snapshot.points),
    lines: formatNumber(snapshot.lines),
    materials: `${formatNumber(snapshot.materials)} (${snapshot.modeLabel})`,
    programs: formatNumber(snapshot.programs)
  };
}
