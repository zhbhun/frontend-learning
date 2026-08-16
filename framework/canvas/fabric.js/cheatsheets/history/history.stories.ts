import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createHistoryLab,
  type HistoryInstance,
  type HistoryOptions,
  type HistorySnapshot,
} from './example';

const renderHistoryLab = canvasStory({
  create: createHistoryLab,
  apply(instance: HistoryInstance, args: HistoryOptions) {
    instance.update(args);
  },
  readout(snapshot: HistorySnapshot) {
    return [
      ['记录模式', snapshot.modeLabel],
      ['栈深度', snapshot.depthLabel],
      ['指针位置', snapshot.pointerLabel],
      ['可重做', snapshot.redoLabel],
      ['最近命令', snapshot.lastLabel],
      ['记录体积', snapshot.sizeLabel],
    ];
  },
});

const meta = {
  id: 'history',
  title: '进阶与工程/历史栈',
  tags: ['!dev'],
  args: {
    recordMode: 'command',
    mergeText: true,
    stackLimit: 10,
  },
  argTypes: {
    recordMode: {
      name: '记录模式',
      description:
        '命令：只存 before / after 属性 pick（undo 走 set，体积最小）。快照：每步存整画布 toObject() 的 JSON（undo 走 loadFromJSON 全场景替换，体积随对象数线性涨）。切换会重置历史——两种模式的条目不能混用。',
      control: {
        type: 'inline-radio',
        options: ['command', 'snapshot'],
      },
    },
    mergeText: {
      name: '合并文本输入',
      description:
        '开启：IText 连续输入（text:changed 逐键发）并成一条命令，text:editing:exited 后另起一条；关闭：每个按键各占一条——栈深度随键数增长。',
      control: { type: 'boolean' },
    },
    stackLimit: {
      name: '栈上限',
      description:
        '超过后丢最旧条目（丢掉的是最深的可撤销步）：把上限调到 3 再连加 4 个矩形，栈深度封顶 3，初始场景回不去。',
      control: {
        type: 'range',
        min: 2,
        max: 30,
        step: 1,
      },
    },
  },
  render: renderHistoryLab,
  parameters: storySource(exampleSource),
} satisfies Meta<HistoryOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HistoryLab: Story = {};
