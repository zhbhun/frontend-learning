import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import counterSource from './counter-convergence.ts?raw';
import textSource from './text-concurrent-edits.ts?raw';
import {
  TEXT_SCENARIO_OPTIONS,
  createTextLab,
  type TextLabArgsView,
  type TextLabInstance,
  type TextLabSnapshot,
} from './text-concurrent-edits';
import {
  createCounterLab,
  type CounterLabArgs,
  type CounterLabInstance,
  type CounterLabSnapshot,
} from './counter-convergence';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。场景切换与文本输入都通过 args 重新驱动实例重算。
 */
function textRenderer() {
  return canvasStory({
    create: createTextLab,
    apply(instance: TextLabInstance, args: TextLabArgsView) {
      instance.update(args);
    },
    readout(snapshot: TextLabSnapshot) {
      return [
        ['合并后读到', snapshot.mergedText],
        ['冲突记录', '无（字符级编辑自动合并）'],
        ['双向合并一致', snapshot.converged ? '是' : '否'],
      ];
    },
  });
}

const counterRenderer = canvasStory({
  create: createCounterLab,
  apply(instance: CounterLabInstance, args: CounterLabArgs) {
    instance.update(args);
  },
  readout(snapshot: CounterLabSnapshot) {
    return snapshot.rows;
  },
});

interface CourseArgs extends TextLabArgsView, CounterLabArgs {}

const meta = {
  id: 'text-and-counters',
  title: '核心基础/文本与计数器',
  tags: ['!dev'],
  args: {
    scenario: TEXT_SCENARIO_OPTIONS[0],
    aliceValue: ' wonderful',
    bobValue: 'Greetings',
    aliceDelta: 2,
    bobDelta: 3,
  },
  argTypes: {
    scenario: {
      name: '并发场景',
      description:
        '两个副本从同一基础文本分叉后执行的并发编辑：不同位置编辑、同位置插入、删除与区域内插入、updateText 整串更新。',
      control: { type: 'select' },
      options: TEXT_SCENARIO_OPTIONS,
    },
    aliceValue: {
      name: '副本 aaaa 编辑',
      description:
        '副本 aaaa 写入的内容，含义随场景变化：插入/替换的文本、待删除片段（删除场景）、整串结果（updateText 场景）。',
      control: { type: 'text' },
    },
    bobValue: {
      name: '副本 bbbb 编辑',
      description: '副本 bbbb 写入的内容，含义随场景变化，同上。',
      control: { type: 'text' },
    },
    aliceDelta: {
      name: '副本 aaaa 增量',
      description: '副本 aaaa 给 Counter 与普通数字同时施加的增量，可为负。',
      control: { type: 'range', min: -9, max: 9, step: 1 },
    },
    bobDelta: {
      name: '副本 bbbb 增量',
      description: '副本 bbbb 给 Counter 与普通数字同时施加的增量，可为负。',
      control: { type: 'range', min: -9, max: 9, step: 1 },
    },
  },
  render: textRenderer(),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const TextSplice: Story = {
  name: 'splice 按位置增删',
  args: { scenario: TEXT_SCENARIO_OPTIONS[0] },
  render: textRenderer(),
  parameters: storySource(textSource),
};

export const TextSamePos: Story = {
  name: '同位置并发插入',
  args: {
    scenario: TEXT_SCENARIO_OPTIONS[1],
    aliceValue: 'AAAA',
    bobValue: 'BBBB',
  },
  render: textRenderer(),
  parameters: storySource(textSource),
};

export const TextDeleteVsInsert: Story = {
  name: '删除与区域内插入',
  args: {
    scenario: TEXT_SCENARIO_OPTIONS[2],
    aliceValue: 'bc',
    bobValue: 'XY',
  },
  render: textRenderer(),
  parameters: storySource(textSource),
};

export const TextWholeUpdate: Story = {
  name: 'updateText 整串更新',
  args: {
    scenario: TEXT_SCENARIO_OPTIONS[3],
    aliceValue: 'hola world',
    bobValue: 'hello worlds!',
  },
  render: textRenderer(),
  parameters: storySource(textSource),
};

export const CounterLab: Story = {
  name: 'counter 并发增减',
  args: { aliceDelta: 2, bobDelta: 3 },
  render: counterRenderer,
  parameters: storySource(counterSource),
};
