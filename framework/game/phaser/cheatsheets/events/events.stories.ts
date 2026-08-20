import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import customEventsSource from './custom-events.ts?raw';
import sceneEventsSource from './scene-events.ts?raw';
import sceneDataPassingSource from './scene-data-passing.ts?raw';
import {
  createCustomEvents,
  type CustomEventsInstance,
  type CustomEventsSnapshot,
  type ListenerOp,
} from './custom-events';
import {
  createSceneEvents,
  type SceneEventsAction,
  type SceneEventsInstance,
  type SceneEventsSnapshot,
} from './scene-events';
import {
  createSceneDataExchange,
  type DataAction,
  type SceneDataExchangeInstance,
  type SceneDataSnapshot,
} from './scene-data-passing';

interface EventsArgs {
  emissions?: number;
  listenerOp?: ListenerOp;
  sceneAction?: SceneEventsAction;
  dataAction?: DataAction;
  score?: number;
}

const renderCustomEvents = canvasStory({
  create: createCustomEvents,
  apply(instance: CustomEventsInstance, args: EventsArgs) {
    instance.requestEmissions(args.emissions ?? 0);
    instance.performListenerOp(args.listenerOp ?? 'none');
  },
  readout(snapshot: CustomEventsSnapshot) {
    return [
      ['emit 次数', snapshot.emissions],
      ['on 收到', snapshot.onReceived],
      ['once 收到', snapshot.onceReceived],
      ['listenerCount', snapshot.listenerCount],
      ['emit 返回值', snapshot.lastEmitResult],
      ['事件日志', snapshot.log],
    ];
  },
});

const renderSceneEvents = canvasStory({
  create: createSceneEvents,
  apply(instance: SceneEventsInstance, args: EventsArgs) {
    instance.perform((args.sceneAction as SceneEventsAction) ?? 'none');
  },
  readout(snapshot: SceneEventsSnapshot) {
    return [
      ['事件日志', snapshot.log],
      ['update 事件帧号', snapshot.updateEventFrame],
      ['场景状态', snapshot.status],
    ];
  },
});

const renderSceneData = canvasStory({
  create: createSceneDataExchange,
  apply(instance: SceneDataExchangeInstance, args: EventsArgs) {
    instance.setScore(args.score ?? 0);
    instance.perform((args.dataAction as DataAction) ?? 'none');
  },
  readout(snapshot: SceneDataSnapshot) {
    return [
      ['Menu 状态', snapshot.menuStatus],
      ['Hud 状态', snapshot.hudStatus],
      ['Hud init data', snapshot.hudInitData],
      ['registry score', snapshot.registryScore],
      ['Hud data score', snapshot.hudDataScore],
      ['事件日志', snapshot.log],
    ];
  },
});

const meta: Meta<EventsArgs> = {
  id: 'events',
  title: '上手/事件与场景通信',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderCustomEvents,
};

export default meta;

type Story = StoryObj<EventsArgs>;

export const CustomEvents: Story = {
  args: { emissions: 0, listenerOp: 'none' },
  argTypes: {
    emissions: {
      name: '发射次数',
      description:
        "每加一,调用一次 this.events.emit('collect-coin', { n }):on/once 监听同步收到。",
      control: { type: 'range', min: 0, max: 9, step: 1 },
    },
    listenerOp: {
      name: '监听器操作',
      description:
        'off 精确移除 on 监听;removeAllListeners 清空该事件的全部监听(含未触发的 once)。',
      control: { type: 'radio' },
      options: ['none', 'remove-on', 'remove-all'],
      labels: {
        none: '保持注册',
        'remove-on': 'off 移除 on',
        'remove-all': 'removeAllListeners',
      },
    },
  },
  parameters: storySource(customEventsSource),
  render: renderCustomEvents,
};

export const SceneEvents: Story = {
  args: { sceneAction: 'none' },
  argTypes: {
    sceneAction: {
      name: '场景操作',
      description: '对场景执行 pause/resume/stop/start,观察 scene.events 的事件日志。',
      control: { type: 'radio' },
      options: ['none', 'pause', 'resume', 'stop', 'start'],
      labels: {
        none: '保持运行',
        pause: '暂停 pause',
        resume: '恢复 resume',
        stop: '停止 stop',
        start: '重新启动 start',
      },
    },
  },
  parameters: storySource(sceneEventsSource),
  render: renderSceneEvents,
};

export const SceneData: Story = {
  args: { score: 0, dataAction: 'none' },
  argTypes: {
    score: {
      name: '分数(写入 registry)',
      description: "改变时立即 game.registry.set('score', 值),与场景是否运行无关。",
      control: { type: 'range', min: 0, max: 100, step: 10 },
    },
    dataAction: {
      name: '场景操作',
      description:
        '由 Menu 场景执行:start 让位切换 / launch 并行启动 / stop 停止 Hud;启动时把当前分数作为 data 传入。',
      control: { type: 'radio' },
      options: ['none', 'start', 'launch', 'stop'],
      labels: {
        none: '无',
        start: 'start 切换并传 data',
        launch: 'launch 并行并传 data',
        stop: 'stop 停止 Hud',
      },
    },
  },
  parameters: storySource(sceneDataPassingSource),
  render: renderSceneData,
};
