/*
 * 本示例演示什么：
 * 用 FXAAPass 做后处理抗锯齿，并观察 pixel ratio 和 composer.setSize() 对 FXAA resolution uniform 的影响。
 * 读代码先看哪里：
 * 先看 RenderPass -> OutputPass -> FXAAPass 的顺序，再看 startFrameLoop 如何同步 renderer 与 composer 尺寸。
 * 控件对应哪些 API：
 * FXAA 开关 -> fxaaPass.enabled；pixel ratio -> renderer.setPixelRatio() 和 composer.setPixelRatio()。
 * 预期观察什么：
 * 关闭 FXAA 时高对比斜线边缘更硬；提高 pixel ratio 会增加 buffer 尺寸，FXAA 的 resolution 也要随 composer.setSize() 更新。
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import {
  createBaseScene,
  createCamera,
  createControls,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  formatSize,
  passNames,
  startFrameLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

export function createAntialiasPassLesson(canvas) {
  const state = {
    pixelRatio: 1
  };
  const renderer = createRenderer(canvas, { clearColor: '#101722', pixelRatio: state.pixelRatio });
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const { scene } = createBaseScene('#101722');
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const outputPass = new OutputPass();
  const fxaaPass = new FXAAPass();
  const target = createAliasingTarget();

  scene.add(target);

  composer.addPass(renderPass);
  // 当前 three.js 的 OutputPass 文档说明 FXAA 需要 sRGB 输入，因此 FXAA 放在 OutputPass 后面。
  composer.addPass(outputPass);
  composer.addPass(fxaaPass);

  function writeState(size) {
    const resolution = fxaaPass.material.uniforms.resolution.value;
    writeText('chain-state', passNames(composer));
    writeText('size-state', size ? formatSize(size) : '-');
    writeText('fxaa-state', `enabled=${fxaaPass.enabled}; resolution=${formatNumber(resolution.x, 6)}, ${formatNumber(resolution.y, 6)}`);
    writeText('compare-state', '斜线和高对比边缘最容易看出 FXAA 与 pixel ratio 的差异');
  }

  bindSelect('fxaa-mode', (value) => {
    fxaaPass.enabled = value === 'on';
    writeState();
  });

  bindRange('pixel-ratio', (value) => {
    state.pixelRatio = value;
    writeState();
  });

  const stop = startFrameLoop({
    renderer,
    camera,
    composer,
    canvas,
    controls,
    getPixelRatio() {
      return state.pixelRatio;
    },
    onFrame(elapsed, size) {
      target.rotation.y = elapsed * 0.28;
      writeState(size);
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    fxaaPass.dispose();
    outputPass.dispose();
    composer.dispose();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createAliasingTarget() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: '#f6f1e7', side: THREE.DoubleSide });
  const accent = new THREE.MeshBasicMaterial({ color: '#37c2a1', side: THREE.DoubleSide });

  for (let i = 0; i < 14; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 0.035), i % 3 === 0 ? accent : material);
    bar.position.x = (i - 6.5) * 0.25;
    bar.position.y = -0.18;
    bar.rotation.z = THREE.MathUtils.degToRad(34);
    group.add(bar);
  }

  const blackPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 2.9),
    new THREE.MeshBasicMaterial({ color: '#151b25', side: THREE.DoubleSide })
  );
  blackPanel.position.z = -0.08;
  blackPanel.position.y = -0.18;

  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, 0.018, 8, 96),
    new THREE.MeshBasicMaterial({ color: '#ff8a4f' })
  );
  edge.rotation.x = THREE.MathUtils.degToRad(62);
  edge.position.set(0.15, -0.12, 0.22);

  group.add(blackPanel, edge);
  return group;
}
