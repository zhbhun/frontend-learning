import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import performanceSource from './performance.ts?raw';
import {
  createPerformance,
  type PerformanceInstance,
  type PerformanceOptions,
  type PerformanceSnapshot,
} from './performance';

interface PerformanceArgs {
  instances: number;
}

const renderPerformance = canvasStory({
  create: createPerformance,
  apply(instance: PerformanceInstance, args: PerformanceArgs) {
    instance.update(args);
  },
  readout(snapshot: PerformanceSnapshot) {
    return [
      ['同屏实例数', snapshot.instances],
      ['近 60 帧平均每帧耗时', `${snapshot.avgFrameMs.toFixed(1)} ms`],
      ['掉帧累计（单帧超过 25ms）', snapshot.droppedFrames],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '数据与工程化/性能优化',
  tags: ['!dev'],
  args: {
    instances: 3,
  },
  argTypes: {
    instances: {
      name: '同屏实例数',
      description:
        '舞台上同时播放的动画实例数（1–8），其余槽位显示为虚线占位；读数为最近 60 帧的滑动统计。',
      control: {
        type: 'range',
        min: 1,
        max: 8,
        step: 1,
      },
    },
  },
  render: renderPerformance,
  parameters: storySource(performanceSource),
} satisfies Meta<PerformanceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Performance: Story = {};
