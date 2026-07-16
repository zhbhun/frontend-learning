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

export function createTorusGeometryLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    radius: 1.35,
    tube: 0.32,
    radialSegments: 10,
    tubularSegments: 36,
    arc: 360
  };

  const preview = createPreviewMesh(createGeometry(state));
  scene.add(preview.group);

  function createGeometry(values) {
    return new THREE.TorusGeometry(
      values.radius,
      Math.min(values.tube, values.radius - 0.05),
      values.radialSegments,
      values.tubularSegments,
      THREE.MathUtils.degToRad(values.arc)
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
    writeText('params', `R ${state.radius}; tube ${state.tube}; ${state.radialSegments}/${state.tubularSegments}; ${state.arc}deg`);
  }

  bindRange('radius', 'radius-value', formatNumber, (value) => {
    state.radius = value;
    rebuild();
  });
  bindRange('tube', 'tube-value', formatNumber, (value) => {
    state.tube = value;
    rebuild();
  });
  bindRange('radial-segments', 'radial-segments-value', formatNumber, (value) => {
    state.radialSegments = value;
    rebuild();
  });
  bindRange('tubular-segments', 'tubular-segments-value', formatNumber, (value) => {
    state.tubularSegments = value;
    rebuild();
  });
  bindRange('arc', 'arc-value', (value) => `${value}deg`, (value) => {
    state.arc = value;
    rebuild();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    preview.group.rotation.set(0.28, time * 0.36, 0.12);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
