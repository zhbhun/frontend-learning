import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import schematicSource from './title-bar-style-schematic.ts?raw';
import {
  createTitleBarStyleSchematic,
  type TitleBarStyle,
  type TitleBarStyleInstance,
  type TitleBarStyleSnapshot,
} from './title-bar-style-schematic';

interface TitleBarArgs {
  titleBarStyle: TitleBarStyle;
  offsetX: number;
  offsetY: number;
}

const renderSchematic = canvasStory({
  create: createTitleBarStyleSchematic,
  apply(instance: TitleBarStyleInstance, args: TitleBarArgs) {
    instance.update(args);
  },
  readout(snapshot: TitleBarStyleSnapshot) {
    return [
      ['titleBarStyle', snapshot.titleBarStyle],
      ['Titled', snapshot.titled],
      ['FullSizeContentView', snapshot.fullSizeContentView],
      ['原生红绿灯', snapshot.trafficLights],
      ['trafficLightOffset', snapshot.offsetEffect],
    ];
  },
});

const meta = {
  id: 'window-options',
  title: '窗口与视图/窗口/窗口选项',
  tags: ['!dev'],
  args: {
    titleBarStyle: 'default',
    offsetX: 0,
    offsetY: 0,
  },
  argTypes: {
    titleBarStyle: {
      name: 'titleBarStyle',
      description: '窗口标题栏样式；决定自动配置的 styleMask 项。',
      options: ['default', 'hidden', 'hiddenInset'],
      control: {
        type: 'inline-radio',
        labels: {
          default: 'default（原生标题栏）',
          hidden: 'hidden（完全隐藏）',
          hiddenInset: 'hiddenInset（透明内嵌）',
        },
      },
    },
    offsetX: {
      name: '红绿灯偏移 x',
      description: 'trafficLightOffset.x；仅 macOS 且 hiddenInset 时生效。',
      control: { type: 'range', min: 0, max: 90, step: 2 },
    },
    offsetY: {
      name: '红绿灯偏移 y',
      description: 'trafficLightOffset.y；仅 macOS 且 hiddenInset 时生效。',
      control: { type: 'range', min: 0, max: 24, step: 1 },
    },
  },
  render: renderSchematic,
  parameters: storySource(schematicSource),
} satisfies Meta<TitleBarArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleBarStyleSchematic: Story = {};
