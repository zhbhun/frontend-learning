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
  bindSelect,
  readElement,
  setSelectOptions,
  writeText
} from '../shared-ui.js';

const LOOP_MODES = {
  LoopRepeat: THREE.LoopRepeat,
  LoopOnce: THREE.LoopOnce,
  LoopPingPong: THREE.LoopPingPong
};

/*
 * 示例介绍：
 * 这个文件演示 AnimationAction 的播放状态、暂停、速度、循环和结束行为。
 * 阅读主线：先看 playSelectedClip() 如何创建 action，再看 configureAction() 写回 paused、timeScale、setLoop() 和 clampWhenFinished。
 * 控件对应：速度倍率 -> action.setEffectiveTimeScale()；循环模式/重复次数 -> action.setLoop()；暂停 -> action.paused。
 * 预期观察：LoopOnce 会触发 finished；clampWhenFinished 只在自然播完时把姿态停在最后一帧。
 */
export async function createActionControlsLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const timer = new THREE.Timer();
  const loader = new GLTFLoader();
  const state = {
    timeScale: 1,
    loopMode: 'LoopRepeat',
    repetitions: 2,
    paused: false,
    clampWhenFinished: false
  };

  let root = null;
  let mixer = null;
  let activeAction = null;
  let activeClip = null;

  timer.connect(document);
  writeText('event-state', '等待 action 事件');

  const gltf = await loader.loadAsync(ANIMATED_CUBE_URL);
  root = gltf.scene;
  scene.add(root);
  frameObject(camera, controls, root);
  mixer = new THREE.AnimationMixer(root);
  mixer.addEventListener('finished', (event) => {
    writeText('event-state', `finished: ${event.action.getClip().name}`);
  });

  const select = setSelectOptions(
    'clip-name',
    gltf.animations.map((clip) => ({ value: clip.name, label: clip.name }))
  );
  select.value = gltf.animations.find((clip) => clip.name === 'Spin')?.name || gltf.animations[0].name;

  bindSelect(
    'clip-name',
    (clipName) => {
      playSelectedClip(clipName);
    },
    { immediate: false }
  );

  bindRange(
    'time-scale',
    'time-scale-value',
    (value) => `${formatNumber(value)}x`,
    (value) => {
      state.timeScale = value;
      configureAction();
    }
  );

  bindSelect('loop-mode', (value) => {
    state.loopMode = value;
    configureAction();
  });

  bindRange(
    'repetitions',
    'repetitions-value',
    (value) => `${value} 次`,
    (value) => {
      state.repetitions = value;
      configureAction();
    }
  );

  bindCheckbox('paused', (checked) => {
    state.paused = checked;
    configureAction();
  });

  bindCheckbox('clamp-finished', (checked) => {
    state.clampWhenFinished = checked;
    configureAction();
  });

  bindButton('restart-action', () => {
    restartActiveAction();
  });

  playSelectedClip(readElement('clip-name').value);

  const stop = startAnimationLoop(renderer, scene, camera, canvas, controls, (timestamp) => {
    timer.update(timestamp);
    mixer.update(Math.min(timer.getDelta(), 0.1));
    writeActionState();
  });

  function playSelectedClip(clipName) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
    if (!clip) {
      return;
    }

    mixer.stopAllAction();
    activeClip = clip;
    activeAction = mixer.clipAction(clip);
    configureAction();
    restartActiveAction();
    writeText('event-state', '等待 finished');
  }

  function configureAction() {
    if (!activeAction) {
      return;
    }

    activeAction.enabled = true;
    activeAction.paused = state.paused;
    activeAction.clampWhenFinished = state.clampWhenFinished;
    activeAction.setEffectiveWeight(1);
    activeAction.setEffectiveTimeScale(state.timeScale);
    activeAction.setLoop(LOOP_MODES[state.loopMode], state.repetitions);
  }

  function restartActiveAction() {
    if (!activeAction) {
      return;
    }

    activeAction.reset();

    // 负 timeScale 会倒放；从片段末尾开始更容易观察反向播放。
    if (state.timeScale < 0) {
      activeAction.time = activeClip.duration;
    }

    configureAction();
    activeAction.play();
  }

  function writeActionState() {
    if (!activeAction || !activeClip) {
      return;
    }

    writeText(
      'action-state',
      `${activeClip.name}; running=${activeAction.isRunning()}; scheduled=${activeAction.isScheduled()}`
    );
    writeText('time-state', `action.time=${formatSeconds(activeAction.time)}; mixer.time=${formatSeconds(mixer.time)}`);
    writeText(
      'effective-state',
      `weight=${formatNumber(activeAction.getEffectiveWeight())}; timeScale=${formatNumber(activeAction.getEffectiveTimeScale())}`
    );
    writeText(
      'loop-state',
      `${state.loopMode}; repetitions=${state.repetitions}; clamp=${activeAction.clampWhenFinished}`
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
