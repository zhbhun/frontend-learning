import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFillStroke,
  type FillStrokeInstance,
  type FillStrokeSnapshot,
  type FillType,
  type StrokeAlignType,
  type StrokeCapType,
  type StrokeJoinType,
} from './example';

interface FillStrokeArgs {
  fill: FillType;
  strokeWidth: number;
  dash: number;
  dashOffset: number;
  strokeAlign: StrokeAlignType;
  strokeCap: StrokeCapType;
  strokeJoin: StrokeJoinType;
}

const renderInteractive = canvasStory({
  create: createFillStroke,
  apply(instance: FillStrokeInstance, args: FillStrokeArgs) {
    instance.update(args);
  },
  readout(snapshot: FillStrokeSnapshot) {
    return [
      ['填充', snapshot.fill],
      ['描边宽度', snapshot.strokeWidth],
      ['虚线', snapshot.dash],
      ['描边对齐', snapshot.strokeAlign],
      ['线帽·拐角', snapshot.capJoin],
    ];
  },
});

const meta = {
  id: 'fill-and-stroke',
  title: '图形与样式/填充与描边',
  tags: ['!dev'],
  args: {
    fill: 'linear',
    strokeWidth: 8,
    dash: 0,
    dashOffset: 0,
    strokeAlign: 'inside',
    strokeCap: 'none',
    strokeJoin: 'miter',
  },
  argTypes: {
    fill: {
      name: '填充类型 fill',
      description:
        '三种画法：纯色字符串、线性渐变 paint、径向渐变 paint。fill 和 stroke 共用同一套 paint 表达。',
      control: { type: 'select' },
      options: ['solid', 'linear', 'radial'],
    },
    strokeWidth: {
      name: '描边宽度 strokeWidth',
      description:
        '描边粗细（px）。描边由 stroke 与 strokeWidth 共同决定，0 或不设 stroke 都不画描边。',
      control: { type: 'range', min: 0, max: 24, step: 1 },
    },
    dash: {
      name: '虚线长度 dash',
      description:
        '0 = 实线（dashPattern 不设）；>0 = [dash, dash] 等距虚线，同时线帽出现在每个 dash 两端。',
      control: { type: 'range', min: 0, max: 40, step: 2 },
    },
    dashOffset: {
      name: '虚线偏移 dashOffset',
      description: '虚线沿路径的起点偏移（px）；dash 为 0 时无效。',
      control: { type: 'range', min: 0, max: 40, step: 2 },
    },
    strokeAlign: {
      name: '描边对齐 strokeAlign',
      description:
        '描边带相对 fill 边界的位置：inside 整条在内、center 居中跨边界、outside 整条在外。默认值因元素而异：UI 基类（矩形/椭圆/多边形/星形）为 inside，Line/Path 为 center，Text 为 outside。',
      control: { type: 'select' },
      options: ['inside', 'center', 'outside'],
    },
    strokeCap: {
      name: '线帽 strokeCap',
      description:
        '开放端点 / 每个 dash 两端的形状：none（平帽，等价 butt）、round（圆帽）、square（方帽）。闭合图形的实线描边看不到线帽，需打开虚线观察。',
      control: { type: 'select' },
      options: ['none', 'round', 'square'],
    },
    strokeJoin: {
      name: '拐角 strokeJoin',
      description:
        '两段描边在拐角处的连接：miter（尖角，默认）、round（圆角）、bevel（斜角）。把虚线设为 0 观察最清晰。',
      control: { type: 'select' },
      options: ['miter', 'round', 'bevel'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FillStrokeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
