import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import chunkSource from './chunk-compaction-lab.ts?raw';
import restartSource from './restart-recovery-lab.ts?raw';
import {
  createChunkLab,
  type ChunkLabArgs,
  type ChunkLabInstance,
  type ChunkLabSnapshot,
} from './chunk-compaction-lab';
import {
  RESTART_SCENARIOS,
  createRestartLab,
  type RestartLabArgs,
  type RestartLabInstance,
  type RestartLabSnapshot,
} from './restart-recovery-lab';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。场景切换与文本输入都通过 args 重新驱动实例重算。
 */
const renderRestartLab = canvasStory({
  create: createRestartLab,
  apply(instance: RestartLabInstance, args: RestartLabArgs) {
    instance.update(args);
  },
  readout(snapshot: RestartLabSnapshot) {
    return snapshot.rows;
  },
});

const renderChunkLab = canvasStory({
  create: createChunkLab,
  apply(instance: ChunkLabInstance, args: ChunkLabArgs) {
    instance.update(args);
  },
  readout(snapshot: ChunkLabSnapshot) {
    return snapshot.rows;
  },
});

interface CourseArgs extends RestartLabArgs, ChunkLabArgs {}

const meta = {
  id: 'local-storage',
  title: 'Repo 同步层/本地存储',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const RestartLab: Story = {
  name: '重启恢复',
  args: {
    scenario: 'restart-same',
    item: '关机前写入的待办',
  } satisfies RestartLabArgs,
  argTypes: {
    scenario: {
      name: '重启场景',
      description:
        'write：写入并落盘；restart-same：卸载后用同一个数据库重建；restart-other：用另一个数据库重建，验证数据隔离。',
      control: { type: 'radio' },
      options: RESTART_SCENARIOS,
      labels: {
        write: '写入并落盘',
        'restart-same': '同库重建（模拟重启）',
        'restart-other': '换库重建（数据隔离）',
      },
    },
    item: {
      name: '写入的待办',
      description: '第 1 代 Repo 写入文档的文本，重建后用它核对是否原样读回。',
      control: { type: 'text' },
    },
  },
  render: renderRestartLab,
  parameters: storySource(restartSource),
};

export const ChunkLab: Story = {
  name: '分片与压实',
  args: {
    extraChanges: 6,
  } satisfies ChunkLabArgs,
  argTypes: {
    extraChanges: {
      name: '快照后追加变更',
      description:
        '首份快照之后追加的变更次数，每次变更都保存一次，观察增量堆积与压实坍缩。',
      control: { type: 'range', min: 0, max: 24, step: 1 },
    },
  },
  render: renderChunkLab,
  parameters: storySource(chunkSource),
};
