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
      ['请求通道', snapshot.channelLabel],
      ['目标接口', snapshot.targetLabel],
      ['CORS 检查', snapshot.corsLabel],
      ['scope 检查', snapshot.scopeLabel],
      ['结算结果', snapshot.resultLabel],
    ];
  },
});

const meta = {
  id: 'http',
  title: '插件与权限/网络请求',
  tags: ['!dev'],
  args: {
    channel: 'browser',
    target: 'api.example.com',
  },
  argTypes: {
    channel: {
      name: '请求通道',
      description:
        '选择浏览器内置 fetch 或 http 插件 fetch,观察同一请求经过的不同关卡与结算结果。',
      control: {
        type: 'radio',
      },
      options: ['browser', 'plugin'],
    },
    target: {
      name: '目标接口',
      description:
        '切换目标接口(api.example.com / internal.example.com / api.other.com),对照 CORS 头与 scope 白名单两个关卡。',
      control: {
        type: 'radio',
      },
      options: ['api.example.com', 'internal.example.com', 'api.other.com'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
