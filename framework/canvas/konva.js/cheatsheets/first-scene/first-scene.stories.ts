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
  circleRadius: number;
  rectCornerRadius: number;
}

const renderFirstScene = canvasStory({
  create: createFirstScene,
  apply(instance: FirstSceneInstance, args: FirstSceneArgs) {
    instance.update(args);
  },
  readout(snapshot: FirstSceneSnapshot) {
    return [
      ['Stage 尺寸', snapshot.stageSize],
      ['图层数', snapshot.layerCount],
      ['图层子节点', snapshot.childCount],
      ['圆形半径', snapshot.circleRadius],
    ];
  },
});

const meta = {
  id: 'first-scene',
  title: '起步与架构/安装与第一个场景',
  tags: ['!dev'],
  args: {
    circleRadius: 56,
    rectCornerRadius: 10,
  },
  argTypes: {
    circleRadius: {
      name: '圆形半径',
      description: '调整 Circle 的 radius 属性，观察画面自动刷新。',
      control: {
        type: 'range',
        min: 20,
        max: 90,
        step: 1,
      },
    },
    rectCornerRadius: {
      name: '矩形圆角',
      description: '调整 Rect 的 cornerRadius 属性。',
      control: {
        type: 'range',
        min: 0,
        max: 30,
        step: 1,
      },
    },
  },
  render: renderFirstScene,
  parameters: storySource(exampleSource),
} satisfies Meta<FirstSceneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
