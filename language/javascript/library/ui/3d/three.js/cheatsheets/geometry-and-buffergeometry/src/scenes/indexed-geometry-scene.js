import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createPreviewMesh,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  formatVector,
  getGeometryStats,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, writeText } from '../shared-ui.js';

const PYRAMID_INDEX = [
  0, 1, 2,
  2, 3, 0,
  0, 4, 1,
  1, 4, 2,
  2, 4, 3,
  3, 4, 0
];

export function createIndexedGeometryLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    base: 2.2,
    height: 1.8
  };

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(makeIndexedPyramidPositions(state.base, state.height), 3);

  geometry.setAttribute('position', positionAttribute);
  geometry.setIndex(PYRAMID_INDEX);
  geometry.computeVertexNormals();

  const preview = createPreviewMesh(geometry);
  scene.add(preview.group);

  function updatePositions() {
    positionAttribute.set(makeIndexedPyramidPositions(state.base, state.height));
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    updateMetrics();
  }

  function updateMetrics() {
    const stats = getGeometryStats(geometry);
    writeText('vertex-count', stats.vertexCount);
    writeText('index-count', stats.indexCount);
    writeText('triangle-count', formatNumber(stats.triangleCount));
    writeText('bounds-size', formatVector(stats.size));
    writeText('index-preview', PYRAMID_INDEX.join(', '));
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

function makeIndexedPyramidPositions(base, height) {
  const h = base / 2;

  // 索引几何只保存 5 个唯一顶点，三角形通过 index 复用它们。
  return new Float32Array([
    -h, 0, -h,
    h, 0, -h,
    h, 0, h,
    -h, 0, h,
    0, height, 0
  ]);
}
