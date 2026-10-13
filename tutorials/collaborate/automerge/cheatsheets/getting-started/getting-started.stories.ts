import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import mergeLoopSource from './merge-loop.ts?raw';
import {
  createMergeLab,
  type MergeLabInstance,
  type MergeLabSnapshot,
} from './merge-lab';
import type { MergeLoopInput } from './merge-loop';

const renderMergeLab = canvasStory({
  create: createMergeLab,
  apply(instance: MergeLabInstance, args: MergeLoopInput) {
    instance.update(args);
  },
  readout(snapshot: MergeLabSnapshot) {
    const { hasConflict, converged, immutableSnapshots } = snapshot.result;
    return [
      ['并发冲突', hasConflict ? '有（已确定唯一胜出值）' : '无'],
      ['双向合并一致', converged ? '是' : '否'],
      ['不可变快照', immutableSnapshots ? '每次 change / merge 都是新文档' : '否'],
    ];
  },
});

const meta = {
  id: 'getting-started',
  title: '核心基础/初识 Automerge',
  tags: ['!dev'],
  args: {
    mode: 'concurrent',
    field: 'title',
    valueA: '季度规划会',
    valueB: '季度复盘会',
  },
  argTypes: {
    mode: {
      name: '并发模式',
      description:
        'concurrent：两个副本写同一个字段（并发写入，产生冲突候选）；independent：副本 B 写另一字段（互不冲突）。',
      control: { type: 'radio' },
      options: ['concurrent', 'independent'],
    },
    field: {
      name: '写入字段',
      description: '副本 A 写入的字段；independent 模式下副本 B 自动写另一字段。',
      control: { type: 'radio' },
      options: ['title', 'note'],
    },
    valueA: {
      name: '副本 A 写入',
      description: '副本 A 在 change 回调里写入的文本。',
      control: { type: 'text' },
    },
    valueB: {
      name: '副本 B 写入',
      description: '副本 B 在 change 回调里写入的文本。',
      control: { type: 'text' },
    },
  },
  render: renderMergeLab,
  parameters: storySource(mergeLoopSource),
} satisfies Meta<MergeLoopInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MergeLab: Story = {};
