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

export function createBoxGeometryLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    width: 2,
    height: 1.4,
    depth: 1.2,
    widthSegments: 2,
    heightSegments: 2,
    depthSegments: 2
  };

  const preview = createPreviewMesh(createGeometry(state));
  scene.add(preview.group);

  function createGeometry(values) {
    return new THREE.BoxGeometry(
      values.width,
      values.height,
      values.depth,
      values.widthSegments,
      values.heightSegments,
      values.depthSegments
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
    writeText(
      'params',
      `${state.width} x ${state.height} x ${state.depth}; ${state.widthSegments}/${state.heightSegments}/${state.depthSegments} 段`
    );
  }

  bindRange('width', 'width-value', formatNumber, (value) => {
    state.width = value;
    rebuild();
  });
  bindRange('height', 'height-value', formatNumber, (value) => {
    state.height = value;
    rebuild();
  });
  bindRange('depth', 'depth-value', formatNumber, (value) => {
    state.depth = value;
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
  bindRange('depth-segments', 'depth-segments-value', formatNumber, (value) => {
    state.depthSegments = value;
    rebuild();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    preview.group.rotation.set(-0.15, time * 0.35, 0.08);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
