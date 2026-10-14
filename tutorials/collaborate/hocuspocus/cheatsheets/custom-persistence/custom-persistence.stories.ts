import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createRestoreModel,
  createWritePaths,
  RESTORE_STRATEGY_LABELS,
  type PersistenceModelInstance,
  type RestoreOptions,
  type RestoreSnapshot,
  type RestoreStrategy,
  type WritePathsOptions,
  type WritePathsSnapshot,
} from './persistence-model';
import persistenceModelSource from './persistence-model.ts?raw';

interface WritePathsArgs {
  text: string;
}

interface RestoreArgs {
  text: string;
  strategy: RestoreStrategy;
}

function shorten(text: string): string {
  const chars = Array.from(text);
  return chars.length > 14 ? `${chars.slice(0, 14).join('')}…` : text;
}

function writePathsReadout(snapshot: WritePathsSnapshot): Array<[string, string]> {
  return [
    ['编辑文本', shorten(snapshot.text)],
    ['增量日志', `${snapshot.logEntries} 条 / ${snapshot.logBytes} 字节`],
    ['快照存储', `${snapshot.snapshotWrites} 次覆盖 / ${snapshot.snapshotBytes} 字节`],
    ['增量恢复', snapshot.incrementalRestored === snapshot.text ? '一致' : '不一致'],
    ['快照恢复', snapshot.snapshotRestored === snapshot.text ? '一致' : '不一致'],
  ];
}

function restoreReadout(snapshot: RestoreSnapshot): Array<[string, string]> {
  return [
    ['编辑文本', shorten(snapshot.text)],
    ['恢复方式', RESTORE_STRATEGY_LABELS[snapshot.strategy]],
    ['应用 update', `${snapshot.appliedCount} 条 / ${snapshot.appliedBytes} 字节`],
    ['日志规模（对照）', `${snapshot.logEntries} 条 / ${snapshot.logBytes} 字节`],
    ['恢复内容', snapshot.matches ? '与原文一致' : '与原文不一致'],
  ];
}

const renderWritePaths = canvasStory({
  create: createWritePaths,
  apply(instance: PersistenceModelInstance<WritePathsOptions>, args: WritePathsArgs) {
    instance.update({ text: args.text });
  },
  readout: writePathsReadout,
});

const renderRestore = canvasStory({
  create: createRestoreModel,
  apply(instance: PersistenceModelInstance<RestoreOptions>, args: RestoreArgs) {
    instance.update({ text: args.text, strategy: args.strategy });
  },
  readout: restoreReadout,
});

const meta = {
  id: 'custom-persistence',
  title: '服务端核心/自定义持久化',
  tags: ['!dev'],
  args: {
    text: '增量与快照都收敛',
    strategy: 'in-order' as RestoreStrategy,
  },
  argTypes: {
    text: {
      name: '编辑文本',
      description: '每次修改触发一次编辑事务，进入两条落库路径。',
      control: { type: 'text' },
    },
    strategy: {
      name: '恢复方式',
      description: '把增量日志恢复成新 Y.Doc 时采用的读法。',
      control: { type: 'select' },
      options: {
        '原序逐条': 'in-order',
        '乱序逐条': 'shuffled',
        '重复注入': 'duplicated',
        'mergeUpdates 合并': 'merged',
        '快照单条': 'snapshot',
      },
    },
  },
  parameters: storySource(persistenceModelSource),
} satisfies Meta<WritePathsArgs & RestoreArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WritePaths: Story = {
  name: '写路径对比',
  render: renderWritePaths,
  args: {
    text: '增量与快照都收敛',
  },
  argTypes: {
    strategy: { table: { disable: true } },
  },
};

export const RestoreStrategies: Story = {
  name: '恢复策略与乱序幂等',
  render: renderRestore,
  args: {
    text: '增量与快照都收敛',
    strategy: 'in-order',
  },
};
