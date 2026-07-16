import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIMATED_CUBE_URL } from '../model-assets.js';
import {
  createCamera,
  createControls,
  createRenderer,
  createScene,
  disposeObjectTree,
  formatSeconds,
  frameObject,
  startAnimationLoop
} from '../shared-stage.js';
import { bindButton, bindSelect, setButtonBusy, setSelectOptions, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件演示 glTF 内置 AnimationClip 的最小播放链路。
 * 阅读主线：先看 loader.loadAsync() 拿到 gltf.animations，再看 AnimationMixer(root) 和 mixer.clipAction(clip)。
 * 控件对应：动画片段 -> AnimationClip.findByName()；重新播放 -> action.reset().play()。
 * 预期观察：同一个 AnimatedCube 节点会按当前 clip 的 track 改变 translation、rotation 或 scale。
 */
export async function createClipPlaybackLesson(canvas) {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const timer = new THREE.Timer();
  const loader = new GLTFLoader();

  let root = null;
  let mixer = null;
  let activeAction = null;
  let activeClip = null;

  timer.connect(document);
  setButtonBusy('restart-action', true);
  writeText('load-state', `加载中：${ANIMATED_CUBE_URL}`);

  const gltf = await loader.loadAsync(ANIMATED_CUBE_URL);
  root = gltf.scene;
  root.name = root.name || 'AnimatedRoot';
  scene.add(root);
  frameObject(camera, controls, root);

  // Mixer 绑定动画根对象；后续所有 clipAction() 默认都作用在这棵 glTF 场景树上。
  mixer = new THREE.AnimationMixer(root);

  setSelectOptions(
    'clip-name',
    gltf.animations.map((clip) => ({ value: clip.name, label: clip.name }))
  );

  bindSelect(
    'clip-name',
    (clipName) => {
      playClip(clipName);
    },
    { immediate: false }
  );

  bindButton('restart-action', () => {
    restartActiveAction();
  });

  playClip(gltf.animations[0].name);
  setButtonBusy('restart-action', false);
  writeText('load-state', `加载完成：${gltf.animations.length} 个 AnimationClip`);

  const stop = startAnimationLoop(renderer, scene, camera, canvas, controls, (timestamp) => {
    timer.update(timestamp);

    // AnimationMixer.update() 接收秒；从 Timer 取出的 delta 可以直接传入。
    const delta = Math.min(timer.getDelta(), 0.1);
    mixer.update(delta);

    writeText('mixer-time-state', `mixer.time=${formatSeconds(mixer.time)}; delta=${formatSeconds(delta)}`);

    if (activeAction && activeClip) {
      writeText(
        'action-state',
        `time=${formatSeconds(activeAction.time)}; running=${activeAction.isRunning()}; scheduled=${activeAction.isScheduled()}`
      );
    }
  });

  function playClip(clipName) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
    if (!clip) {
      return;
    }

    if (activeAction) {
      activeAction.stop();
    }

    activeClip = clip;
    activeAction = mixer.clipAction(clip);
    restartActiveAction();
    writeClipState(clip);
  }

  function restartActiveAction() {
    if (!activeAction) {
      return;
    }

    // reset() 把本 action 的局部时间归零；play() 只是把 action 调度进 mixer。
    activeAction.reset().play();
  }

  function writeClipState(clip) {
    writeText('clip-state', `${clip.name}; duration=${formatSeconds(clip.duration)}; tracks=${clip.tracks.length}`);
    writeText('tracks-state', clip.tracks.map((track) => track.name).join('\n'));
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
