import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import treeSource from './context-tree.ts?raw';
import {
  createContextTree,
  type TreeInstance,
  type TreeSnapshot,
} from './context-tree';

interface TreeArgs {
  sessionA: boolean;
  sessionB: boolean;
}

const renderTree = canvasStory({
  create: createContextTree,
  apply(instance: TreeInstance, args: TreeArgs) {
    instance.update(args);
  },
  readout(snapshot: TreeSnapshot) {
    return [
      ['ping 监听器（活动/共）', snapshot.listeners],
      ['心跳定时器（活动/共）', snapshot.timers],
      ['最近 ping 响应', snapshot.lastPing],
    ];
  },
  captions: [
    '点击画布 → 向根上下文分发一次 ping',
    '关闭「会话 A」→ 其子作用域一并消失，会话 B 不受影响',
  ],
});

const meta = {
  id: 'context',
  title: '核心概念/上下文',
  tags: ['!dev'],
  args: {
    sessionA: true,
    sessionB: true,
  },
  argTypes: {
    sessionA: {
      name: '会话 A',
      description: '开启时在根上下文上注册会话 A（内含子插件 bridge），关闭时销毁其 Fiber。',
      control: {
        type: 'boolean',
      },
    },
    sessionB: {
      name: '会话 B',
      description: '开启时在根上下文上注册会话 B，关闭时销毁其 Fiber。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderTree,
  parameters: storySource(treeSource),
} satisfies Meta<TreeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContextTree: Story = {};
