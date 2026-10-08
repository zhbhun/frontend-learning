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
      ['当前调用', snapshot.callLabel],
      ['执行结果', snapshot.resultLabel],
      ['AppState', snapshot.appStateLabel],
      ['AppState 锁', snapshot.appStateLockLabel],
      ['JobQueue 锁', snapshot.jobLockLabel],
    ];
  },
});

const meta = {
  id: 'state',
  title: '核心开发/前后端通信/状态',
  tags: ['!dev'],
  args: {
    command: 'increment',
  },
  argTypes: {
    command: {
      name: '演示命令',
      description:
        '选择一次 invoke 调用,观察命令如何经注入的 State 访问类型槽、锁的占用与释放,以及类型不符时的拒绝。',
      control: {
        type: 'radio',
      },
      options: ['increment', 'add-item', 'wrong-type', 'slow-job'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
