import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createRenderBackend,
  type RenderBackendInstance,
  type RenderBackendOptions,
  type RenderBackendSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createRenderBackend,
  apply(instance: RenderBackendInstance, args: RenderBackendOptions) {
    instance.update(args);
  },
  readout(snapshot: RenderBackendSnapshot) {
    return [
      ['渲染后端', snapshot.backend],
      ['maxFPS', snapshot.maxFPS],
      ['实测 FPS', snapshot.fps],
      ['累计帧数', snapshot.totalTimes],
      ['局部渲染', snapshot.partRender ? '开启' : '关闭'],
      ['状态', snapshot.state],
    ];
  },
});

const meta = {
  id: 'render-backend',
  title: '起步/渲染后端',
  tags: ['!dev'],
  args: {
    maxFPS: 60,
    usePartRender: true,
    continuous: true,
  },
  argTypes: {
    maxFPS: {
      name: 'maxFPS',
      description:
        '最高渲染帧率上限。调小后旋转动画变顿、实测 FPS 跟随下降、累计帧数增长变慢。',
      control: {
        type: 'range',
        min: 5,
        max: 120,
        step: 5,
      },
    },
    usePartRender: {
      name: '局部渲染',
      description:
        '开启后首帧全量重绘，之后仅重绘变化区域；关闭则每帧全量重绘整张画布。',
      control: { type: 'boolean' },
    },
    continuous: {
      name: '持续触发渲染',
      description:
        '每帧改变节点属性以持续触发按需渲染。关闭后没有数据变化，累计帧数很快停止增长。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<RenderBackendOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
