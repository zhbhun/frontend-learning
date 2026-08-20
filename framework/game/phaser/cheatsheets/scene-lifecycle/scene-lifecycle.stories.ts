import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import lifecycleOrderSource from './lifecycle-order.ts?raw';
import runStatesSource from './run-states.ts?raw';
import sceneSwitchSource from './scene-switch.ts?raw';
import {
  createLifecycleOrder,
  type LifecycleOrderInstance,
  type LifecycleOrderSnapshot,
} from './lifecycle-order';
import {
  createRunStates,
  type RunStateAction,
  type RunStatesInstance,
  type RunStatesSnapshot,
} from './run-states';
import {
  createSceneSwitch,
  type SceneSwitchAction,
  type SceneSwitchInstance,
  type SceneSwitchSnapshot,
} from './scene-switch';

interface SceneLifecycleArgs {
  restarts?: number;
  action?: RunStateAction | SceneSwitchAction;
}

const renderLifecycleOrder = canvasStory({
  create: createLifecycleOrder,
  apply(instance: LifecycleOrderInstance, args: SceneLifecycleArgs) {
    instance.requestRestarts(args.restarts ?? 0);
  },
  readout(snapshot: LifecycleOrderSnapshot) {
    return [
      ['阶段顺序', snapshot.stageLog],
      ['init 次数', snapshot.initCount],
      ['preload 次数', snapshot.preloadCount],
      ['create 次数', snapshot.createCount],
      ['update 帧号', snapshot.updateFrame],
      ['visits(实例字段)', snapshot.visits],
      ['场景状态', snapshot.status],
    ];
  },
});

const renderRunStates = canvasStory({
  create: createRunStates,
  apply(instance: RunStatesInstance, args: SceneLifecycleArgs) {
    instance.perform((args.action as RunStateAction) ?? 'none');
  },
  readout(snapshot: RunStatesSnapshot) {
    return [
      ['最近操作', snapshot.action],
      ['update 帧号', snapshot.updateFrame],
      ['场景状态', snapshot.status],
      ['active(update)', snapshot.active],
      ['visible(渲染)', snapshot.visible],
    ];
  },
});

const renderSceneSwitch = canvasStory({
  create: createSceneSwitch,
  apply(instance: SceneSwitchInstance, args: SceneLifecycleArgs) {
    instance.perform((args.action as SceneSwitchAction) ?? 'none');
  },
  readout(snapshot: SceneSwitchSnapshot) {
    return [
      ['最近操作', snapshot.action],
      ['Menu 状态', snapshot.menuStatus],
      ['Menu 帧号', snapshot.menuFrames],
      ['Game 状态', snapshot.gameStatus],
      ['Game 帧号', snapshot.gameFrames],
    ];
  },
});

const meta: Meta<SceneLifecycleArgs> = {
  id: 'scene-lifecycle',
  title: '上手/场景生命周期',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderLifecycleOrder,
};

export default meta;

type Story = StoryObj<SceneLifecycleArgs>;

export const LifecycleOrder: Story = {
  args: { restarts: 0 },
  argTypes: {
    restarts: {
      name: '场景重启次数',
      description:
        '每加一,调用一次 this.scene.restart():init → preload → create 重新执行。',
      control: { type: 'range', min: 0, max: 9, step: 1 },
    },
  },
  parameters: storySource(lifecycleOrderSource),
  render: renderLifecycleOrder,
};

export const RunStates: Story = {
  args: { action: 'none' },
  argTypes: {
    action: {
      name: '状态操作',
      description: '对当前场景执行 pause/resume/sleep/wake。',
      control: { type: 'radio' },
      options: ['none', 'pause', 'resume', 'sleep', 'wake'],
      labels: {
        none: '保持运行',
        pause: '暂停 pause',
        resume: '恢复 resume',
        sleep: '休眠 sleep',
        wake: '唤醒 wake',
      },
    },
  },
  parameters: storySource(runStatesSource),
  render: renderRunStates,
};

export const SceneSwitch: Story = {
  args: { action: 'none' },
  argTypes: {
    action: {
      name: '场景操作',
      description: '由 Menu 场景对 Game 场景执行 this.scene 上的切换操作。',
      control: { type: 'radio' },
      options: ['none', 'start', 'launch', 'switch', 'stop', 'remove'],
      labels: {
        none: '无',
        start: 'start 启动 Game',
        launch: 'launch 并行启动',
        switch: 'switch 切到 Game',
        stop: 'stop 停止 Game',
        remove: 'remove 移除 Game',
      },
    },
  },
  parameters: storySource(sceneSwitchSource),
  render: renderSceneSwitch,
};
