/*
 * 本示例演示什么：
 * 用 OutlinePass 给 selectedObjects 中的对象画轮廓，并用点击或按钮切换选中目标。
 * 读代码先看哪里：
 * 先看 selectedObjects 数组和 selectObject()，再看 OutlinePass 的构造参数与 pass 顺序。
 * 控件对应哪些 API：
 * 对象按钮 / canvas 点击 -> outlinePass.selectedObjects；edgeStrength / edgeThickness -> 轮廓强度和粗细。
 * 预期观察什么：
 * selectedObjects 为空时没有轮廓；数组中放入某个 Object3D 后，只有它及其子级会被轮廓高亮。
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import {
  createBaseScene,
  createCamera,
  createControls,
  createFloor,
  createRenderer,
  createShowcaseObjects,
  disposeObjectTree,
  formatNumber,
  getPointerNdc,
  passNames,
  startFrameLoop
} from '../shared-stage.js';
import { bindButton, bindRange, writeText } from '../shared-ui.js';

export function createOutlinePassLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#121923' });
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const { scene } = createBaseScene('#121923');
  const pickables = createShowcaseObjects();
  const selectedObjects = [];
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const outlinePass = new OutlinePass(new THREE.Vector2(1, 1), scene, camera, selectedObjects);
  const outputPass = new OutputPass();
  let selected = null;

  scene.add(createFloor(), ...pickables);

  outlinePass.visibleEdgeColor.set('#ffffff');
  outlinePass.hiddenEdgeColor.set('#ff6b3a');
  outlinePass.edgeStrength = 3;
  outlinePass.edgeThickness = 1.6;

  composer.addPass(renderPass);
  // OutlinePass 需要原 scene 和 camera，它会额外渲染 mask / depth / edge 多个缓冲。
  composer.addPass(outlinePass);
  composer.addPass(outputPass);

  function selectObject(object, reason = '按钮') {
    selected = object;
    selectedObjects.length = 0;

    if (selected) {
      selectedObjects.push(selected);
    }

    outlinePass.selectedObjects = selectedObjects;
    writeState(reason);
  }

  function pick(event) {
    getPointerNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickables, false)[0] ?? null;
  }

  function writeState(reason = '-') {
    writeText('selected-state', selected?.name ?? '无');
    writeText('objects-state', `[${selectedObjects.map((object) => object.name).join(', ') || '空'}]`);
    writeText(
      'outline-state',
      `${passNames(composer)}; edgeStrength=${formatNumber(outlinePass.edgeStrength)}; edgeThickness=${formatNumber(outlinePass.edgeThickness)}`
    );
    writeText('hit-state', reason);
  }

  bindButton('select-box', () => selectObject(pickables[0], '按钮选中立方体'));
  bindButton('select-sphere', () => selectObject(pickables[1], '按钮选中球体'));
  bindButton('select-torus', () => selectObject(pickables[2], '按钮选中圆环'));
  bindButton('clear-selection', () => selectObject(null, '清空 selectedObjects'));
  bindRange('edge-strength', (value) => {
    outlinePass.edgeStrength = value;
    writeState('调整 edgeStrength');
  });
  bindRange('edge-thickness', (value) => {
    outlinePass.edgeThickness = value;
    writeState('调整 edgeThickness');
  });

  canvas.addEventListener('click', (event) => {
    const hit = pick(event);
    selectObject(hit?.object ?? null, hit ? `点击命中 ${hit.object.name}` : '点击空白');
  });

  selectObject(pickables[1], '默认选中球体');

  const stop = startFrameLoop({
    renderer,
    camera,
    composer,
    canvas,
    controls,
    onFrame(elapsed) {
      pickables[0].rotation.y = elapsed * 0.32;
      pickables[1].rotation.y = -elapsed * 0.2;
      pickables[2].rotation.y = elapsed * 0.5;
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    outlinePass.dispose();
    outputPass.dispose();
    composer.dispose();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
