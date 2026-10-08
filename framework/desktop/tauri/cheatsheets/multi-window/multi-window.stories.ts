import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['当前窗口', snapshot.windowLine],
      ['最近操作', snapshot.error ?? snapshot.lastAction ?? '尚无操作'],
      ['收到的消息', snapshot.countLine],
    ];
  },
  captions: ['模拟桌面:点卡片「×」关闭窗口', '窗口管理:新建与发送'],
});

const meta = {
  id: 'multi-window',
  title: '核心开发/配置与窗口/多窗口',
  tags: ['!dev'],
  args: {
    mode: 'emit',
    target: 'note-1',
  },
  argTypes: {
    mode: {
      name: '发送方式',
      description:
        'emit 广播给所有窗口和 Rust 监听者;emitTo 只投递给匹配 target 的监听者。',
      control: {
        type: 'radio',
      },
      options: ['emit', 'emitTo'],
    },
    target: {
      name: '目标 label',
      description:
        'emitTo 的投递目标。改成不存在的 label(如 ghost)再点「发送消息」,可观察投递失败。',
      control: {
        type: 'text',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
