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

function formatLeftover(snapshot: ExampleSnapshot): string {
  if (snapshot.leftover === null) {
    return '尚未销毁';
  }
  return snapshot.leftover === 0
    ? '0 个（已清理）'
    : `${snapshot.leftover} 个（未清理）`;
}

const renderMultiInstance = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['当前实例数', snapshot.instances],
      ['动画渲染节点', snapshot.svgNodes],
      ['最近一次销毁残留', formatLeftover(snapshot)],
    ];
  },
  captions: ['每个方格是一个独立实例（svg 渲染器）'],
});

const meta = {
  id: 'animation-data',
  title: '数据与工程化/动画数据管理',
  tags: ['!dev'],
  args: {
    count: 2,
  },
  argTypes: {
    count: {
      name: '同屏实例数',
      description:
        '拖动滑杆重建同屏实例：先 destroy 全部现有实例，再按新数量创建。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
      },
    },
  },
  render: renderMultiInstance,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MultiInstance: Story = {};
