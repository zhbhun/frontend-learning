/*
 * 本示例演示什么：
 * 用 EffectComposer 串起 RenderPass + OutputPass，并对比 composer.render() 与 renderer.render() 的渲染入口。
 * 读代码先看哪里：
 * 先看 composer.addPass(renderPass) 和 composer.addPass(outputPass)，再看 render() 里如何选择 composer 或 renderer。
 * 控件对应哪些 API：
 * 渲染入口 -> composer.render() / renderer.render(scene, camera)；曝光 -> renderer.toneMappingExposure。
 * 预期观察什么：
 * 只有基础链时画面接近直渲染；一旦加入 Bloom、Outline、FXAA 这类 pass，最终循环就应该调用 composer.render()。
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
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
  formatSize,
  passNames,
  startFrameLoop
} from '../shared-stage.js';
import { bindRange, bindSelect, writeText } from '../shared-ui.js';

export function createComposerChainLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#edf3f4' });
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const { scene } = createBaseScene('#edf3f4');
  const objects = createShowcaseObjects();
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const outputPass = new OutputPass();
  const state = {
    renderMode: 'composer'
  };

  scene.add(createFloor(), ...objects);

  // Pass 的加入顺序就是执行顺序；RenderPass 先把 3D 场景画进 composer 的读写缓冲。
  composer.addPass(renderPass);
  // OutputPass 放在链路末端，读取 renderer 的 toneMapping / outputColorSpace 输出到屏幕。
  composer.addPass(outputPass);

  function writeState(size) {
    writeText('entry-state', state.renderMode === 'composer' ? 'composer.render() 执行 pass 链' : 'renderer.render(scene, camera) 跳过 pass 链');
    writeText('pass-state', passNames(composer));
    writeText('size-state', size ? formatSize(size) : '-');
    writeText('output-state', `outputColorSpace=${renderer.outputColorSpace}; exposure=${formatNumber(renderer.toneMappingExposure)}`);
  }

  bindSelect('render-mode', (value) => {
    state.renderMode = value;
    writeState();
  });

  bindRange('exposure', (value) => {
    renderer.toneMappingExposure = value;
    writeState();
  });

  const stop = startFrameLoop({
    renderer,
    camera,
    composer,
    canvas,
    controls,
    onFrame(elapsed, size) {
      objects[0].rotation.set(elapsed * 0.32, elapsed * 0.25, 0);
      objects[1].rotation.y = -elapsed * 0.26;
      objects[2].rotation.y = elapsed * 0.42;
      writeState(size);
    },
    render() {
      if (state.renderMode === 'composer') {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    outputPass.dispose();
    composer.dispose();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
