import * as THREE from 'three';
import {
  applyObjectState,
  createBaseScene,
  createCamera,
  createPickableMesh,
  createRenderer,
  disposeObjectTree,
  formatLayer,
  getPointerNdc,
  startRenderLoop
} from '../shared-stage.js';
import { bindSelect, writeText } from '../shared-ui.js';

/*
 * 本示例演示 raycaster.layers：对象可以看得见，但只有当前层会参与拾取。
 * 阅读主线：看 createLayeredObjects() 设置 object.layers，再看 setLayerMode() 设置 raycaster.layers。
 * 页面控件对应：可拾取层 -> raycaster.layers.set(layer)。
 * 预期观察：三个对象都可见；切换可拾取层后，只有对应 layer 的对象能 hover。
 */
export function createLayersFilterLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pickables = createLayeredObjects();
  let hovered = null;

  // 可见性由 camera.layers 控制；拾取过滤由 raycaster.layers 控制，二者互不等同。
  camera.layers.enable(1);
  camera.layers.enable(2);
  scene.add(...pickables);

  function setLayerMode(layer) {
    raycaster.layers.set(layer);
    writeText('raycaster-state', formatLayer(layer));
    setHovered(null);
  }

  function setHovered(object) {
    if (hovered && hovered !== object) {
      applyObjectState(hovered, 'idle');
    }

    hovered = object;

    if (hovered) {
      applyObjectState(hovered, 'hover');
      writeText('hover-state', hovered.name);
      writeText('object-layer-state', formatLayer(hovered.userData.layer));
      canvas.style.cursor = 'pointer';
    } else {
      writeText('hover-state', '无');
      writeText('object-layer-state', '-');
      canvas.style.cursor = 'default';
    }
  }

  function handlePointerMove(event) {
    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects(pickables, false)[0];
    setHovered(hit?.object ?? null);
  }

  bindSelect('layer-mode', (value) => setLayerMode(Number(value)));
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', () => setHovered(null));

  const stop = startRenderLoop(renderer, scene, camera, canvas, (elapsed) => {
    pickables[0].rotation.y = elapsed * 0.28;
    pickables[1].rotation.y = elapsed * 0.28;
    pickables[2].rotation.y = elapsed * 0.28;
  });

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createLayeredObjects() {
  return [
    createPickableMesh({
      name: '默认层盒子',
      geometry: new THREE.BoxGeometry(1, 1, 1),
      color: '#2f83d8',
      position: new THREE.Vector3(-1.75, -0.15, 0),
      layer: 0
    }),
    createPickableMesh({
      name: '交互层球体',
      geometry: new THREE.SphereGeometry(0.62, 32, 20),
      color: '#36a269',
      position: new THREE.Vector3(0, -0.1, 0),
      layer: 1
    }),
    createPickableMesh({
      name: '装饰层圆环',
      geometry: new THREE.TorusKnotGeometry(0.42, 0.16, 72, 12),
      color: '#d6832b',
      position: new THREE.Vector3(1.75, -0.1, 0),
      layer: 2
    })
  ];
}
