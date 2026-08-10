import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createScroll,
  type ScrollInstance,
  type ScrollSnapshot,
  type ScrollThemeType,
} from './example';

interface ScrollArgs {
  theme: ScrollThemeType;
  padding: number;
  contentScale: number;
}

const renderInteractive = canvasStory({
  create: createScroll,
  apply(instance: ScrollInstance, args: ScrollArgs) {
    instance.update(args);
  },
  readout(snapshot: ScrollSnapshot) {
    return [
      ['内容范围', snapshot.contentRange],
      ['视口', snapshot.viewport],
      ['缩略比', snapshot.ratio],
      ['视图偏移', snapshot.offset],
    ];
  },
});

const meta = {
  id: 'scroll',
  title: '交互与事件/滚动条',
  tags: ['!dev'],
  args: {
    theme: 'light',
    padding: 0,
    contentScale: 1,
  },
  argTypes: {
    theme: {
      name: '滚动条主题',
      description:
        'light / dark 为内置配色（分别配浅色 / 深色画布底）；custom 传自定义 IBoxInputData 样式（这里用绿色滑块）。',
      control: {
        type: 'select',
      },
      options: ['light', 'dark', 'custom'],
    },
    padding: {
      name: '画布内边距',
      description:
        '滚动条轨道距画布边缘的内边距（对应 config.padding）。调大后滑块轨道整体内缩。',
      control: {
        type: 'range',
        min: 0,
        max: 80,
        step: 4,
      },
    },
    contentScale: {
      name: '内容尺寸',
      description:
        '坐标网格的整体缩放。调大 → 内容更超出视口、滑块更短；调小到内容小于视口时（ratio ≥ 1）对应方向的滚动条自动隐藏。',
      control: {
        type: 'range',
        min: 0.5,
        max: 1.4,
        step: 0.1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ScrollArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
