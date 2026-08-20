import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import configFlowSource from './config-flow.ts?raw';
import {
  createConfigFlow,
  type ConfigFlowInstance,
  type ConfigFlowSnapshot,
} from './config-flow';

interface ConfigFlowStoryArgs {
  greeting: string;
  volume: number;
  variant: 'plain' | 'bad-type' | 'extra-field';
}

const renderFlow = canvasStory({
  create: createConfigFlow,
  apply(instance: ConfigFlowInstance, args: ConfigFlowStoryArgs) {
    instance.update(args);
  },
  readout(snapshot: ConfigFlowSnapshot) {
    return [
      ['输入 config', snapshot.inputJson],
      ['校验', snapshot.verdict],
      ['fiber.state', snapshot.stateLabel],
      ['apply 收到', snapshot.reachedJson],
      ['registry.has(bell)', snapshot.registryLabel],
      ['已响应 ring', snapshot.rings],
    ];
  },
  captions: ['调整 Controls → 重新走一遍注册', '点击画布 → 分发一次 ring 事件'],
});

const meta = {
  id: 'config',
  title: '核心概念/配置',
  tags: ['!dev'],
  args: {
    greeting: '你好',
    volume: 3,
    variant: 'plain',
  },
  argTypes: {
    greeting: {
      name: 'greeting（输入值）',
      description:
        '传给 ctx.plugin 第二参的 greeting 字段；清空后由 schema 填默认值 "hello"。',
      control: { type: 'text' },
    },
    volume: {
      name: 'volume（输入值）',
      description:
        '传给 ctx.plugin 第二参的 volume 字段；控件范围 1-10，schema 只接受 1-5，拉过 5 即非法。',
      control: { type: 'range', min: 1, max: 10, step: 1 },
    },
    variant: {
      name: '输入变体',
      description:
        '在合法透传之外构造两类典型输入：类型冒充与 schema 外字段。',
      control: {
        type: 'inline-radio',
        labels: {
          plain: '合法透传',
          'bad-type': 'greeting 换成数字',
          'extra-field': '附加 schema 外字段',
        },
      },
    },
  },
  render: renderFlow,
  parameters: storySource(configFlowSource),
} satisfies Meta<ConfigFlowStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Flow: Story = {};
