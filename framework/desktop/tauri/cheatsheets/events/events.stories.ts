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
      ['发送方', snapshot.emitterLabel],
      ['投递范围', snapshot.deliveryScope],
      ['收到的监听', snapshot.receivedSummary],
      ['所关注监听', snapshot.focusResult],
    ];
  },
});

const meta = {
  id: 'events',
  title: '核心开发/前后端通信/事件',
  tags: ['!dev'],
  args: {
    emitter: 'frontend-emit',
    focus: 'main-instance',
  },
  argTypes: {
    emitter: {
      name: '发送方',
      description:
        '选择事件从哪一端、以何种范围发出,观察总线按投递目标过滤后,各监听者的接收结果。',
      control: {
        type: 'radio',
      },
      options: ['frontend-emit', 'frontend-emit-to', 'rust-emit', 'rust-emit-to'],
    },
    focus: {
      name: '所关注监听',
      description: '高亮一种监听注册方式,读数显示它在当前投递下是否收到。',
      control: {
        type: 'radio',
      },
      options: [
        'main-namespace',
        'main-target',
        'main-instance',
        'settings-namespace',
        'rust-listen',
        'rust-listen-any',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
