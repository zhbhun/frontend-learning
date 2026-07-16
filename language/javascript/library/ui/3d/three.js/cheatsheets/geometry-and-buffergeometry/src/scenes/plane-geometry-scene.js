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

export function createPlaneGeometryLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    width: 2.8,
    height: 1.6,
    widthSegments: 6,
    heightSegments: 4
  };

  const preview = createPreviewMesh(createGeometry(state));
  preview.group.rotation.x = -0.55;
  scene.add(preview.group);

  function createGeometry(values) {
    return new THREE.PlaneGeometry(
      values.width,
      values.height,
      values.widthSegments,
      values.heightSegments
    );
  }

  function rebuild() {
    const geometry = createGeometry(state);
    preview.setGeometry(geometry);
    updateMetrics(geometry);
  }

  function updateMetrics(geometry) {
    const stats = getGeometryStats(geometry);
    writeText('vertex-count', stats.vertexCount);
    writeText('index-count', stats.indexCount);
    writeText('triangle-count', formatNumber(stats.triangleCount));
    writeText('bounds-size', formatVector(stats.size));
    writeText('params', `${state.width} x ${state.height}; ${state.widthSegments} x ${state.heightSegments} 段`);
  }

  bindRange('width', 'width-value', formatNumber, (value) => {
    state.width = value;
    rebuild();
  });
  bindRange('height', 'height-value', formatNumber, (value) => {
    state.height = value;
    rebuild();
  });
  bindRange('width-segments', 'width-segments-value', formatNumber, (value) => {
    state.widthSegments = value;
    rebuild();
  });
  bindRange('height-segments', 'height-segments-value', formatNumber, (value) => {
    state.heightSegments = value;
    rebuild();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    preview.group.rotation.z = Math.sin(time * 0.7) * 0.12;
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
