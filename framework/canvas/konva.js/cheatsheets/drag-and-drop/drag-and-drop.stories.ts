import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createDragDemo,
  type DragInstance,
  type DragSnapshot,
  type DragMode,
} from './example';

interface DragArgs {
  /** 约束模式：决定 dragBoundFunc 如何改写拖拽位置。 */
  mode: DragMode;
  /** 网格步长（像素）：仅「网格吸附」模式生效。 */
  snapStep: number;
}

const MODE_LABELS: Record<DragMode, string> = {
  free: '自由',
  horizontal: '仅水平',
  vertical: '仅竖直',
  box: '限定区域',
  grid: '网格吸附',
};

const renderInteractive = canvasStory({
  create: createDragDemo,
  apply(instance: DragInstance, args: DragArgs) {
    instance.update(args);
  },
  readout(snapshot: DragSnapshot) {
    return [
      ['位置', `(${snapshot.x}, ${snapshot.y})`],
      ['状态', snapshot.state === 'dragging' ? '拖拽中' : '空闲'],
      ['约束', MODE_LABELS[snapshot.mode]],
      ['步长', `${snapshot.snapStep}px`],
    ];
  },
});

const meta = {
  id: 'drag-and-drop',
  title: '事件与交互/拖拽',
  tags: ['!dev'],
  args: {
    mode: 'free',
    snapStep: 40,
  },
  argTypes: {
    mode: {
      name: '约束模式',
      description:
        '切换 dragBoundFunc 的拦截方式。直接拖动圆形即可观察约束如何改写位置。',
      options: ['free', 'horizontal', 'vertical', 'box', 'grid'],
      control: {
        type: 'select',
        labels: MODE_LABELS,
      },
    },
    snapStep: {
      name: '网格步长',
      description: '网格吸附模式下，圆形吸附到的步长（像素）。仅「网格吸附」模式生效。',
      control: { type: 'range', min: 20, max: 80, step: 10 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<DragArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
