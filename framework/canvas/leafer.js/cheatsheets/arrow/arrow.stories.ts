import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createArrowScene,
  type ArrowDemoInstance,
  type ArrowDemoSnapshot,
  type ArrowEndType,
} from './example';

interface ArrowArgs {
  endArrow: ArrowEndType;
  startArrow: ArrowEndType;
  strokeWidth: number;
  arrowScale: number;
}

// 13 种内置箭头类型（IArrowType 全集），供「终点 / 起点箭头」选择器枚举。
const ARROW_TYPES: ArrowEndType[] = [
  'none',
  'angle',
  'angle-side',
  'arrow',
  'triangle',
  'triangle-flip',
  'circle',
  'circle-line',
  'square',
  'square-line',
  'diamond',
  'diamond-line',
  'mark',
];

const renderInteractive = canvasStory({
  create: createArrowScene,
  apply(instance: ArrowDemoInstance, args: ArrowArgs) {
    instance.update(args);
  },
  readout(snapshot: ArrowDemoSnapshot) {
    return [
      ['终点箭头', snapshot.endArrow],
      ['起点箭头', snapshot.startArrow],
      ['描边宽度', snapshot.strokeWidth],
      ['箭头比例', `×${snapshot.arrowScale}`],
    ];
  },
});

const meta = {
  id: 'arrow',
  title: '进阶与工程/箭头元素',
  tags: ['!dev'],
  args: {
    endArrow: 'arrow',
    startArrow: 'angle',
    strokeWidth: 5,
    arrowScale: 1,
  },
  argTypes: {
    endArrow: {
      name: '终点箭头',
      description:
        'Arrow.endArrow：终点箭头样式（默认 "angle"）。字符串即内置样式名；要缩放 / 旋转用对象 { type, scale, rotation }。',
      control: { type: 'select' },
      options: ARROW_TYPES,
    },
    startArrow: {
      name: '起点箭头',
      description:
        'Arrow.startArrow：起点箭头样式（默认 "none"，无箭头）。取值与 endArrow 相同。',
      control: { type: 'select' },
      options: ARROW_TYPES,
    },
    strokeWidth: {
      name: '描边宽度',
      description:
        'strokeWidth 同时决定线条粗细与箭头基准尺寸——箭头按"线宽为 1"设计，引擎自动按 strokeWidth 缩放。',
      control: { type: 'range', min: 1, max: 12, step: 1 },
    },
    arrowScale: {
      name: '箭头比例',
      description:
        '对象形式 { type, scale } 的 scale 倍数：在 strokeWidth 基准之上再放大箭头，不影响线条粗细。',
      control: { type: 'range', min: 1, max: 4, step: 0.5 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ArrowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
