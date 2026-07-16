import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  formatVector2,
  formatVector3,
  startRenderLoop
} from '../shared-stage.js';
import { writeText } from '../shared-ui.js';

/*
 * 本示例演示 pointer 坐标如何变成 Raycaster 需要的 NDC。
 * 阅读主线：先看 handlePointerMove() 里的 rect/client/NDC 计算，再看 setFromCamera()。
 * 页面读数对应：client -> viewport 坐标；canvas -> canvas 内坐标；NDC -> -1 到 1；hit -> 世界命中点。
 * 预期观察：指针移到画布中心附近时 NDC 接近 0,0；移到上方时 NDC 的 y 为正。
 */
export function createPointerToNdcLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 3.3, 8, 4),
    new THREE.MeshBasicMaterial({
      color: '#dbeafe',
      opacity: 0.5,
      transparent: true,
      wireframe: true,
      side: THREE.DoubleSide
    })
  );
  plane.name = 'NDC 接收面';
  plane.position.set(0, 0.2, 0);

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#d6832b' })
  );
  marker.visible = false;

  scene.add(plane, marker);

  function handlePointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Raycaster.setFromCamera() 要求 NDC：x 向右为正，y 向上为正。
    pointer.x = (canvasX / rect.width) * 2 - 1;
    pointer.y = -(canvasY / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObject(plane, false)[0];
    marker.visible = Boolean(hit);

    if (hit) {
      marker.position.copy(hit.point);
      writeText('hit-state', `${hit.object.name}; ${formatVector3(hit.point)}`);
    } else {
      writeText('hit-state', '无');
    }

    writeText('client-state', `x ${formatNumber(event.clientX)}, y ${formatNumber(event.clientY)}`);
    writeText('canvas-state', `x ${formatNumber(canvasX)}, y ${formatNumber(canvasY)}`);
    writeText('ndc-state', formatVector2(pointer));
    writeText('ray-state', formatVector3(raycaster.ray.direction));
  }

  function handlePointerLeave() {
    marker.visible = false;
    writeText('hit-state', '无');
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);

  const stop = startRenderLoop(renderer, scene, camera, canvas);

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
