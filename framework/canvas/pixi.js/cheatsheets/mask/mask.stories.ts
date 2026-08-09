import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import maskSource from './mask.ts?raw';
import spriteMaskSource from './sprite-mask.ts?raw';
import {
  createMaskDemo,
  type MaskDemoInstance,
  type MaskDemoSnapshot,
} from './mask';
import {
  createSpriteMaskDemo,
  type SpriteMaskInstance,
  type SpriteMaskSnapshot,
} from './sprite-mask';

interface MaskDemoArgs {
  shape: string;
  inverse: boolean;
  enabled: boolean;
}

interface SpriteMaskArgs {
  channel: 'red' | 'alpha';
}

const meta = {
  id: 'mask',
  title: '视觉效果/蒙版',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const MaskDemo: Story = {
  args: {
    shape: 'circle',
    inverse: false,
    enabled: true,
  },
  argTypes: {
    shape: {
      name: '蒙版形状',
      description: 'Graphics 蒙版的形状。形状即裁剪区：内容只在形状内可见。',
      options: ['circle', 'roundRect', 'star'],
      control: { type: 'radio' },
      labels: {
        circle: '圆形 circle',
        roundRect: '圆角矩形 roundRect',
        star: '星形 star',
      },
    },
    inverse: {
      name: '反向 inverse',
      description:
        'setMask 的 inverse（默认 false）。true 时形状内透明、形状外可见（抠洞）。',
      control: { type: 'boolean' },
    },
    enabled: {
      name: '启用蒙版',
      description: '关闭时 content.setMask({ mask: null }) 移除蒙版，内容完整显示。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createMaskDemo,
    apply(instance: MaskDemoInstance, args: MaskDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: MaskDemoSnapshot) {
      return [
        ['蒙版形状', snapshot.shape],
        ['反向 inverse', snapshot.inverse ? '是' : '否'],
        ['蒙版', snapshot.enabled ? '开（已生效）' : '关（已移除）'],
      ];
    },
  }),
  parameters: storySource(maskSource),
};

export const SpriteMaskDemo: Story = {
  args: {
    channel: 'red',
  },
  argTypes: {
    channel: {
      name: '采样通道 channel',
      description:
        'Sprite 蒙版按通道采样纹理。默认 red（适合灰度蒙版图）；靠透明度表达的蒙版图用 alpha。',
      options: ['red', 'alpha'],
      control: { type: 'radio' },
      labels: {
        red: '红通道 red（默认）',
        alpha: '透明通道 alpha',
      },
    },
  },
  render: canvasStory({
    create: createSpriteMaskDemo,
    apply(instance: SpriteMaskInstance, args: SpriteMaskArgs) {
      instance.update(args);
    },
    readout(snapshot: SpriteMaskSnapshot) {
      return [['采样通道', snapshot.channel]];
    },
  }),
  parameters: storySource(spriteMaskSource),
};
