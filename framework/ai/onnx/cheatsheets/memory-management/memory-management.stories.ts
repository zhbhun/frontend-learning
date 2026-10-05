import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import sessionLifecycleSource from './session-lifecycle.ts?raw';
import tensorLifecycleSource from './tensor-lifecycle.ts?raw';
import {
  createSessionLifecycle,
  LIFECYCLE_ACTION_LABELS,
  type LifecycleAction,
  type SessionLifecycleInstance,
  type SessionLifecycleSnapshot,
} from './session-lifecycle';
import {
  createTensorLifecycle,
  TENSOR_ACTION_LABELS,
  type TensorAction,
  type TensorLifecycleInstance,
  type TensorLifecycleSnapshot,
} from './tensor-lifecycle';

interface LifecycleArgs {
  action: LifecycleAction;
}

interface TensorArgs {
  action: TensorAction;
}

const renderLifecycle = canvasStory({
  create: createSessionLifecycle,
  apply(instance: SessionLifecycleInstance, args: LifecycleArgs) {
    instance.update({ action: args.action });
  },
  readout(snapshot: SessionLifecycleSnapshot) {
    return [
      ['当前引用', snapshot.refState],
      ['inputNames', snapshot.inputNames],
      ['最近操作', snapshot.lastAction],
      ['上次错误', snapshot.lastError],
    ];
  },
  captions: [
    '点击画布：重放当前选中的操作',
    '红字 = ort 抛出的真实错误原文',
  ],
});

const renderTensor = canvasStory({
  create: createTensorLifecycle,
  apply(instance: TensorLifecycleInstance, args: TensorArgs) {
    instance.update({ action: args.action });
  },
  readout(snapshot: TensorLifecycleSnapshot) {
    return [
      ['location', snapshot.location],
      ['.data 读取', snapshot.dataRead],
      ['外部持有的 TypedArray', snapshot.externalRef],
      ['getData(true)', snapshot.getDataResult],
    ];
  },
  captions: [
    '左：三要素 + location 徽标，dispose 后数据格变灰',
    '右：每次操作的真实读数与错误原文',
  ],
});

// 用类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级元数据。
const meta: Meta = {
  id: 'memory-management',
  title: '工程与性能/性能优化/内存管理',
  tags: ['!dev'],
};

export default meta;

type LifecycleStory = StoryObj<LifecycleArgs>;
type TensorStory = StoryObj<TensorArgs>;

export const SessionLifecycle: LifecycleStory = {
  name: '会话生命周期',
  args: {
    action: 'run',
  },
  argTypes: {
    action: {
      name: '生命周期操作',
      description: '切换即执行对应动作；点击画布重放当前操作（如连续两次 release）。',
      control: {
        type: 'radio',
        options: ['create', 'run', 'release'],
        labels: LIFECYCLE_ACTION_LABELS,
      },
    },
  },
  render: renderLifecycle,
  parameters: storySource(sessionLifecycleSource),
};

export const TensorLifecycle: TensorStory = {
  name: '张量生命周期',
  args: {
    action: 'construct',
  },
  argTypes: {
    action: {
      name: '张量操作',
      description: '构造 CPU 张量后依次尝试 dispose 与 getData(true)，观察 location 与 .data 的变化。',
      control: {
        type: 'radio',
        options: ['construct', 'dispose', 'getData'],
        labels: TENSOR_ACTION_LABELS,
      },
    },
  },
  render: renderTensor,
  parameters: storySource(tensorLifecycleSource),
};
