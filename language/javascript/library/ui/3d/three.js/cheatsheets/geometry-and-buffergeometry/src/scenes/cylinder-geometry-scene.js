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
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

export function createCylinderGeometryLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    radiusTop: 1,
    radiusBottom: 1.2,
    height: 2.2,
    radialSegments: 16,
    heightSegments: 2,
    openEnded: false
  };

  const preview = createPreviewMesh(createGeometry(state));
  scene.add(preview.group);

  function createGeometry(values) {
    return new THREE.CylinderGeometry(
      values.radiusTop,
      values.radiusBottom,
      values.height,
      values.radialSegments,
      values.heightSegments,
      values.openEnded
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
    writeText('params', `${state.radiusTop}/${state.radiusBottom}; h ${state.height}; ${state.radialSegments} 边; ${state.openEnded ? '开口' : '封口'}`);
  }

  bindRange('radius-top', 'radius-top-value', formatNumber, (value) => {
    state.radiusTop = value;
    rebuild();
  });
  bindRange('radius-bottom', 'radius-bottom-value', formatNumber, (value) => {
    state.radiusBottom = value;
    rebuild();
  });
  bindRange('height', 'height-value', formatNumber, (value) => {
    state.height = value;
    rebuild();
  });
  bindRange('radial-segments', 'radial-segments-value', formatNumber, (value) => {
    state.radialSegments = value;
    rebuild();
  });
  bindRange('height-segments', 'height-segments-value', formatNumber, (value) => {
    state.heightSegments = value;
    rebuild();
  });
  bindCheckbox('open-ended', (checked) => {
    state.openEnded = checked;
    rebuild();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    preview.group.rotation.set(-0.12, time * 0.34, 0.04);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
