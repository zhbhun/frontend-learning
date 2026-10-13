import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import groupingSource from './capture-grouping.ts?raw';
import collaborativeSource from './collaborative-undo.ts?raw';
import {
  createCaptureGrouping,
  type CaptureGroupingInstance,
  type CaptureGroupingOptions,
  type CaptureGroupingSnapshot,
} from './capture-grouping';
import {
  createCollaborativeUndo,
  type CollaborativeUndoInstance,
  type CollaborativeUndoOptions,
  type CollaborativeUndoSnapshot,
} from './collaborative-undo';

const renderGrouping = canvasStory({
  create: createCaptureGrouping,
  apply(instance: CaptureGroupingInstance, args: CaptureGroupingOptions) {
    instance.update(args);
  },
  readout(snapshot: CaptureGroupingSnapshot) {
    return [
      ['撤销栈步数', snapshot.stackSize],
      ['undo 一次撤回的字符', snapshot.removed],
      ['undo 后文本', snapshot.textAfterUndo],
      ['可重做', snapshot.canRedo],
    ];
  },
});

const renderCollaborative = canvasStory({
  create: createCollaborativeUndo,
  apply(instance: CollaborativeUndoInstance, args: CollaborativeUndoOptions) {
    instance.update(args);
  },
  readout(snapshot: CollaborativeUndoSnapshot) {
    return [
      ['A 撤销栈深度(undo 前)', snapshot.stackDepth],
      ['undo() 返回', snapshot.undoResult],
      ['undo 后 A 的文本', snapshot.textAfterA],
      ['undo 后 B 的文本', snapshot.textAfterB],
    ];
  },
});

const meta = {
  id: 'undo-manager',
  title: '核心机制/撤销与重做',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Grouping: StoryObj<CaptureGroupingOptions> = {
  args: {
    chars: 4,
    captureTimeout: 500,
    split: false,
  },
  argTypes: {
    chars: {
      name: '输入字符数',
      description: '逐字符连续输入,模拟一次快速键入。',
      control: {
        type: 'range',
        min: 2,
        max: 6,
        step: 1,
      },
    },
    captureTimeout: {
      name: 'captureTimeout',
      description:
        'UndoManager 的捕获窗口(毫秒):间隔小于该值的连续修改合并为一步。',
      control: { type: 'radio' },
      options: [0, 500],
      labels: {
        0: '0ms(每次修改各成一步)',
        500: '500ms(默认)',
      },
    },
    split: {
      name: '中途 stopCapturing',
      description:
        '输入到一半时调用一次 undoManager.stopCapturing(),强制把后续修改切进新的 StackItem。',
      control: { type: 'boolean' },
    },
  },
  render: renderGrouping,
  parameters: storySource(groupingSource),
};

export const Collaborative: StoryObj<CollaborativeUndoOptions> = {
  args: {
    trackRemote: false,
  },
  argTypes: {
    trackRemote: {
      name: "trackedOrigins 含 'remote'",
      description:
        "开启时 A 的 UndoManager 配置 trackedOrigins: new Set([null, 'remote']),把远端改动也追踪进撤销栈。",
      control: { type: 'boolean' },
    },
  },
  render: renderCollaborative,
  parameters: storySource(collaborativeSource),
};
