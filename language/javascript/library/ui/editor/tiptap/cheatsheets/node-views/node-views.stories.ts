import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import badgeSource from './badge-mark.ts?raw';
import './demo.css';
import {
  createMarkViewLab,
  type MarkViewLabArgs,
  type MarkViewLabInstance,
  type MarkViewLabSnapshot,
} from './mark-view-lab';
import counterCardSource from './counter-card.ts?raw';
import {
  createNodeViewLab,
  type NodeViewLabArgs,
  type NodeViewLabInstance,
  type NodeViewLabSnapshot,
} from './node-view-lab';

const nodeViewLabRender = canvasStory({
  create: createNodeViewLab,
  apply(instance: NodeViewLabInstance, args: NodeViewLabArgs) {
    instance.update(args);
  },
  readout(snapshot: NodeViewLabSnapshot) {
    return [
      ['count 属性', snapshot.count],
      ['update() 调用次数', snapshot.updates],
      ['destroy() 次数', snapshot.destroys],
      ['节点选区选中', snapshot.selected],
    ];
  },
});

const markViewLabRender = canvasStory({
  create: createMarkViewLab,
  apply(instance: MarkViewLabInstance, args: MarkViewLabArgs) {
    instance.update(args);
  },
  readout(snapshot: MarkViewLabSnapshot) {
    return [
      ['光标处 badge', snapshot.cursorBadge],
      ['update() 调用次数', snapshot.updates],
      ['destroy() 次数', snapshot.destroys],
    ];
  },
});

const meta = {
  id: 'node-views',
  title: '原理与自定义/Node View 与 Mark View',
  tags: ['!dev'],
  args: {
    withUpdate: true,
  },
  argTypes: {
    withUpdate: {
      name: '定义 update 方法',
      description: '打开后属性 / 等级变化复用现有 DOM；关闭后每次变化销毁重建整个视图',
      control: { type: 'boolean' },
    },
  },
} satisfies Meta<NodeViewLabArgs>;

export default meta;

// SB10：StoryObj 直接接收本 story 的 args 类型（两个实验台的 args 形状不同，各自声明）
export const NodeViewLab = {
  name: '节点视图实验台',
  render: nodeViewLabRender,
  parameters: storySource(counterCardSource),
} satisfies StoryObj<NodeViewLabArgs>;

export const MarkViewLab = {
  name: '标记视图实验台',
  render: markViewLabRender,
  parameters: storySource(badgeSource),
} satisfies StoryObj<MarkViewLabArgs>;
