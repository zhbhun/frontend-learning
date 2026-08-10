import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createImageDemo,
  type ImageDemoInstance,
  type ImageDemoSnapshot,
  type ImageFillMode,
} from './example';

interface ImageDemoArgs {
  fillMode: ImageFillMode;
  boxWidth: number;
  boxHeight: number;
}

const renderInteractive = canvasStory({
  create: createImageDemo,
  apply(instance: ImageDemoInstance, args: ImageDemoArgs) {
    instance.update(args);
  },
  readout(snapshot: ImageDemoSnapshot) {
    return [
      ['加载状态', snapshot.ready],
      ['原始尺寸', snapshot.natural],
      ['节点', snapshot.node],
      ['显示', snapshot.box],
      ['模式', snapshot.mode],
    ];
  },
});

const meta = {
  id: 'image',
  title: '文本与图片/图片',
  tags: ['!dev'],
  args: {
    fillMode: 'cover',
    boxWidth: 220,
    boxHeight: 220,
  },
  argTypes: {
    fillMode: {
      name: '填充模式',
      description:
        '图片填入显示框的方式。auto = Image 按自然尺寸显示；stretch = Image 拉伸填满（比例变形）；' +
        'cover / fit = Rect + image 填充，分别裁剪铺满、等比留白。Image 元素不支持自定义 fill 模式，cover/fit 必须用 Rect。',
      control: {
        type: 'select',
      },
      options: ['auto', 'stretch', 'cover', 'fit'],
    },
    boxWidth: {
      name: '显示宽 boxWidth',
      description:
        '显示框宽度。对 stretch / cover / fit 生效；auto 模式忽略此项（用图片自然宽度）。',
      control: {
        type: 'range',
        min: 120,
        max: 320,
        step: 4,
      },
    },
    boxHeight: {
      name: '显示高 boxHeight',
      description:
        '显示框高度。对 stretch / cover / fit 生效；auto 模式忽略此项（用图片自然高度）。',
      control: {
        type: 'range',
        min: 120,
        max: 320,
        step: 4,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ImageDemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
