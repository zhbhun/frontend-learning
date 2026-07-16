import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  getVertexCount,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  geometry: 'box',
  material: 'standard',
  opacity: 1,
  animate: true,
  lastTime: 0,
  animationId: 0
};

function createGeometry(kind) {
  if (kind === 'sphere') return new THREE.SphereGeometry(0.9, 32, 18);
  if (kind === 'cone') return new THREE.ConeGeometry(0.85, 1.7, 32);
  if (kind === 'torus') return new THREE.TorusGeometry(0.72, 0.24, 18, 36);
  return new THREE.BoxGeometry(1.5, 1.2, 1.2, 2, 2, 2);
}

function createMaterial(kind, opacity) {
  const transparent = opacity < 1;

  if (kind === 'normal') {
    return new THREE.MeshNormalMaterial({ opacity, transparent });
  }

  if (kind === 'basic') {
    return new THREE.MeshBasicMaterial({
      color: '#d97935',
      opacity,
      transparent
    });
  }

  return new THREE.MeshStandardMaterial({
    color: '#3d73d9',
    roughness: 0.45,
    metalness: 0.08,
    opacity,
    transparent
  });
}

export function createReplacePartsScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();

  const mesh = new THREE.Mesh(createGeometry(state.geometry), createMaterial(state.material, state.opacity));
  mesh.position.y = 0.15;
  scene.add(mesh);

  function replaceGeometry(kind) {
    const previous = mesh.geometry;
    mesh.geometry = createGeometry(kind);
    previous.dispose();
  }

  function replaceMaterial(kind) {
    const previous = mesh.material;
    mesh.material = createMaterial(kind, state.opacity);
    previous.dispose();
  }

  function applyOpacity() {
    mesh.material.opacity = state.opacity;
    mesh.material.transparent = state.opacity < 1;
    mesh.material.needsUpdate = true;
  }

  function publishSnapshot() {
    onSnapshot?.({
      geometry: mesh.geometry.type,
      material: mesh.material.type,
      vertices: getVertexCount(mesh.geometry),
      opacity: mesh.material.opacity,
      animate: state.animate
    });
  }

  function resize() {
    resizeRendererAndCamera(renderer, camera, canvas);
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    resize();

    if (state.animate) {
      mesh.rotation.x += delta * 0.35;
      mesh.rotation.y += delta * 0.7;
    }

    renderer.render(scene, camera);
    publishSnapshot();
    state.animationId = window.requestAnimationFrame(render);
  }

  resize();
  render();

  const observer = createResizeObserver(canvas, resize);

  return {
    setGeometry(kind) {
      state.geometry = kind;
      replaceGeometry(kind);
      publishSnapshot();
    },
    setMaterial(kind) {
      state.material = kind;
      replaceMaterial(kind);
      publishSnapshot();
    },
    setOpacity(opacity) {
      state.opacity = opacity;
      applyOpacity();
      publishSnapshot();
    },
    setAnimate(enabled) {
      state.animate = enabled;
      publishSnapshot();
    },
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
