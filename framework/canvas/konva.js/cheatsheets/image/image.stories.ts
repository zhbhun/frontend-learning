import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createImageLesson,
  type ImageInstance,
  type ImageSnapshot,
} from './example';

interface ImageArgs {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

const renderInteractive = canvasStory({
  create: createImageLesson,
  apply(instance: ImageInstance, args: ImageArgs) {
    instance.update(args);
  },
  readout(snapshot: ImageSnapshot) {
    return [
      ['源尺寸', snapshot.sourceSize],
      ['裁剪区域 (源像素)', snapshot.cropRegion],
      ['显示框', snapshot.displayBox],
      ['有效缩放 x', snapshot.scaleX],
      ['有效缩放 y', snapshot.scaleY],
    ];
  },
});

const meta = {
  id: 'image',
  title: '形状与样式/形状/图片',
  tags: ['!dev'],
  args: {
    cropX: 40,
    cropY: 30,
    cropWidth: 160,
    cropHeight: 120,
  },
  argTypes: {
    cropX: {
      name: 'cropX',
      description: '裁剪区域在源图上的 x 坐标（源像素）。',
      control: { type: 'range', min: 0, max: 280, step: 4 },
    },
    cropY: {
      name: 'cropY',
      description: '裁剪区域在源图上的 y 坐标（源像素）。',
      control: { type: 'range', min: 0, max: 200, step: 4 },
    },
    cropWidth: {
      name: 'cropWidth',
      description: '裁剪区域宽度（源像素）。需与 cropHeight 同时 > 0 才会生效。',
      control: { type: 'range', min: 40, max: 280, step: 4 },
    },
    cropHeight: {
      name: 'cropHeight',
      description: '裁剪区域高度（源像素）。需与 cropWidth 同时 > 0 才会生效。',
      control: { type: 'range', min: 40, max: 200, step: 4 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ImageArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
