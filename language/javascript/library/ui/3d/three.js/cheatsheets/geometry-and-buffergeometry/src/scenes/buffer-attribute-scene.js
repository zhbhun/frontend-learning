import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createPreviewMesh,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  getGeometryStats,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, writeText } from '../shared-ui.js';

export function createBufferAttributeLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    base: 2.2,
    height: 1.8,
    updates: 0
  };

  const positions = makePyramidPositions(state.base, state.height);
  const colors = makePyramidColors();
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);

  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0
  });
  const preview = createPreviewMesh(geometry, material);
  scene.add(preview.group);

  function updatePositions() {
    positionAttribute.set(makePyramidPositions(state.base, state.height));
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    state.updates += 1;
    updateMetrics();
  }

  function updateMetrics() {
    const stats = getGeometryStats(geometry);
    writeText('item-size', positionAttribute.itemSize);
    writeText('vertex-count', stats.vertexCount);
    writeText('index-count', stats.indexCount || '无');
    writeText('triangle-count', formatNumber(stats.triangleCount));
    writeText('update-state', `needsUpdate -> true (${state.updates})`);
  }

  bindRange('base', 'base-value', formatNumber, (value) => {
    state.base = value;
    updatePositions();
  });
  bindRange('height', 'height-value', formatNumber, (value) => {
    state.height = value;
    updatePositions();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    preview.group.rotation.set(-0.18, time * 0.34, 0.08);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function makePyramidPositions(base, height) {
  const h = base / 2;
  const y = height;
  const bottomA = [-h, 0, -h];
  const bottomB = [h, 0, -h];
  const bottomC = [h, 0, h];
  const bottomD = [-h, 0, h];
  const top = [0, y, 0];

  // 非索引几何每个三角形都写自己的三个顶点，重复顶点不会被共享。
  return new Float32Array([
    ...bottomA, ...bottomB, ...bottomC,
    ...bottomC, ...bottomD, ...bottomA,
    ...bottomA, ...top, ...bottomB,
    ...bottomB, ...top, ...bottomC,
    ...bottomC, ...top, ...bottomD,
    ...bottomD, ...top, ...bottomA
  ]);
}

function makePyramidColors() {
  return new Float32Array([
    0.10, 0.48, 0.64, 0.10, 0.48, 0.64, 0.10, 0.48, 0.64,
    0.10, 0.48, 0.64, 0.10, 0.48, 0.64, 0.10, 0.48, 0.64,
    0.86, 0.29, 0.21, 0.96, 0.74, 0.28, 0.86, 0.29, 0.21,
    0.96, 0.74, 0.28, 0.14, 0.61, 0.50, 0.96, 0.74, 0.28,
    0.14, 0.61, 0.50, 0.22, 0.46, 0.85, 0.14, 0.61, 0.50,
    0.22, 0.46, 0.85, 0.86, 0.29, 0.21, 0.22, 0.46, 0.85
  ]);
}
