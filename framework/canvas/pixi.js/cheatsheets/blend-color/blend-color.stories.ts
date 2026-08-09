import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import blendModesSource from './blend-modes.ts?raw';
import tintColorSource from './tint-color.ts?raw';
import {
  createBlendModesDemo,
  type BlendModesInstance,
  type BlendModesSnapshot,
} from './blend-modes';
import {
  createTintColorDemo,
  type TintColorInstance,
  type TintColorSnapshot,
} from './tint-color';

interface BlendModesArgs {
  blendMode: string;
  background: string;
}

interface TintColorArgs {
  tint: string;
  strength: number;
}

const meta = {
  id: 'blend-color',
  title: '视觉效果/混合模式与着色',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const BlendModeDemo: Story = {
  args: {
    blendMode: 'add',
    background: '#1a1a2e',
  },
  argTypes: {
    blendMode: {
      name: '混合模式',
      description:
        '决定对象与背景像素如何合成。前 4 个是标准 GPU 原生模式；overlay / difference 是高级模式（基于滤镜，需 import advanced-blend-modes + WebGL 开 useBackBuffer）；erase 擦除背景像素。',
      options: [
        'normal',
        'add',
        'multiply',
        'screen',
        'overlay',
        'difference',
        'erase',
      ],
      control: { type: 'radio' },
      labels: {
        normal: 'normal 标准 alpha 合成',
        add: 'add 加法 / 变亮',
        multiply: 'multiply 乘法 / 变暗',
        screen: 'screen 滤色 / 提亮',
        overlay: 'overlay 叠加（高级）',
        difference: 'difference 差值（高级）',
        erase: 'erase 擦除背景',
      },
    },
    background: {
      name: '背景色',
      description:
        '圆盘下方矩形的颜色。混合模式把对象颜色与这部分已绘制的背景合成，换背景色能看到同一 blendMode 的不同结果。',
      control: { type: 'color' },
    },
  },
  render: canvasStory({
    create: createBlendModesDemo,
    apply(instance: BlendModesInstance, args: BlendModesArgs) {
      instance.update(args);
    },
    readout(snapshot: BlendModesSnapshot) {
      return [
        ['当前模式', snapshot.blendMode],
        ['高级模式', snapshot.isAdvanced ? '是（需 advanced-blend-modes）' : '否'],
        ['背景色', snapshot.background],
      ];
    },
  }),
  parameters: storySource(blendModesSource),
};

export const TintDemo: Story = {
  args: {
    tint: '#ffffff',
    strength: 1,
  },
  argTypes: {
    tint: {
      name: '着色 tint',
      description:
        '任意 CSS 颜色（hex / rgb / 名称 / hsl 都可），PixiJS 用 Color 统一解析。白色 = 无 tint（默认）；彩色按乘法作用于对象像素。',
      control: { type: 'color' },
    },
    strength: {
      name: '强度',
      description:
        'tint 没有原生强度参数，这里在白色（无 tint）与目标色之间按强度线性插值模拟，演示 Color 的计算与转换能力。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
  },
  render: canvasStory({
    create: createTintColorDemo,
    apply(instance: TintColorInstance, args: TintColorArgs) {
      instance.update(args);
    },
    readout(snapshot: TintColorSnapshot) {
      return [
        ['tint (hex)', snapshot.hex],
        ['tint (rgba)', snapshot.rgba],
        ['tint (number)', snapshot.number],
        ['强度', snapshot.strength],
      ];
    },
  }),
  parameters: storySource(tintColorSource),
};
