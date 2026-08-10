import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createHitDetection,
  type HitDetectionInstance,
  type HitDetectionSnapshot,
  type HitDetectionOptions,
  type HitMode,
} from './example';

interface HitDetectionArgs extends HitDetectionOptions {}

const renderInteractive = canvasStory({
  create: createHitDetection,
  apply(instance: HitDetectionInstance, args: HitDetectionArgs) {
    instance.update(args);
  },
  readout(snapshot: HitDetectionSnapshot) {
    return [
      ['命中目标', snapshot.hitTarget],
      ['命中区域', snapshot.hitRegion],
      ['星形 listening', snapshot.starListening ? 'true' : 'false'],
    ];
  },
});

const meta = {
  id: 'hit-detection',
  title: '事件与交互/命中检测',
  tags: ['!dev'],
  args: {
    hitMode: 'star' as HitMode,
    listening: true,
    showHitRegion: false,
  },
  argTypes: {
    hitMode: {
      name: '命中区域',
      description:
        'hitMode：星形命中画布上的区域形状。star=沿用可见星形（默认）、circle=半径 96 的大圆（更易命中）、compact=半径 22 的小圆（更难命中）。',
      control: { type: 'select' },
      options: ['star', 'circle', 'compact'],
    },
    listening: {
      name: '星形可命中',
      description:
        'listening：星形是否参与命中检测，默认 true。false 时从命中画布移除，指针穿透到背景。',
      control: { type: 'boolean' },
    },
    showHitRegion: {
      name: '显示命中区域',
      description:
        '叠加半透明青色覆盖层标出星形的实际命中范围，便于对比可见图形与可点击区域。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<HitDetectionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
