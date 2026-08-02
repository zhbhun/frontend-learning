/*
演示多动画按权重混合：Idle 与 Wave 两个 action 同时 play，
用 blend 滑块（0..1）在两个 action 的 effectiveWeight 之间线性分配。

Idle 影响身体与头部的 quaternion，Wave 影响右臂的 quaternion，
两者作用在互不重叠的属性上，所以混合时各自按权重缩放，不会互相覆盖。

读数显示两个 action 的 effectiveWeight、blend 值和 mixer 当前激活的 action 数。
*/

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  createAnimationStage,
  makeAnimatedGlbUrl,
  placeOnGround,
  collectResources,
  disposeCollected
} from './animation-example-utils.js';

const DEFAULT_ARGS = { blend: 0 };

export const mixingExample = {
  create(canvas, emitSnapshot) {
    const state = {
      loadStatus: '加载中…',
      blend: '—',
      idleWeight: '—',
      waveWeight: '—',
      activeActions: '—',
      note: '—'
    };

    let mixer = null;
    let idle = null;
    let wave = null;
    let pendingArgs = null;
    let lastModel = null;

    function syncReadout() {
      if (!mixer || !idle || !wave) {
        return;
      }
      state.idleWeight = idle.getEffectiveWeight().toFixed(2);
      state.waveWeight = wave.getEffectiveWeight().toFixed(2);
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

      // 直接写 weight：两个 action 始终处于 play 状态，mixer 按权重把各自的轨道
      // 插值结果累加到属性绑定缓冲区。blend=0 时只有 Idle，blend=1 时只有 Wave。
      const w = Math.max(0, Math.min(1, merged.blend));
      idle.setEffectiveWeight(1 - w);
      wave.setEffectiveWeight(w);

      state.blend = w.toFixed(2);
      if (w === 0) {
        state.note = '只有 Idle（Wave weight=0，不参与）';
      } else if (w === 1) {
        state.note = '只有 Wave（Idle weight=0）';
      } else {
        state.note = '同时播放，两个 action 按权重混合';
      }
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

        mixer = new THREE.AnimationMixer(gltf.scene);
        const byName = Object.fromEntries(
          gltf.animations.map((clip) => [clip.name, clip])
        );
        idle = mixer.clipAction(byName['Idle']);
        wave = mixer.clipAction(byName['Wave']);

        // 两个 action 同时激活；初始权重由 applyArgs 设置。
        idle.play();
        wave.play();

        state.loadStatus = '加载成功';
        const queued = pendingArgs || DEFAULT_ARGS;
        pendingArgs = null;
        applyArgs(queued);
        stage.renderOnce();
      } catch (err) {
        state.loadStatus = '加载失败';
        state.note = String(err && err.message ? err.message : err);
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
      ['blend', snapshot.blend],
      ['Idle weight', snapshot.idleWeight],
      ['Wave weight', snapshot.waveWeight],
      ['活跃 action', snapshot.activeActions],
      ['说明', snapshot.note]
    ];
  }
};
