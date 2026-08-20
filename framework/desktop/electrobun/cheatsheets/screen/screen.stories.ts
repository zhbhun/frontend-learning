import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import schematicSource from './multi-screen-positioning.ts?raw';
import {
  createMultiScreenPositioningSchematic,
  type MultiScreenPositioningInstance,
  type MultiScreenPositioningSnapshot,
  type PlacementTarget,
  type ScreenLayout,
} from './multi-screen-positioning';

interface MultiScreenPositioningArgs {
  layout: ScreenLayout;
  target: PlacementTarget;
}

const renderSchematic = canvasStory({
  create: createMultiScreenPositioningSchematic,
  apply(
    instance: MultiScreenPositioningInstance,
    args: MultiScreenPositioningArgs,
  ) {
    instance.update(args);
  },
  readout(snapshot: MultiScreenPositioningSnapshot) {
    return [
      ['光标（全局坐标）', snapshot.cursor],
      ['命中显示器', snapshot.hitDisplay],
      ['窗口目标 frame', snapshot.windowFrame],
    ];
  },
});

const meta = {
  id: 'screen',
  title: '系统集成/桌面能力/屏幕与显示器',
  tags: ['!dev'],
  args: {
    layout: 'right',
    target: 'secondary-workarea',
  },
  argTypes: {
    layout: {
      name: 'layout',
      description: '副屏相对主屏的位置：决定副屏 bounds.x/y 的正负。',
      options: ['right', 'below', 'above'],
      control: {
        type: 'inline-radio',
        labels: {
          right: 'right（副屏在右、并排更高）',
          below: 'below（副屏在下方）',
          above: 'above（副屏在上方）',
        },
      },
    },
    target: {
      name: 'target',
      description: '窗口定位策略：决定 frame 计算落到哪块 workArea。',
      options: ['primary-workarea', 'secondary-workarea', 'follow-cursor'],
      control: {
        type: 'inline-radio',
        labels: {
          'primary-workarea': 'primary-workarea（主屏 workArea 居中）',
          'secondary-workarea': 'secondary-workarea（副屏 workArea 居中）',
          'follow-cursor': 'follow-cursor（跟随光标所在屏）',
        },
      },
    },
  },
  render: renderSchematic,
  parameters: storySource(schematicSource),
} satisfies Meta<MultiScreenPositioningArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MultiScreenPositioningSchematic: Story = {};
