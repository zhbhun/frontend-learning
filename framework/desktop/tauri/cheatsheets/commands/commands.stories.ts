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
      ['命令形态', snapshot.label],
      ['执行位置', snapshot.execution],
      ['Promise 状态', snapshot.promiseState],
      ['结果 / 拒绝原因', snapshot.promiseValue],
    ];
  },
});

const meta = {
  id: 'commands',
  title: '核心开发/前后端通信/命令',
  tags: ['!dev'],
  args: {
    variant: 'add',
  },
  argTypes: {
    variant: {
      name: '演示命令',
      description:
        '选择一条命令,观察 invoke 往返中参数、Rust 签名、响应与 Promise 的形态。',
      control: {
        type: 'radio',
      },
      options: ['add', 'greet', 'read_config', 'fib', 'divide', 'read_note'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
