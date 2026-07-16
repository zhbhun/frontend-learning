import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  formatVector3,
  getPointerNdc,
  startRenderLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

/*
 * 本示例演示 Line 和 Points 的拾取阈值：射线不一定要精确穿过几何中心。
 * 阅读主线：看 setThreshold() 如何写 raycaster.params.Line/Points.threshold，再看 pickTargets()。
 * 页面控件对应：threshold 是世界单位容差；目标决定传给 intersectObjects() 的对象数组。
 * 预期观察：阈值越大，指针离折线或点更远时也能命中；阈值越小，命中更严格。
 */
export function createLinePointsThresholdLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const { line, points } = createLineAndPoints();
  const state = {
    targetKind: 'both',
    threshold: 0.12,
    hovered: null
  };

  scene.add(line, points);

  function setThreshold(value) {
    state.threshold = value;
    // Line 和 Points 的 threshold 都是世界单位，不是屏幕像素。
    raycaster.params.Line.threshold = value;
    raycaster.params.Points.threshold = value;
    writeText('params-state', `Line ${formatNumber(value)} / Points ${formatNumber(value)}`);
  }

  function pickTargets() {
    if (state.targetKind === 'line') {
      return [line];
    }

    if (state.targetKind === 'points') {
      return [points];
    }

    return [line, points];
  }

  function setHovered(object, hit) {
    if (state.hovered && state.hovered !== object) {
      paintObject(state.hovered, false);
    }

    state.hovered = object;

    if (state.hovered) {
      paintObject(state.hovered, true);
      writeText('hover-state', state.hovered.name);
      writeText('distance-state', formatNumber(hit.distance));
      writeText('ray-distance-state', hit.distanceToRay === undefined ? '-' : formatNumber(hit.distanceToRay));
      canvas.style.cursor = 'pointer';
    } else {
      writeText('hover-state', '无');
      writeText('distance-state', '-');
      writeText('ray-distance-state', '-');
      canvas.style.cursor = 'default';
    }
  }

  function handlePointerMove(event) {
    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects(pickTargets(), false)[0];
    setHovered(hit?.object ?? null, hit);
  }

  bindSelect('target-kind', (value) => {
    state.targetKind = value;
    setHovered(null, null);
  });
  bindRange('threshold-input', 'threshold-output', formatNumber, setThreshold);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', () => setHovered(null, null));

  const stop = startRenderLoop(renderer, scene, camera, canvas, (elapsed) => {
    points.rotation.y = Math.sin(elapsed * 0.5) * 0.08;
  });

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createLineAndPoints() {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.4, -0.5, 0),
    new THREE.Vector3(-1.4, 0.55, 0),
    new THREE.Vector3(-0.2, -0.15, 0),
    new THREE.Vector3(0.9, 0.65, 0),
    new THREE.Vector3(2.2, -0.35, 0)
  ]);
  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: '#2f83d8', linewidth: 1 })
  );
  line.name = '折线';

  const pointsGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.1, 0.8, 0.1),
    new THREE.Vector3(-0.9, -0.85, 0.1),
    new THREE.Vector3(0.45, 0.95, 0.1),
    new THREE.Vector3(1.55, -0.75, 0.1),
    new THREE.Vector3(2.45, 0.35, 0.1)
  ]);
  const points = new THREE.Points(
    pointsGeometry,
    new THREE.PointsMaterial({
      color: '#36a269',
      size: 0.14,
      sizeAttenuation: true
    })
  );
  points.name = '点集合';

  return { line, points };
}

function paintObject(object, active) {
  if (object.isLine) {
    object.material.color.set(active ? '#d6832b' : '#2f83d8');
  }

  if (object.isPoints) {
    object.material.color.set(active ? '#d6832b' : '#36a269');
    object.material.size = active ? 0.2 : 0.14;
  }
}
