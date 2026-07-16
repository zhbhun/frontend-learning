import * as THREE from 'three';
import {
  applyObjectState,
  createBaseScene,
  createCamera,
  createPickableSet,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  formatVector3,
  getPointerNdc,
  startRenderLoop
} from '../shared-stage.js';
import { writeText } from '../shared-ui.js';

/*
 * 本示例演示 hover：pointermove 时实时 raycast，最近命中对象临时高亮。
 * 阅读主线：看 handlePointerMove() 如何用 hits[0] 更新 hovered，再看 setHovered() 如何恢复旧对象。
 * 页面读数对应：hover 是 hits[0].object；distance 和 point 来自第一个 Intersection。
 * 预期观察：指针移出对象后 hover 清空，临时高亮不会保留。
 */
export function createHoverHighlightLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pickables = createPickableSet();
  let hovered = null;

  scene.add(...pickables);

  function setHovered(object, hit) {
    if (hovered && hovered !== object) {
      applyObjectState(hovered, 'idle');
    }

    hovered = object;

    if (hovered) {
      applyObjectState(hovered, 'hover');
      writeText('hover-state', hovered.name);
      writeText('distance-state', formatNumber(hit.distance));
      writeText('point-state', formatVector3(hit.point));
      canvas.style.cursor = 'pointer';
    } else {
      writeText('hover-state', '无');
      writeText('distance-state', '-');
      writeText('point-state', '-');
      canvas.style.cursor = 'default';
    }
  }

  function handlePointerMove(event) {
    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickables, false);
    const firstHit = hits[0];
    setHovered(firstHit?.object ?? null, firstHit);
    writeText('hits-state', String(hits.length));
  }

  function handlePointerLeave() {
    setHovered(null, null);
    writeText('hits-state', '0');
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);

  const stop = startRenderLoop(renderer, scene, camera, canvas, (elapsed) => {
    pickables[2].rotation.y = elapsed * 0.45;
  });

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
