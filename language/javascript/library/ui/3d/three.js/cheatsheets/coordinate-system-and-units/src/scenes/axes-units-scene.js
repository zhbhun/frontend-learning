import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  x: 1,
  y: 0.5,
  z: -1,
  size: 1
};

function formatVector(vector) {
  return `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}, ${vector.z.toFixed(1)})`;
}

export function createAxesUnitsScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();

  const scene = createBaseScene();

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.45 })
  );
  cube.name = 'unitCube';

  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: '#0f172a' })
  );
  cube.add(cubeEdges);

  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 24, 16),
    new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.35 })
  );
  origin.name = 'worldOrigin';

  const vectorData = new Float32Array(6);
  const vectorGeometry = new THREE.BufferGeometry();
  vectorGeometry.setAttribute('position', new THREE.BufferAttribute(vectorData, 3));
  const positionVector = new THREE.Line(
    vectorGeometry,
    new THREE.LineBasicMaterial({ color: '#256f85', linewidth: 2 })
  );
  positionVector.name = 'positionVector';

  scene.add(cube, origin, positionVector);

  function updatePositionVector() {
    // 这条线从世界原点指向 cube.position，方便把 position 看成一个 Vector3。
    vectorData[0] = 0;
    vectorData[1] = 0;
    vectorData[2] = 0;
    vectorData[3] = cube.position.x;
    vectorData[4] = cube.position.y;
    vectorData[5] = cube.position.z;
    vectorGeometry.attributes.position.needsUpdate = true;
    vectorGeometry.computeBoundingSphere();
  }

  function updateObjectTransform() {
    // position 使用世界单位；scale 基于原始 1x1x1 几何放大或缩小。
    cube.position.set(state.x, state.y, state.z);
    cube.scale.setScalar(state.size);
    updatePositionVector();
  }

  function publishSnapshot() {
    onSnapshot?.({
      position: formatVector(cube.position),
      edge: state.size,
      bottomY: state.y - state.size / 2
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    updateObjectTransform();
    publishSnapshot();
    renderer.render(scene, camera);
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setX(x) {
      state.x = x;
      render();
    },
    setY(y) {
      state.y = y;
      render();
    },
    setZ(z) {
      state.z = z;
      render();
    },
    setSize(size) {
      state.size = size;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
