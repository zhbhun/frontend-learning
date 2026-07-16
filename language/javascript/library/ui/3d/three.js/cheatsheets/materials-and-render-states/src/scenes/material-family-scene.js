import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createStudioGeometry,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

const MATERIALS = [
  {
    key: 'basic',
    x: -3.2,
    create: () => new THREE.MeshBasicMaterial({ color: '#2f83d8' }),
    summary: '不受光照影响'
  },
  {
    key: 'normal',
    x: -1.6,
    create: () => new THREE.MeshNormalMaterial({ flatShading: false }),
    summary: '法线方向变颜色'
  },
  {
    key: 'lambert',
    x: 0,
    create: () => new THREE.MeshLambertMaterial({ color: '#36a269' }),
    summary: '受光，无高光'
  },
  {
    key: 'phong',
    x: 1.6,
    create: () => new THREE.MeshPhongMaterial({ color: '#d37a2d', specular: '#ffffff', shininess: 55 }),
    summary: '受光，有高光'
  },
  {
    key: 'standard',
    x: 3.2,
    create: () => new THREE.MeshStandardMaterial({ color: '#7c5cc7', metalness: 0.15, roughness: 0.42 }),
    summary: 'PBR 参数'
  }
];

export function createMaterialFamilyLesson(canvas) {
  const renderer = createRenderer(canvas);
  const { scene, key } = createBaseScene();
  const camera = createCamera();
  const geometry = createStudioGeometry();
  const state = {
    lightIntensity: 1.4,
    lightX: -2.6,
    shininess: 55,
    wireframe: false
  };

  const meshes = MATERIALS.map((entry) => {
    const mesh = new THREE.Mesh(geometry, entry.create());
    mesh.position.x = entry.x;
    mesh.userData.entry = entry;
    scene.add(mesh);
    return mesh;
  });

  function updateMaterials() {
    key.intensity = state.lightIntensity;
    key.position.x = state.lightX;

    meshes.forEach((mesh) => {
      mesh.material.wireframe = state.wireframe;
      if ('shininess' in mesh.material) {
        mesh.material.shininess = state.shininess;
      }
      mesh.material.needsUpdate = true;
    });

    writeText('basic-state', `${MATERIALS[0].summary}; wireframe ${state.wireframe}`);
    writeText('normal-state', `${MATERIALS[1].summary}; flatShading false`);
    writeText('lambert-state', `${MATERIALS[2].summary}; light ${formatNumber(state.lightIntensity)}`);
    writeText('phong-state', `${MATERIALS[3].summary}; shininess ${state.shininess}`);
    writeText('standard-state', `${MATERIALS[4].summary}; metalness 0.15 roughness 0.42`);
  }

  bindRange('light-intensity', 'light-intensity-value', formatNumber, (value) => {
    state.lightIntensity = value;
    updateMaterials();
  });
  bindRange('light-x', 'light-x-value', formatNumber, (value) => {
    state.lightX = value;
    updateMaterials();
  });
  bindRange('shininess', 'shininess-value', formatNumber, (value) => {
    state.shininess = value;
    updateMaterials();
  });
  bindCheckbox('wireframe', (checked) => {
    state.wireframe = checked;
    updateMaterials();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    meshes.forEach((mesh, index) => {
      mesh.rotation.set(0.4, time * 0.45 + index * 0.2, 0.08);
    });
  });

  return {
    dispose() {
      stop();
      geometry.dispose();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
