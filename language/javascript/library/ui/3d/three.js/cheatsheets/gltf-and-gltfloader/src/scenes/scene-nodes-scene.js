import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_ASSETS } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createRenderer,
  createScene,
  disposeObjectTree,
  dumpSceneTree,
  formatVector,
  frameObject,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, bindCheckbox, bindSelect, readElement, writeLines, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 glTF 加载后的节点树处理。
 * 阅读主线：先看 loadModel() 加载 MultiNodeBox.gltf，再看 updateSelection() 如何用 getObjectByName() 和 Box3。
 * 控件对应：选中节点 -> Object3D.getObjectByName()；显示包围盒 -> Box3Helper；定位节点 -> 用 Box3 中心重设相机目标。
 * 预期观察：一个 glTF 模型可以有多层 Group 和多个 Mesh，选中父节点时包围盒会包住全部子节点。
 */
export async function createSceneNodesLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const loader = new GLTFLoader();
  const bounds = new THREE.Box3();
  const boundsHelper = new THREE.Box3Helper(bounds, '#d95832');
  let modelRoot = null;
  let selectedObject = null;

  boundsHelper.visible = true;
  scene.add(boundsHelper);

  bindCheckbox('show-bounds', (checked) => {
    boundsHelper.visible = checked;
  });
  bindButton('frame-selected', () => {
    if (selectedObject) {
      frameObject(camera, controls, selectedObject, { fitRatio: 2.2 });
      writeCameraState();
    }
  });

  await loadModel();

  bindSelect('node-name', updateSelection);

  const stop = startRenderLoop(renderer, scene, camera, canvas, controls, () => {});

  async function loadModel() {
    const gltf = await loader.loadAsync(MODEL_ASSETS.multiNode.url);
    modelRoot = gltf.scene;
    modelRoot.name = 'gltf.scene';
    cloneMaterialsForHighlight(modelRoot);
    scene.add(modelRoot);
    frameObject(camera, controls, modelRoot);
    populateNodeSelect(modelRoot);
    writeLines('node-tree', dumpSceneTree(modelRoot));
    writeCameraState();
  }

  function updateSelection(name) {
    clearHighlight(modelRoot);
    selectedObject = modelRoot.getObjectByName(name) || modelRoot;
    applyHighlight(selectedObject);

    selectedObject.updateWorldMatrix(true, true);
    bounds.copy(new THREE.Box3().setFromObject(selectedObject, true));
    boundsHelper.updateMatrixWorld(true);

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const meshCount = countMeshes(selectedObject);

    writeText(
      'selected-state',
      `${selectedObject.name || '(未命名)'} [${selectedObject.type}], children=${selectedObject.children.length}, meshes=${meshCount}`
    );
    writeText('bounds-state', `center=${formatVector(center)}; size=${formatVector(size)}`);
  }

  function populateNodeSelect(root) {
    const select = readElement('node-name');
    const nodes = [];

    root.traverse((object) => {
      if (object.name) {
        nodes.push(object);
      }
    });

    select.replaceChildren(
      ...nodes.map((object) => {
        const option = document.createElement('option');
        option.value = object.name;
        option.textContent = `${object.name} [${object.type}]`;
        return option;
      })
    );
  }

  function writeCameraState() {
    writeText(
      'camera-state',
      `position=${formatVector(camera.position)}; target=${formatVector(controls.target)}`
    );
  }

  return {
    dispose() {
      stop();
      scene.remove(boundsHelper);
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeObjectTree(modelRoot);
      }
      renderer.dispose();
    }
  };
}

function cloneMaterialsForHighlight(root) {
  root.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
}

function clearHighlight(root) {
  root.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.emissive.set('#000000');
      material.emissiveIntensity = 0;
    });
  });
}

function applyHighlight(object) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.emissive.set('#f59e0b');
      material.emissiveIntensity = 0.65;
    });
  });
}

function countMeshes(object) {
  let count = 0;

  object.traverse((child) => {
    if (child.isMesh) {
      count += 1;
    }
  });

  return count;
}
