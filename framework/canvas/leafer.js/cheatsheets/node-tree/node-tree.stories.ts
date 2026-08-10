import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createNodeTree,
  type NodeTreeInstance,
  type NodeTreeSnapshot,
  type NodeTreeOptions,
} from './example';

interface NodeTreeArgs extends NodeTreeOptions {}

const renderInteractive = canvasStory({
  create: createNodeTree,
  apply(instance: NodeTreeInstance, args: NodeTreeArgs) {
    instance.update(args);
  },
  readout(snapshot: NodeTreeSnapshot) {
    return [
      ['红色矩形 zIndex', snapshot.redZIndex],
      ['红色渲染序号', snapshot.redRenderIndex],
      ['树最大深度', snapshot.treeDepth],
      ['根直接子节点数', snapshot.rootChildCount],
      ['可达节点总数', snapshot.totalNodes],
      ['选中节点路径', snapshot.selectedPath],
    ];
  },
});

const meta = {
  id: 'node-tree',
  title: '节点树与坐标/节点树结构',
  tags: ['!dev'],
  args: {
    redZIndex: 0,
    rightGroup: 'keep',
    selectNode: 'redRect',
  },
  argTypes: {
    redZIndex: {
      name: '红色矩形 zIndex',
      description:
        '调整 boxA 内红色矩形的 zIndex。同级按 zIndex 升序渲染，相同时按添加顺序。',
      control: {
        type: 'range',
        min: -3,
        max: 5,
        step: 1,
      },
    },
    rightGroup: {
      name: '右侧蓝色组',
      description: '「保留」挂载右侧子树，「移除」从根摘除整棵子树，演示 add/remove 与父子引用。',
      control: {
        type: 'select',
      },
      options: ['keep', 'remove'],
    },
    selectNode: {
      name: '查看路径',
      description: '选择要读取 parent 链路径的节点：红色矩形、右侧蓝色组或根场景。',
      control: {
        type: 'select',
      },
      options: ['redRect', 'rightGroup', 'root'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<NodeTreeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
