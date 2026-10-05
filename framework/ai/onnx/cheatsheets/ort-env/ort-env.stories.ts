import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import envSnapshotSource from './env-snapshot.ts?raw';
import initTimelineSource from './init-timeline.ts?raw';
import {
  createEnvSnapshot,
  type EnvSnapshotData,
  type EnvSnapshotInstance,
} from './env-snapshot';
import {
  createInitTimeline,
  THREADS_LABELS,
  type InitTimelineData,
  type InitTimelineInstance,
  type ThreadsChoice,
} from './init-timeline';

interface ThreadsArgs {
  threads: ThreadsChoice;
}

const renderSnapshot = canvasStory({
  create: createEnvSnapshot,
  apply(instance: EnvSnapshotInstance) {
    instance.update();
  },
  readout(snapshot: EnvSnapshotData) {
    return snapshot.rows;
  },
});

const renderTimeline = canvasStory({
  create: createInitTimeline,
  apply(instance: InitTimelineInstance, args: ThreadsArgs) {
    instance.update({ threads: args.threads });
  },
  readout(snapshot: InitTimelineData) {
    return snapshot.rows;
  },
  captions: ['左：创建前——我们设置的输入', '右：创建后——ort 实际生效并回写的值'],
});

// 用类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级元数据。
const meta: Meta = {
  id: 'ort-env',
  title: '核心概念/会话与配置/ort.env 全局配置',
  tags: ['!dev'],
};

export default meta;

type SnapshotStory = StoryObj<Record<string, never>>;
type TimelineStory = StoryObj<ThreadsArgs>;

export const FlagSnapshot: SnapshotStory = {
  name: '标志快照',
  render: renderSnapshot,
  parameters: storySource(envSnapshotSource),
};

export const InitTimeline: TimelineStory = {
  name: '初始化前后对照',
  args: {
    threads: 'auto',
  },
  argTypes: {
    threads: {
      name: 'numThreads 设置值',
      description:
        '在首次会话创建前写入 env.wasm.numThreads；非跨域隔离页面选 2 会触发 ort 的回落警告。wasm 只初始化一次，切换选项不会重演实验。',
      control: {
        type: 'radio',
        labels: {
          auto: THREADS_LABELS.auto,
          '1': THREADS_LABELS['1'],
          '2': THREADS_LABELS['2'],
        },
      },
      options: ['auto', '1', '2'],
    },
  },
  render: renderTimeline,
  parameters: storySource(initTimelineSource),
};
