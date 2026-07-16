import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  getVertexCount,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  wireframe: false,
  normal: false,
  showBox: true,
  rotation: 35,
  scale: 1
};

export function createMeshPartsScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();

  // Mesh 把形状数据和表面规则装进一个可变换的 Object3D。
  const geometry = new THREE.BoxGeometry(1.8, 1.2, 1.1, 2, 1, 1);
  const standardMaterial = new THREE.MeshStandardMaterial({
    color: '#4277d9',
    roughness: 0.48,
    metalness: 0.08
  });
  const normalMaterial = new THREE.MeshNormalMaterial({ flatShading: false });
  const mesh = new THREE.Mesh(geometry, standardMaterial);
  mesh.position.y = 0.15;
  scene.add(mesh);

  const helper = new THREE.BoxHelper(mesh, '#d45b3f');
  scene.add(helper);

  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  function syncMesh() {
    mesh.rotation.y = THREE.MathUtils.degToRad(state.rotation);
    mesh.rotation.x = THREE.MathUtils.degToRad(12);
    mesh.scale.setScalar(state.scale);
    mesh.material = state.normal ? normalMaterial : standardMaterial;
    mesh.material.wireframe = state.wireframe;
    helper.visible = state.showBox;
    helper.update();
  }

  function publishSnapshot() {
    box.setFromObject(mesh);
    box.getSize(size);

    onSnapshot?.({
      geometry: mesh.geometry.type,
      material: mesh.material.type,
      vertices: getVertexCount(mesh.geometry),
      sizeText: formatVector(size),
      rotation: state.rotation,
      scale: state.scale,
      wireframe: mesh.material.wireframe
    });
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);
    syncMesh();
    renderer.render(scene, camera);
    publishSnapshot();
  }

  render();
  const observer = createResizeObserver(canvas, render);

  return {
    setWireframe(enabled) {
      state.wireframe = enabled;
      render();
    },
    setNormal(enabled) {
      state.normal = enabled;
      render();
    },
    setShowBox(enabled) {
      state.showBox = enabled;
      render();
    },
    setRotation(rotation) {
      state.rotation = rotation;
      render();
    },
    setScale(scale) {
      state.scale = scale;
      render();
    },
    dispose() {
      observer.disconnect();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
