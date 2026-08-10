import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBounds,
  type BoundsInstance,
  type BoundsSnapshot,
  type BoundsOptions,
} from './example';

interface BoundsArgs extends BoundsOptions {}

const renderInteractive = canvasStory({
  create: createBounds,
  apply(instance: BoundsInstance, args: BoundsArgs) {
    instance.update(args);
  },
  readout(snapshot: BoundsSnapshot) {
    return [
      ['boxBounds（inner）', snapshot.innerBox],
      ['worldBoxBounds', snapshot.worldBox],
      ['worldRenderBounds', snapshot.worldRender],
      ['旋转', `${snapshot.rotation}°`],
      ['描边宽', snapshot.strokeWidth],
      ['描边对齐', snapshot.strokeAlign],
    ];
  },
});

const meta = {
  id: 'bounds',
  title: '节点树与坐标/包围盒',
  tags: ['!dev'],
  args: {
    rotation: 25,
    strokeWidth: 12,
    strokeAlign: 'center',
  },
  argTypes: {
    rotation: {
      name: '旋转角度',
      description:
        '旋转 target。boxBounds（内边界）不会随之改变，但两个世界 AABB 外框会变大——轴对齐外接旋转后的矩形。',
      control: {
        type: 'range',
        min: 0,
        max: 90,
        step: 1,
      },
    },
    strokeWidth: {
      name: '描边宽度',
      description:
        '只扩大 worldRenderBounds（渲染边界）。为 0 时它与 worldBoxBounds 完全重合。',
      control: {
        type: 'range',
        min: 0,
        max: 40,
        step: 1,
      },
    },
    strokeAlign: {
      name: '描边对齐',
      description:
        'center 向两侧各扩 strokeWidth/2；outside 向外扩 strokeWidth；inside 不外扩（描边画在内部），renderBounds ≈ boxBounds。',
      control: {
        type: 'select',
      },
      options: ['center', 'inside', 'outside'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<BoundsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
