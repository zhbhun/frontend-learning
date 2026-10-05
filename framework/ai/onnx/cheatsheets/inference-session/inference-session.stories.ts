import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import runFetchesSource from './run-fetches.ts?raw';
import runConcurrencySource from './run-concurrency.ts?raw';
import {
  createRunFetches,
  FETCHES_MODE_LABELS,
  type FetchesMode,
  type RunFetchesInstance,
  type RunFetchesSnapshot,
} from './run-fetches';
import {
  createRunConcurrency,
  BURST_MODE_LABELS,
  type BurstMode,
  type RunConcurrencyInstance,
  type RunConcurrencySnapshot,
} from './run-concurrency';

interface FetchesArgs {
  fetchesMode: FetchesMode;
}

interface BurstArgs {
  mode: BurstMode;
}

const renderFetches = canvasStory({
  create: createRunFetches,
  apply(instance: RunFetchesInstance, args: FetchesArgs) {
    instance.update({ mode: args.fetchesMode });
  },
  readout(snapshot: RunFetchesSnapshot) {
    return [
      ['状态', snapshot.message],
      ['feeds 键', snapshot.feedKey],
      ['返回的键', snapshot.keys],
      ['输出 dims', snapshot.dims],
      ['预分配缓冲被复用', snapshot.reused],
    ];
  },
  captions: [
    '左：四种 fetches 形态，蓝色为当前',
    '右：当前形态下 run 的返回与缓冲复用',
  ],
});

const renderConcurrency = canvasStory({
  create: createRunConcurrency,
  apply(instance: RunConcurrencyInstance, args: BurstArgs) {
    instance.update({ mode: args.mode });
  },
  readout(snapshot: RunConcurrencySnapshot) {
    return [
      ['状态', snapshot.message],
      ['触发方式', snapshot.mode],
      ['成功', snapshot.okCount],
      ['失败', snapshot.failCount],
      ['首个错误', snapshot.firstError],
    ];
  },
  captions: [
    '点击画布：触发一轮 5 次推理',
    '红条 = 被并发保护拒绝的 run',
  ],
});

// 用类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级元数据。
const meta: Meta = {
  id: 'inference-session',
  title: '核心概念/会话与配置/InferenceSession',
  tags: ['!dev'],
};

export default meta;

type FetchesStory = StoryObj<FetchesArgs>;
type BurstStory = StoryObj<BurstArgs>;

export const Fetches: FetchesStory = {
  name: 'fetches 三形态',
  args: {
    fetchesMode: 'omit',
  },
  argTypes: {
    fetchesMode: {
      name: 'fetches 形态',
      description: '切换 run 的第二个参数形态，观察返回的键与预分配缓冲的复用。',
      control: {
        type: 'radio',
        options: ['omit', 'array', 'prealloc', 'invalid'],
        labels: {
          omit: FETCHES_MODE_LABELS.omit,
          array: FETCHES_MODE_LABELS.array,
          prealloc: FETCHES_MODE_LABELS.prealloc,
          invalid: FETCHES_MODE_LABELS.invalid,
        },
      },
    },
  },
  render: renderFetches,
  parameters: storySource(runFetchesSource),
};

export const Concurrency: BurstStory = {
  name: '并发与队列',
  args: {
    mode: 'queue',
  },
  argTypes: {
    mode: {
      name: '触发方式',
      description: '切换后点击画布触发一轮 5 次推理，对比串行与并发的成败与耗时。',
      control: {
        type: 'radio',
        options: ['queue', 'burst'],
        labels: {
          queue: BURST_MODE_LABELS.queue,
          burst: BURST_MODE_LABELS.burst,
        },
      },
    },
  },
  render: renderConcurrency,
  parameters: storySource(runConcurrencySource),
};
