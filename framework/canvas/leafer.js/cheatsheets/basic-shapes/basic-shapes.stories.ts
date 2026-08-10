import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBasicShapes,
  type BasicShapeInstance,
  type BasicShapeSnapshot,
  type BasicShapeType,
} from './example';

interface BasicShapeArgs {
  shape: BasicShapeType;
  width: number;
  height: number;
  sides: number;
  cornerRadius: number;
  fill: string;
}

const renderInteractive = canvasStory({
  create: createBasicShapes,
  apply(instance: BasicShapeInstance, args: BasicShapeArgs) {
    instance.update(args);
  },
  readout(snapshot: BasicShapeSnapshot) {
    return [
      ['图形', snapshot.shape],
      ['实际类', snapshot.className],
      ['主尺寸', snapshot.size],
      ['形态', snapshot.note],
    ];
  },
});

const meta = {
  id: 'basic-shapes',
  title: '图形与样式/基础图形',
  tags: ['!dev'],
  args: {
    shape: 'rect',
    width: 180,
    height: 120,
    sides: 5,
    cornerRadius: 0,
    fill: '#32cd79',
  },
  argTypes: {
    shape: {
      name: '图形类型',
      description:
        '选择要渲染的基础图形。圆由 Ellipse（宽=高）实现、折线由 Line 的 points 模式实现，LeaferJS 没有独立的 Circle / Polyline 类。',
      control: {
        type: 'select',
      },
      options: [
        'rect',
        'circle',
        'ellipse',
        'line',
        'polyline',
        'polygon',
        'star',
      ],
    },
    width: {
      name: '主尺寸 width',
      description:
        '矩形 / 椭圆 / 多边形 / 星形的宽度，圆的直径（高自动等于宽），直线的长度，折线包围盒的宽。',
      control: {
        type: 'range',
        min: 80,
        max: 280,
        step: 4,
      },
    },
    height: {
      name: '高度 height',
      description:
        '矩形 / 椭圆 / 多边形 / 星形的高度，以及折线包围盒的高。圆忽略此项（恒等于 width），两点直线不使用此项。',
      control: {
        type: 'range',
        min: 80,
        max: 280,
        step: 4,
      },
    },
    sides: {
      name: '边数 / 角数',
      description:
        'Polygon 的 sides（边数，≥3）与 Star 的 corners（角数，≥3）。其余图形忽略此项。',
      control: {
        type: 'range',
        min: 3,
        max: 12,
        step: 1,
      },
    },
    cornerRadius: {
      name: '圆角 cornerRadius',
      description:
        'Rect / Polygon / Star / 折线 的拐角圆滑度。圆、椭圆、两点直线忽略此项。',
      control: {
        type: 'range',
        min: 0,
        max: 50,
        step: 1,
      },
    },
    fill: {
      name: '填充色 fill',
      description:
        '闭合图形（Rect / Ellipse / Polygon / Star）的填充颜色。直线与折线只用描边，不受此项影响。',
      control: {
        type: 'color',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<BasicShapeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
