import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createStacking,
  type StackingInstance,
  type StackingOptions,
  type StackingSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createStacking,
  apply(instance: StackingInstance, args: StackingOptions) {
    instance.update(args);
  },
  readout(snapshot: StackingSnapshot) {
    return [
      ['对象序（底 → 顶）', snapshot.orderText],
      ['目标索引', snapshot.targetIndex],
      ['对象数', snapshot.objectCount],
      ["getObjects('Rect')", snapshot.rectCount],
      ['操作生效', snapshot.opResult],
      ['本轮事件', snapshot.roundEvents],
    ];
  },
  captions: [
    '数组序 = 绘制序：上方对象盖住下方',
    '甲红 · 乙蓝 · 丙绿 · 丁黄 · 新紫',
  ],
});

const meta = {
  id: 'stacking',
  title: '变换与组织/对象管理',
  tags: ['!dev'],
  args: {
    target: 'jia',
    mutation: 'none',
    stackOp: 'none',
    moveIndex: 0,
    intersecting: false,
  },
  argTypes: {
    target: {
      name: '目标对象',
      description: '层级操作与 remove(目标) 作用的对象。',
      control: {
        type: 'inline-radio',
        labels: { jia: '甲', yi: '乙', bing: '丙', ding: '丁' },
      },
      options: ['jia', 'yi', 'bing', 'ding'],
    },
    mutation: {
      name: '增删操作',
      description:
        'add(新) 追加到末尾（最高层）；insertAt(索引, 新) 让新对象恰好落在该索引；remove(目标) 变参移除。',
      control: {
        type: 'select',
        labels: {
          none: '无',
          remove: 'remove(目标)',
          add: 'add(新)',
          insert0: 'insertAt(0, 新)',
          insert2: 'insertAt(2, 新)',
        },
      },
      options: ['none', 'remove', 'add', 'insert0', 'insert2'],
    },
    stackOp: {
      name: '层级操作',
      description:
        'v6+ 层级方法都在画布侧；返回 boolean 表示层级是否发生变化。',
      control: {
        type: 'select',
        labels: {
          none: '无',
          toFront: 'bringObjectToFront',
          toBack: 'sendObjectToBack',
          forward: 'bringObjectForward',
          backwards: 'sendObjectBackwards',
          moveTo: 'moveObjectTo',
        },
      },
      options: ['none', 'toFront', 'toBack', 'forward', 'backwards', 'moveTo'],
    },
    moveIndex: {
      name: 'moveObjectTo 索引',
      description: 'moveObjectTo(目标, 索引)：调用后目标恰好位于该索引。',
      control: {
        type: 'range',
        min: 0,
        max: 3,
        step: 1,
      },
    },
    intersecting: {
      name: '相交才逐级移动',
      description:
        'intersecting 参数：bringObjectForward / sendObjectBackwards 只与包围盒相交的对象交换层级。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<StackingOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
