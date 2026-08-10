import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMaskEraser,
  type MaskEraserInstance,
  type MaskEraserSnapshot,
  type LimitMode,
  type MaskTypeOption,
} from './example';

interface MaskEraserArgs {
  mode: LimitMode;
  maskType: MaskTypeOption;
}

const renderInteractive = canvasStory({
  create: createMaskEraser,
  apply(instance: MaskEraserInstance, args: MaskEraserArgs) {
    instance.update(args);
  },
  readout(snapshot: MaskEraserSnapshot) {
    return [
      ['当前模式', snapshot.mode],
      ['限定类型', snapshot.limitType],
      ['影响对象', snapshot.affect],
      ['限定形状', snapshot.shape],
    ];
  },
});

const meta = {
  id: 'mask-and-eraser',
  title: '图形与样式/遮罩、裁剪与擦除',
  tags: ['!dev'],
  args: {
    mode: 'mask',
    maskType: 'pixel',
  },
  argTypes: {
    mode: {
      name: '模式 mode',
      description:
        '三种限定可见区域的手段。mask：限定形状节点保留同组上层兄弟的内侧（destination-in）；eraser：限定形状节点擦除同组下层兄弟的内侧（destination-out）；clip：容器用 overflow 隐藏超出自身宽高的子内容。none 为不限定的参照。',
      control: { type: 'select' },
      options: ['none', 'mask', 'eraser', 'clip'],
    },
    maskType: {
      name: '遮罩类型 maskType',
      description:
        '仅 mask 模式生效。pixel（默认）按像素透明度，可制作软边、半透明遮罩；path 用路径裁剪，性能更高但忽略透明度；grayscale 把色彩明度转为透明度（白不透明、黑透明）；clipping / clipping-path 类似 PS 剪贴蒙版，且会渲染遮罩自身。',
      control: { type: 'select' },
      options: ['path', 'pixel', 'grayscale', 'clipping', 'clipping-path'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MaskEraserArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
