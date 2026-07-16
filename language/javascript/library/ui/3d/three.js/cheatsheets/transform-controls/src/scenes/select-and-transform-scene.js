import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { enableViewportAwarePlaneHandles } from '../viewport-aware-transform-controls.js';
import {
  applySelectionState,
  createBaseScene,
  createCamera,
  createRenderer,
  createSelectableObjects,
  disposeObjectTree,
  formatEulerDegrees,
  formatVector3,
  getPointerNdc,
  keepTransformControlsVisible,
  startRenderLoop
} from '../shared-stage.js';

/*
 * 本示例演示 Raycaster 与 TransformControls 的分工：Raycaster 只决定当前对象，
 * TransformControls 只把 gizmo 拖拽写回已 attach 的 Object3D。
 * 阅读主线：先看 handlePointerDown() 的 gizmo 轴保护和拾取列表，再看
 * setSelectedObject() 如何统一高亮、attach/detach，最后看 dragging-changed
 * 如何避免 OrbitControls 同时响应同一次拖拽。
 * 页面控件对应：变换模式 -> setMode；解除选择 -> detach 并清除高亮。
 * 预期观察：点击三个 Mesh 会切换 gizmo；点击空白会隐藏 gizmo；
 * 拖动 gizmo 不会误选背后的对象，也不会带着相机一起转动。
 */
export function createSelectAndTransformLesson(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const selectableObjects = createSelectableObjects();
  let selectedObject = null;
  let action = '点击对象开始';

  scene.add(...selectableObjects);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 0.1, 0);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.update();

  const transformControls = new TransformControls(camera, renderer.domElement);
  const helper = transformControls.getHelper();
  keepTransformControlsVisible(helper);
  const disableViewportAware = enableViewportAwarePlaneHandles(transformControls);
  scene.add(helper);

  function publishSnapshot() {
    onSnapshot?.({
      selected: selectedObject?.name ?? '无',
      dragging: transformControls.dragging,
      position: selectedObject ? formatVector3(selectedObject.position) : '-',
      rotation: selectedObject ? formatEulerDegrees(selectedObject.rotation) : '-',
      scale: selectedObject ? formatVector3(selectedObject.scale) : '-',
      action
    });
  }

  function setSelectedObject(nextObject, nextAction) {
    selectedObject = nextObject;
    action = nextAction;

    selectableObjects.forEach((object) => {
      applySelectionState(object, object === selectedObject);
    });

    if (nextObject) {
      transformControls.attach(nextObject);
    } else {
      transformControls.detach();
    }

    publishSnapshot();
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    // pointerdown 到达这里前，TransformControls 已更新 axis；命中 gizmo 就不再拾取场景对象。
    if (transformControls.axis !== null) return;

    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(selectableObjects, false)[0] ?? null;

    setSelectedObject(hit?.object ?? null, hit ? `已选中：${hit.object.name}` : '点击空白，已解除选择');
  }

  function handleDraggingChanged(event) {
    orbitControls.enabled = !event.value;
    action = event.value ? '正在变换对象' : selectedObject ? '对象变换结束' : '无选择对象';
    publishSnapshot();
  }

  function handleObjectChange() {
    action = '对象变换已更新';
    publishSnapshot();
  }

  transformControls.addEventListener('dragging-changed', handleDraggingChanged);
  transformControls.addEventListener('objectChange', handleObjectChange);
  canvas.addEventListener('pointerdown', handlePointerDown);

  const stop = startRenderLoop(renderer, scene, camera, canvas, () => {
    orbitControls.update();
  });

  publishSnapshot();

  return {
    setMode(mode) {
      transformControls.setMode(mode);
    },
    clearSelection() {
      setSelectedObject(null, '手动解除选择');
    },
    dispose() {
      stop();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
      transformControls.removeEventListener('objectChange', handleObjectChange);
      transformControls.detach();
      scene.remove(helper);
      disableViewportAware();
      transformControls.dispose();
      orbitControls.dispose();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
