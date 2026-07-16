import * as THREE from 'three';
import {
  applyObjectState,
  createBaseScene,
  createCamera,
  createPickableSet,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  getPointerNdc,
  startRenderLoop
} from '../shared-stage.js';
import { bindButton, writeText } from '../shared-ui.js';

/*
 * 本示例演示 click selection：hover 是临时状态，selected 是点击后保留的状态。
 * 阅读主线：看 pick() 统一生成命中结果，再看 updateVisualStates() 如何让 selected 优先于 hover。
 * 页面控件对应：取消选中 -> 清空 selected；点击空白 -> 也清空 selected。
 * 预期观察：移开指针会清掉 hover，但点击选中的对象仍保持选中颜色和缩放。
 */
export function createClickSelectionLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pickables = createPickableSet();
  let hovered = null;
  let selected = null;

  scene.add(...pickables);

  function pick(event) {
    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickables, false)[0] ?? null;
  }

  function updateVisualStates() {
    pickables.forEach((object) => {
      if (object === selected) {
        applyObjectState(object, 'selected');
      } else if (object === hovered) {
        applyObjectState(object, 'hover');
      } else {
        applyObjectState(object, 'idle');
      }
    });

    writeText('hover-state', hovered?.name ?? '无');
    writeText('selected-state', selected?.name ?? '无');
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  }

  function handlePointerMove(event) {
    const hit = pick(event);
    hovered = hit?.object ?? null;
    updateVisualStates();
  }

  function handlePointerLeave() {
    hovered = null;
    updateVisualStates();
  }

  function handleClick(event) {
    const hit = pick(event);
    selected = hit?.object ?? null;
    writeText('hit-state', hit ? `${hit.object.name}; distance ${formatNumber(hit.distance)}` : '空白');
    writeText('action-state', selected ? '已选中' : '已取消');
    updateVisualStates();
  }

  bindButton('clear-selection', () => {
    selected = null;
    writeText('action-state', '手动取消');
    writeText('hit-state', '-');
    updateVisualStates();
  });

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('click', handleClick);

  const stop = startRenderLoop(renderer, scene, camera, canvas, (elapsed) => {
    pickables[0].rotation.y = elapsed * 0.35;
    pickables[2].rotation.y = elapsed * 0.5;
  });

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
