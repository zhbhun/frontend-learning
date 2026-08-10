import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFillStroke,
  type FillStrokeInstance,
  type FillStrokeSnapshot,
} from './example';

interface FillStrokeArgs {
  fill: string;
  fillEnabled: boolean;
  stroke: string;
  strokeEnabled: boolean;
  strokeWidth: number;
  /** 描边线型的可读标签，apply 时映射为 dash 数组。 */
  dash: '实线' | '虚线' | '点线' | '长划线';
  shadowColor: string;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

// 控件标签到 Konva dash 数组的映射；空数组表示实线。
const DASH_PATTERNS: Record<FillStrokeArgs['dash'], number[]> = {
  实线: [],
  虚线: [10, 5],
  点线: [2, 4],
  长划线: [16, 6],
};

const renderInteractive = canvasStory({
  create: createFillStroke,
  apply(instance: FillStrokeInstance, { dash, ...rest }: FillStrokeArgs) {
    instance.update({ ...rest, dash: DASH_PATTERNS[dash] ?? [] });
  },
  readout(snapshot: FillStrokeSnapshot) {
    return [
      ['填充', snapshot.fillEnabled ? snapshot.fill : '关闭'],
      [
        '描边',
        snapshot.strokeEnabled
          ? `${snapshot.stroke} · ${snapshot.strokeWidth}px`
          : '关闭',
      ],
      [
        '线型',
        snapshot.dash.length ? `[${snapshot.dash.join(', ')}]` : '实线',
      ],
      [
        '阴影',
        snapshot.shadowEnabled
          ? `${snapshot.shadowColor} · blur ${snapshot.shadowBlur} · (${snapshot.shadowOffsetX}, ${snapshot.shadowOffsetY})`
          : '关闭',
      ],
    ];
  },
});

const meta = {
  id: 'fill-stroke',
  title: '形状与样式/样式/填充、描边与阴影',
  tags: ['!dev'],
  args: {
    fill: '#4f7cff',
    fillEnabled: true,
    stroke: '#0f172a',
    strokeEnabled: true,
    strokeWidth: 4,
    dash: '实线',
    shadowColor: '#000000',
    shadowEnabled: false,
    shadowBlur: 12,
    shadowOffsetX: 8,
    shadowOffsetY: 8,
  },
  argTypes: {
    fill: {
      name: '填充颜色',
      description: 'fill：CSS 颜色字符串，填充形状内部。',
      control: { type: 'color' },
    },
    fillEnabled: {
      name: '启用填充',
      description: 'fillEnabled：false 时即使 fill 有值也不绘制填充。',
      control: { type: 'boolean' },
    },
    stroke: {
      name: '描边颜色',
      description: 'stroke：CSS 颜色字符串，绘制形状轮廓。',
      control: { type: 'color' },
    },
    strokeEnabled: {
      name: '启用描边',
      description: 'strokeEnabled：false 时即使 stroke 有值也不绘制描边。',
      control: { type: 'boolean' },
    },
    strokeWidth: {
      name: '描边宽度',
      description: 'strokeWidth：描边像素宽度，Konva 默认 2。',
      control: { type: 'range', min: 1, max: 24, step: 1 },
    },
    dash: {
      name: '描边线型',
      description: 'dash：虚线模式 [线段, 间隔, ...]，空数组为实线。',
      options: ['实线', '虚线', '点线', '长划线'],
      control: { type: 'select' },
    },
    shadowColor: {
      name: '阴影颜色',
      description: 'shadowColor：触发阴影的必要属性。',
      control: { type: 'color' },
    },
    shadowEnabled: {
      name: '启用阴影',
      description: 'shadowEnabled：阴影总开关，false 时不绘制阴影。',
      control: { type: 'boolean' },
    },
    shadowBlur: {
      name: '阴影模糊',
      description: 'shadowBlur：模糊半径，0 为硬边阴影。',
      control: { type: 'range', min: 0, max: 40, step: 1 },
    },
    shadowOffsetX: {
      name: '阴影偏移 X',
      description: 'shadowOffsetX：阴影水平偏移。',
      control: { type: 'range', min: -40, max: 40, step: 1 },
    },
    shadowOffsetY: {
      name: '阴影偏移 Y',
      description: 'shadowOffsetY：阴影垂直偏移。',
      control: { type: 'range', min: -40, max: 40, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FillStrokeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
