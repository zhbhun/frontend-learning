/*
本示例演示 DOM 叠层和 canvas 拾取如何划清边界。
读代码先看 setOverlayBlocking() 和 handleCanvasPointerMove()：叠层是否拦截由 pointer-events 决定，Raycaster 只处理真正落到 canvas 的事件。
页面控件对应 API：叠层拦截指针 -> blocker.style.pointerEvents；Hover / 选中 -> Raycaster.intersectObjects()。
预期观察：叠层拦截时，指针移到测试区会停止 canvas hover；关闭拦截后，指针会穿透叠层继续拾取 3D 对象。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createCamera,
  createRenderer,
  createScene,
  disposeObjectTree,
  getPointerNdc,
  startRenderLoop,
  syncRendererSize
} from '../shared-stage.js';

const BASE_COLOR = {
  hover: '#c96332',
  selected: '#305f9f',
  none: '#000000'
};

export function createDomOverlayScene({ canvas, blocker, onSnapshot }) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pickables = createPickableObjects();

  let hover = null;
  let selected = null;
  let source = '无';
  let overlayBlocking = true;

  addBaseLights(scene);
  addReferenceGrid(scene);
  pickables.forEach((object) => scene.add(object));

  canvas.addEventListener('pointermove', handleCanvasPointerMove);
  canvas.addEventListener('pointerleave', handleCanvasPointerLeave);
  canvas.addEventListener('click', handleCanvasClick);
  blocker.addEventListener('pointermove', handleOverlayPointer);
  blocker.addEventListener('click', handleOverlayPointer);

  const stop = startRenderLoop((time) => {
    pickables.forEach((object, index) => {
      object.rotation.y = time * 0.00035 + index * 0.18;
    });
    syncRendererSize({ renderer, camera, element: canvas.parentElement, pixelRatioLimit: 2 });
    renderer.render(scene, camera);
  });

  publish();

  function handleCanvasPointerMove(event) {
    source = 'canvas pointermove';
    const hit = pick(event);
    setHover(hit?.object ?? null);
    publish();
  }

  function handleCanvasPointerLeave() {
    source = 'canvas pointerleave';
    setHover(null);
    publish();
  }

  function handleCanvasClick(event) {
    source = 'canvas click';
    const hit = pick(event);
    selected = hit?.object ?? null;
    applyObjectStates();
    publish();
  }

  function handleOverlayPointer(event) {
    source = `DOM ${event.type}`;
    setHover(null);
    publish();
  }

  function pick(event) {
    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickables, false)[0];
  }

  function setHover(object) {
    hover = object;
    applyObjectStates();
  }

  function applyObjectStates() {
    pickables.forEach((object) => {
      object.scale.setScalar(object === selected ? 1.16 : object === hover ? 1.08 : 1);
      object.material.emissive.set(object === selected ? BASE_COLOR.selected : object === hover ? BASE_COLOR.hover : BASE_COLOR.none);
    });
  }

  function publish() {
    onSnapshot?.({
      source,
      ndcX: pointer.x,
      ndcY: pointer.y,
      hover: hover?.name ?? '无',
      selected: selected?.name ?? '无',
      overlayMode: overlayBlocking ? '拦截 canvas' : '穿透到 canvas'
    });
  }

  return {
    setOverlayBlocking(value) {
      overlayBlocking = value;
      blocker.style.pointerEvents = value ? 'auto' : 'none';
      blocker.classList.toggle('is-pass-through', !value);
      blocker.textContent = value ? 'DOM 叠层测试区' : '穿透叠层测试区';
      source = value ? '叠层恢复拦截' : '叠层允许穿透';
      publish();
    },
    dispose() {
      stop();
      canvas.removeEventListener('pointermove', handleCanvasPointerMove);
      canvas.removeEventListener('pointerleave', handleCanvasPointerLeave);
      canvas.removeEventListener('click', handleCanvasClick);
      blocker.removeEventListener('pointermove', handleOverlayPointer);
      blocker.removeEventListener('click', handleOverlayPointer);
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createPickableObjects() {
  return [
    createPickableMesh('蓝色盒子', new THREE.BoxGeometry(1, 1, 1), '#28747c', -1.7),
    createPickableMesh('橙色球体', new THREE.SphereGeometry(0.62, 32, 20), '#c96332', 0),
    createPickableMesh('绿色圆环', new THREE.TorusKnotGeometry(0.42, 0.15, 72, 12), '#3f7f54', 1.7)
  ];
}

function createPickableMesh(name, geometry, color, x) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.08
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, -0.06, 0);
  return mesh;
}
