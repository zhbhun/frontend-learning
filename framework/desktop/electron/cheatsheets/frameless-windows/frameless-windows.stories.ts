import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './drag-region-sim.ts?raw';
import {
  createDragRegionSim,
  type DragRegionInstance,
  type DragRegionSnapshot,
} from './drag-region-sim';

interface DragRegionArgs {
  noDragOnButtons: boolean;
}

const renderInteractive = canvasStory({
  create: createDragRegionSim,
  apply(instance: DragRegionInstance, args: DragRegionArgs) {
    instance.update(args);
  },
  readout(snapshot: DragRegionSnapshot) {
    return [
      ['按钮 no-drag', snapshot.noDrag ? '已声明' : '未声明'],
      ['最近一次操作', snapshot.lastEvent],
    ];
  },
});

const meta = {
  id: 'frameless-windows',
  title: '窗口/无边框窗口',
  tags: ['!dev'],
  args: {
    noDragOnButtons: true,
  },
  argTypes: {
    noDragOnButtons: {
      name: '按钮 no-drag',
      description: '窗口控制按钮是否用 app-region: no-drag 从拖拽区域排除。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<DragRegionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
