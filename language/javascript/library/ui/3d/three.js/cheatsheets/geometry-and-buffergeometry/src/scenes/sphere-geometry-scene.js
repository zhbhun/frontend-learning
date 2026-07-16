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

export function createSphereGeometryLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    radius: 1.4,
    widthSegments: 18,
    heightSegments: 12,
    phiLength: 360,
    thetaLength: 180
  };

  const preview = createPreviewMesh(createGeometry(state));
  scene.add(preview.group);

  function createGeometry(values) {
    return new THREE.SphereGeometry(
      values.radius,
      values.widthSegments,
      values.heightSegments,
      0,
      THREE.MathUtils.degToRad(values.phiLength),
      0,
      THREE.MathUtils.degToRad(values.thetaLength)
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
    writeText('params', `r ${state.radius}; ${state.widthSegments} x ${state.heightSegments}; ${state.phiLength}deg/${state.thetaLength}deg`);
  }

  bindRange('radius', 'radius-value', formatNumber, (value) => {
    state.radius = value;
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
  bindRange('phi-length', 'phi-length-value', (value) => `${value}deg`, (value) => {
    state.phiLength = value;
    rebuild();
  });
  bindRange('theta-length', 'theta-length-value', (value) => `${value}deg`, (value) => {
    state.thetaLength = value;
    rebuild();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    preview.group.rotation.set(-0.25, time * 0.32, 0.05);
  });

  return {
    dispose() {
      stop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
