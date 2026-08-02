/*
演示 AnimationAction 的播放控制：clip 切换、play/pause、timeScale、loop 模式
与 clampWhenFinished。

输入是 args：
- clip：要播放的 clip 名（Idle / Wave / Jump）
- playing：是否播放（false 时把 action.paused 置 true，保留 action.time）
- timeScale：1 正常、0 冻结、-1 倒放、2 快放
- loop：LoopRepeat / LoopOnce / LoopPingPong
- repetitions：循环次数（LoopOnce 时无意义）
- clampWhenFinished：仅对 LoopOnce 有效；true 停在最后一帧，false 直接禁用 action

读数显示当前 clip 名、duration、action.time、timeScale、loop 模式、状态
（playing / paused / finished）、loop 循环计数和 mixer 当前激活的 action 数。
*/

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  createAnimationStage,
  makeAnimatedGlbUrl,
  placeOnGround,
  collectResources,
  disposeCollected
} from './animation-example-utils.js';

const LOOP_LABELS = {
  [THREE.LoopRepeat]: 'LoopRepeat',
  [THREE.LoopOnce]: 'LoopOnce',
  [THREE.LoopPingPong]: 'LoopPingPong'
};

const DEFAULT_ARGS = {
  clip: 'Idle',
  playing: true,
  timeScale: 1,
  loop: THREE.LoopRepeat,
  repetitions: Infinity,
  clampWhenFinished: true
};

export const playbackExample = {
  create(canvas, emitSnapshot) {
    const state = {
      loadStatus: '加载中…',
      clipName: '—',
      duration: '—',
      actionTime: '—',
      timeScale: '—',
      loop: '—',
      status: '—',
      loopCount: 0,
      activeActions: '—'
    };

    let mixer = null;
    let actionsByName = {};
    let current = null;
    let currentClipName = null;
    let pendingArgs = null;
    let loopCount = 0;
    let lastModel = null;

    function syncReadout() {
      if (!mixer || !current) {
        return;
      }
      const clip = current.getClip();
      state.clipName = clip.name;
      state.duration = `${clip.duration.toFixed(2)} s`;
      state.actionTime = `${current.time.toFixed(2)} s`;
      state.timeScale = current.timeScale.toFixed(2);
      state.loop = LOOP_LABELS[current.loop] || String(current.loop);
      state.activeActions = mixer.stats.actions.inUse;
    }

    const stage = createAnimationStage(canvas, () => state, (delta) => {
      if (mixer) {
        mixer.update(delta);
        syncReadout();
      }
    });
    stage.setSnapshotEmitter(emitSnapshot);
    stage.renderOnce();

    function applyArgs(args) {
      const merged = { ...DEFAULT_ARGS, ...args };
      if (!mixer) {
        pendingArgs = merged;
        return;
      }

      const wantLoop = merged.loop;
      const wantClamp =
        wantLoop === THREE.LoopOnce ? !!merged.clampWhenFinished : false;

      // 切 clip：stop 旧 action（内部会 reset，回到 time=0）再 play 新 action。
      if (merged.clip !== currentClipName) {
        if (current) {
          current.stop();
        }
        current = actionsByName[merged.clip];
        currentClipName = merged.clip;
        loopCount = 0;
        state.loopCount = 0;

        current.setLoop(wantLoop, merged.repetitions);
        current.clampWhenFinished = wantClamp;
        current.timeScale = merged.timeScale;
        current.play();
        current.paused = !merged.playing;
        state.status = merged.playing ? 'playing' : 'paused';
        return;
      }

      // 同一 clip：同步 loop、timeScale、clamp。
      current.setLoop(wantLoop, merged.repetitions);
      current.clampWhenFinished = wantClamp;
      current.timeScale = merged.timeScale;

      // LoopOnce 播完后状态为 finished；再次按下"播放"要 reset 重来。
      if (state.status === 'finished' && merged.playing) {
        current.reset();
        current.paused = false;
        loopCount = 0;
        state.loopCount = 0;
        state.status = 'playing';
        return;
      }

      const wantPaused = !merged.playing;
      if (current.paused !== wantPaused) {
        current.paused = wantPaused;
      }
      state.status = wantPaused ? 'paused' : 'playing';
    }

    async function load() {
      try {
        const url = await makeAnimatedGlbUrl();
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        URL.revokeObjectURL(url);

        placeOnGround(gltf.scene);
        stage.sceneRoot.add(gltf.scene);
        lastModel = gltf.scene;

        // 一个 mixer 管理整棵对象图；gltf.animations 里每个 clip 都用 clipAction 建一个 action。
        mixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
          actionsByName[clip.name] = mixer.clipAction(clip);
        }

        // mixer 在每次循环边界 / 单次播放结束时派发事件，用来更新读数里的状态。
        mixer.addEventListener('loop', (event) => {
          if (event.action === current) {
            loopCount += 1;
            state.loopCount = loopCount;
          }
        });
        mixer.addEventListener('finished', (event) => {
          if (event.action === current) {
            state.status = 'finished';
          }
        });

        state.loadStatus = '加载成功';

        const queued = pendingArgs || DEFAULT_ARGS;
        pendingArgs = null;
        applyArgs(queued);
        stage.renderOnce();
      } catch (err) {
        state.loadStatus = '加载失败';
        state.status = String(err && err.message ? err.message : err);
      }
    }

    load();

    return {
      stage,
      applyArgs,
      dispose() {
        if (lastModel) {
          stage.sceneRoot.remove(lastModel);
          disposeCollected(collectResources(lastModel));
          lastModel = null;
        }
        if (mixer) {
          mixer.stopAllAction();
        }
        stage.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.applyArgs(args);
    instance.stage.renderOnce();
  },

  readout(snapshot) {
    return [
      ['加载', snapshot.loadStatus],
      ['当前 clip', snapshot.clipName],
      ['duration', snapshot.duration],
      ['action.time', snapshot.actionTime],
      ['timeScale', snapshot.timeScale],
      ['loop', snapshot.loop],
      ['状态', snapshot.status],
      ['loop 次数', snapshot.loopCount],
      ['活跃 action', snapshot.activeActions]
    ];
  }
};
