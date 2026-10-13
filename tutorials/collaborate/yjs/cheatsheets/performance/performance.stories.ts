import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import transactionCostSource from './transaction-cost.ts?raw';
import logCompactionSource from './log-compaction.ts?raw';
import editLocusSource from './edit-locus.ts?raw';
import {
  createTransactionCost,
  type TransactionCostInstance,
  type TransactionCostOptions,
  type TransactionCostSnapshot,
} from './transaction-cost';
import {
  createLogCompaction,
  type LogCompactionInstance,
  type LogCompactionOptions,
  type LogCompactionSnapshot,
} from './log-compaction';
import {
  createEditLocus,
  type EditLocusInstance,
  type EditLocusOptions,
  type EditLocusSnapshot,
} from './edit-locus';

const renderTransactionCost = canvasStory({
  create: createTransactionCost,
  apply(instance: TransactionCostInstance, args: TransactionCostOptions) {
    instance.update(args);
  },
  readout(snapshot: TransactionCostSnapshot) {
    const formatBytes = (bytes: number) =>
      bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
    return [
      ['单事务耗时', `${snapshot.batched.ms.toFixed(1)} ms`],
      ['逐条事务耗时', `${snapshot.perEdit.ms.toFixed(1)} ms`],
      [
        'update 事件',
        `${snapshot.batched.events} 条 vs ${snapshot.perEdit.events} 条`,
      ],
      [
        '增量 update 合计',
        `${formatBytes(snapshot.batched.incremental)} vs ${formatBytes(snapshot.perEdit.incremental)}`,
      ],
      ['逐条合并后(mergeUpdates)', formatBytes(snapshot.perEdit.merged)],
    ];
  },
});

const renderLogCompaction = canvasStory({
  create: createLogCompaction,
  apply(instance: LogCompactionInstance, args: LogCompactionOptions) {
    instance.update(args);
  },
  readout(snapshot: LogCompactionSnapshot) {
    const formatBytes = (bytes: number) =>
      bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
    return [
      ['增量 update 合计', formatBytes(snapshot.incrementalSum)],
      ['mergeUpdates 后', formatBytes(snapshot.merged)],
      ['快照(GC 后)', formatBytes(snapshot.snapshot)],
      ['快照 V2', formatBytes(snapshot.snapshotV2)],
      [
        '加载·逐条 / 快照',
        `${snapshot.loadLogMs.toFixed(1)} ms / ${snapshot.loadSnapshotMs.toFixed(1)} ms`,
      ],
    ];
  },
});

// canvasStory 的 readout 只拿 snapshot,当前落点在这里闭包记录。
let currentLocus: EditLocusOptions['locus'] = 'mid';

const renderEditLocus = canvasStory({
  create: createEditLocus,
  apply(instance: EditLocusInstance, args: EditLocusOptions) {
    currentLocus = args.locus;
    instance.update(args);
  },
  readout(snapshot: EditLocusSnapshot) {
    const formatBytes = (bytes: number) =>
      bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
    const data =
      currentLocus === 'append'
        ? snapshot.append
        : currentLocus === 'random'
          ? snapshot.random
          : snapshot.mid;
    return [
      [
        '编辑落点',
        currentLocus === 'append'
          ? '尾部追加'
          : currentLocus === 'random'
            ? '随机位置'
            : '文档中段',
      ],
      ['快照体积', formatBytes(data.bytes)],
      ['物理条目', `${data.structs} 条`],
      ['快照加载', `${data.loadMs.toFixed(2)} ms`],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '进阶与原理/性能与基准',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const TransactionCost: StoryObj<TransactionCostOptions> = {
  name: '事务合并写入',
  args: {
    edits: 2000,
    mode: 'batched',
  },
  argTypes: {
    edits: {
      name: '写入次数',
      description: '向同一个 Y.Map 写入的键值对数量;越大,两种提交方式的差距越明显。',
      control: { type: 'range', min: 500, max: 5000, step: 500 },
    },
    mode: {
      name: '写入方式',
      description:
        'batched 把全部写入包在一个 doc.transact 里;per-edit 每次写入独立提交一个事务。',
      control: { type: 'select' },
      options: ['batched', 'per-edit'],
      labels: {
        batched: '单事务',
        'per-edit': '逐条事务',
      },
    },
  },
  render: renderTransactionCost,
  parameters: storySource(transactionCostSource),
};

export const LogCompaction: StoryObj<LogCompactionOptions> = {
  name: '日志压缩与墓碑',
  args: {
    edits: 1000,
    deleteRatio: 0,
  },
  argTypes: {
    edits: {
      name: '编辑次数',
      description: '在 Y.Text 中段插入词组的次数,决定增量日志的长度。',
      control: { type: 'range', min: 100, max: 1500, step: 100 },
    },
    deleteRatio: {
      name: '删除比例',
      description:
        '建档后从头部删除的内容百分比;观察 mergeUpdates 与快照对墓碑的不同处理。',
      control: { type: 'range', min: 0, max: 80, step: 10 },
    },
  },
  render: renderLogCompaction,
  parameters: storySource(logCompactionSource),
};

export const EditLocus: StoryObj<EditLocusOptions> = {
  name: '编辑落点与碎片',
  args: {
    edits: 1000,
    locus: 'mid',
  },
  argTypes: {
    edits: {
      name: '编辑次数',
      description: '每种落点都执行同样次数、同样内容的编辑,只改插入位置。',
      control: { type: 'range', min: 300, max: 1500, step: 100 },
    },
    locus: {
      name: '编辑落点',
      description:
        'append 从尾部追加;mid 固定插在文档中点;random 用固定种子随机插。三档同时测量对照。',
      control: { type: 'select' },
      options: ['append', 'mid', 'random'],
      labels: {
        append: '尾部追加',
        mid: '文档中段',
        random: '随机位置',
      },
    },
  },
  render: renderEditLocus,
  parameters: storySource(editLocusSource),
};
