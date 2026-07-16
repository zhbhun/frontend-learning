import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIMATED_CUBE_URL } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatNumber,
  formatSeconds,
  frameObject,
  startAnimationLoop
} from '../shared-stage.js';
import {
  bindButton,
  bindCheckbox,
  bindRange,
  readElement,
  setSelectOptions,
  writeText
} from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示 AnimationAction 之间的淡入淡出切换。
 * 阅读主线：先看 actions 预先由 mixer.clipAction() 创建并 play()，再看 crossFadeTo() 如何让旧 action 降权、新 action 升权。
 * 控件对应：淡入时长 -> crossFadeTo(duration)；同步片段速度 -> crossFadeTo(..., warp) 的第三个参数。
 * 预期观察：切换期间 weights 会同时变化；duration 越大，Slide、Spin、Pulse 之间的过渡越慢。
 */
export async function createCrossFadeLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const timer = new THREE.Timer();
  const loader = new GLTFLoader();
  const state = {
    fadeDuration: 0.7,
    warp: true
  };

  let root = null;
  let mixer = null;
  let activeAction = null;
  const actions = new Map();

  timer.connect(document);

  const gltf = await loader.loadAsync(ANIMATED_CUBE_URL);
  root = gltf.scene;
  scene.add(root);
  frameObject(camera, controls, root);
  mixer = new THREE.AnimationMixer(root);

  setSelectOptions(
    'target-action',
    gltf.animations.map((clip) => ({ value: clip.name, label: clip.name }))
  );

  // 让所有 action 都进入调度队列，后续只靠权重决定谁真正影响对象。
  gltf.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveWeight(0);
    action.play();
    actions.set(clip.name, action);
  });

  activeAction = actions.get('Slide') || actions.values().next().value;
  activeAction.setEffectiveWeight(1);
  readElement('target-action').value = activeAction.getClip().name;

  bindRange(
    'fade-duration',
    'fade-duration-value',
    (value) => `${formatNumber(value)} s`,
    (value) => {
      state.fadeDuration = value;
    }
  );

  bindCheckbox('warp-time', (checked) => {
    state.warp = checked;
  });

  bindButton('fade-button', () => {
    crossFadeToSelectedAction();
  });

  const stop = startAnimationLoop(renderer, scene, camera, canvas, controls, (timestamp) => {
    timer.update(timestamp);
    mixer.update(Math.min(timer.getDelta(), 0.1));
    writeFadeState();
  });

  function crossFadeToSelectedAction() {
    const nextAction = actions.get(readElement('target-action').value);
    if (!nextAction) {
      return;
    }

    if (nextAction === activeAction) {
      nextAction.reset().setEffectiveWeight(1).play();
      return;
    }

    const previousAction = activeAction;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    // crossFadeTo() 本质是给两个 action 安排一段权重过渡，可选 warp 会同步片段速度。
    previousAction.crossFadeTo(nextAction, state.fadeDuration, state.warp);
    activeAction = nextAction;
  }

  function writeFadeState() {
    writeText('active-state', activeAction ? activeAction.getClip().name : '-');
    writeText(
      'weights-state',
      [...actions.values()]
        .map((action) => `${action.getClip().name}: ${formatNumber(action.getEffectiveWeight())}`)
        .join('\n')
    );
    writeText('mixer-time-state', formatSeconds(mixer.time));
    writeText(
      'scheduled-state',
      [...actions.values()]
        .map((action) => `${action.getClip().name}: ${action.isScheduled()}`)
        .join('\n')
    );
  }

  return {
    dispose() {
      stop();
      timer.disconnect();
      timer.dispose();

      if (mixer && root) {
        mixer.stopAllAction();
        mixer.uncacheRoot(root);
      }

      if (root) {
        scene.remove(root);
        disposeObjectTree(root);
      }

      renderer.dispose();
    }
  };
}
