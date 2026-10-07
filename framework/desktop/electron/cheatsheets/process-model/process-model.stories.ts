import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import flowSource from './process-flow.ts?raw';
import {
  createProcessFlow,
  type FlowInstance,
  type FlowSnapshot,
} from './process-flow';

interface FlowArgs {
  request: 'direct' | 'bridge';
}

const renderFlow = canvasStory({
  create: createProcessFlow,
  apply(instance: FlowInstance, args: FlowArgs) {
    instance.update(args);
  },
  readout(snapshot: FlowSnapshot) {
    return [
      ['渲染端请求', snapshot.requestLabel],
      ['调用结果', snapshot.resultLabel],
      ['消息路径', snapshot.routeLabel],
    ];
  },
});

const meta = {
  id: 'process-model',
  title: '起步/进程模型',
  tags: ['!dev'],
  args: {
    request: 'bridge',
  },
  argTypes: {
    request: {
      name: '渲染端请求',
      description: '切换渲染端获取系统能力的方式，观察消息能否离开渲染进程。',
      control: {
        type: 'radio',
      },
      options: {
        '直接 require（无 Node 权限）': 'direct',
        '经 preload 桥请求主进程': 'bridge',
      },
    },
  },
  render: renderFlow,
  parameters: storySource(flowSource),
} satisfies Meta<FlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Flow: Story = {};
