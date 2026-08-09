import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFirstScene,
  type FirstSceneInstance,
  type FirstSceneSnapshot,
} from './example';

interface FirstSceneArgs {
  angularSpeed: number;
}

const renderInteractive = canvasStory({
  create: createFirstScene,
  apply(instance: FirstSceneInstance, args: FirstSceneArgs) {
    instance.update(args);
  },
  readout(snapshot: FirstSceneSnapshot) {
    const degrees = (snapshot.rotation * 180) / Math.PI;
    return [
      ['状态', snapshot.rotating ? '旋转中' : '已暂停'],
      ['Y 轴角度', `${Math.round(degrees) % 360}°`],
      ['FPS', snapshot.fps],
    ];
  },
});

const meta = {
  id: 'first-scene',
  title: '起步/第一幅画面',
  tags: ['!dev'],
  args: {
    angularSpeed: 1,
  },
  argTypes: {
    angularSpeed: {
      name: '旋转速度',
      description: '每秒累加到立方体 Y 轴的弧度数；为 0 时立方体冻结，但渲染循环仍在运行。',
      control: {
        type: 'range',
        min: 0,
        max: 3,
        step: 0.1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FirstSceneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
