import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createArchitecture,
  type ArchitectureInstance,
  type ArchitectureSnapshot,
} from './example';

interface ArchitectureArgs {
  shapeCount: number;
}

const renderInteractive = canvasStory({
  create: createArchitecture,
  apply(instance: ArchitectureInstance, args: ArchitectureArgs) {
    instance.update(args);
  },
  readout(snapshot: ArchitectureSnapshot) {
    return [
      ['图层数量', snapshot.layerCount],
      ['节点总数', snapshot.totalNodes],
      ['Group 子节点', snapshot.groupChildren],
      ['首个圆坐标', snapshot.firstCircle],
    ];
  },
});

const meta = {
  id: 'architecture',
  title: '起步与架构/核心架构',
  tags: ['!dev'],
  args: {
    shapeCount: 3,
  },
  argTypes: {
    shapeCount: {
      name: '形状层圆数',
      description: '上层 Group 中圆的数量，改变它会调整节点树的子节点数。',
      control: {
        type: 'range',
        min: 0,
        max: 6,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ArchitectureArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
