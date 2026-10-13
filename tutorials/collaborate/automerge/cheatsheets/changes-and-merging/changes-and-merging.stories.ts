import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import changeSource from './example-change.ts?raw';
import historySource from './example-history.ts?raw';
import mergeSource from './example-merge.ts?raw';
import snapshotSource from './example-snapshot.ts?raw';
import {
  createChangeLab,
  type ChangeLabArgs,
  type ChangeLabInstance,
  type ChangeLabSnapshot,
} from './example-change';
import {
  createHistoryLab,
  type HistoryLabArgs,
  type HistoryLabInstance,
  type HistoryLabSnapshot,
} from './example-history';
import {
  createMergeLab,
  type MergeLabArgs,
  type MergeLabInstance,
  type MergeLabSnapshot,
} from './example-merge';
import {
  createSnapshotLab,
  type SnapshotLabArgs,
  type SnapshotLabInstance,
  type SnapshotLabSnapshot,
} from './example-snapshot';

const renderChangeLab = canvasStory({
  create: createChangeLab,
  apply(instance: ChangeLabInstance, args: ChangeLabArgs) {
    instance.update(args);
  },
  readout(snapshot: ChangeLabSnapshot) {
    return snapshot.rows;
  },
});

const renderSnapshotLab = canvasStory({
  create: createSnapshotLab,
  apply(instance: SnapshotLabInstance, args: SnapshotLabArgs) {
    instance.update(args);
  },
  readout(snapshot: SnapshotLabSnapshot) {
    return snapshot.rows;
  },
});

const renderMergeLab = canvasStory({
  create: createMergeLab,
  apply(instance: MergeLabInstance, args: MergeLabArgs) {
    instance.update(args);
  },
  readout(snapshot: MergeLabSnapshot) {
    return snapshot.rows;
  },
});

const renderHistoryLab = canvasStory({
  create: createHistoryLab,
  apply(instance: HistoryLabInstance, args: HistoryLabArgs) {
    instance.update(args);
  },
  readout(snapshot: HistoryLabSnapshot) {
    return snapshot.rows;
  },
});

interface CourseArgs extends ChangeLabArgs, SnapshotLabArgs, MergeLabArgs, HistoryLabArgs {}

const meta = {
  id: 'changes-and-merging',
  title: '核心基础/变更、快照与合并',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const ChangeLab: Story = {
  name: '变更语义',
  args: {
    scenario: 'basic',
  } satisfies ChangeLabArgs,
  argTypes: {
    scenario: {
      name: '场景',
      description: '选择要观察的 change 语义场景。',
      control: {
        type: 'radio',
        options: ['basic', 'stale', 'noop', 'rollback'],
        labels: {
          basic: '基础变更',
          stale: '过期快照',
          noop: '空变更',
          rollback: '回滚',
        },
      },
    },
  },
  render: renderChangeLab,
  parameters: storySource(changeSource),
};

export const SnapshotLab: Story = {
  name: '快照存取',
  args: {
    item: '写周报',
  } satisfies SnapshotLabArgs,
  argTypes: {
    item: {
      name: '新增待办',
      description: '追加进文档的待办文本，重新触发一次 save / load 往返。',
      control: {
        type: 'text',
      },
    },
  },
  render: renderSnapshotLab,
  parameters: storySource(snapshotSource),
};

export const MergeLab: Story = {
  name: '并发合并',
  args: {
    alice: 3,
    bob: 7,
  } satisfies MergeLabArgs,
  argTypes: {
    alice: {
      name: 'Alice 写入值',
      description: '副本 Alice 并发写入 n 的值。',
      control: {
        type: 'range',
        min: 0,
        max: 9,
        step: 1,
      },
    },
    bob: {
      name: 'Bob 写入值',
      description: '副本 Bob 并发写入 n 的值。',
      control: {
        type: 'range',
        min: 0,
        max: 9,
        step: 1,
      },
    },
  },
  render: renderMergeLab,
  parameters: storySource(mergeSource),
};

export const HistoryLab: Story = {
  name: '历史检查',
  args: {
    steps: 3,
  } satisfies HistoryLabArgs,
  argTypes: {
    steps: {
      name: '变更次数',
      description: '连续执行的带 message 变更条数。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
      },
    },
  },
  render: renderHistoryLab,
  parameters: storySource(historySource),
};
