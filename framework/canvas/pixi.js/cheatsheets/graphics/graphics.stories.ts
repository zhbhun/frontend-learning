import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import shapesSource from './shapes.ts?raw';
import pathsSource from './paths.ts?raw';
import {
  createShapeDemo,
  type ShapeDemoInstance,
  type ShapeDemoSnapshot,
} from './shapes';
import {
  createPathDemo,
  type PathDemoInstance,
  type PathDemoSnapshot,
} from './paths';

interface ShapeDemoArgs {
  shape: string;
  strokeWidth: number;
  alignment: number;
  fillAlpha: number;
}

interface PathDemoArgs {
  fill: boolean;
  stroke: boolean;
  cut: boolean;
}

const meta = {
  id: 'graphics',
  title: '内容对象/图形绘制',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShapeDemo: Story = {
  args: {
    shape: 'star',
    strokeWidth: 6,
    alignment: 0.5,
    fillAlpha: 0.65,
  },
  argTypes: {
    shape: {
      name: '形状',
      description: '选择要绘制的形状方法。先画形，再用 fill / stroke 上色。',
      options: ['rect', 'roundRect', 'circle', 'ellipse', 'star'],
      control: { type: 'radio' },
      labels: {
        rect: '矩形 rect',
        roundRect: '圆角矩形 roundRect',
        circle: '圆形 circle',
        ellipse: '椭圆 ellipse',
        star: '星形 star',
      },
    },
    strokeWidth: {
      name: '描边宽度 width',
      description: 'stroke 样式的 width 字段；0 等于无描边。',
      control: { type: 'range', min: 0, max: 16, step: 1 },
    },
    alignment: {
      name: '描边对齐 alignment',
      description: '0–1，默认 0.5 居中；偏离 0.5 时描边偏向某一侧。',
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
    },
    fillAlpha: {
      name: '填充透明度 alpha',
      description: 'fill 样式的 alpha 字段；1 全不透明、0 全透明。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
  },
  render: canvasStory({
    create: createShapeDemo,
    apply(instance: ShapeDemoInstance, args: ShapeDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: ShapeDemoSnapshot) {
      return [
        ['形状', snapshot.shape],
        ['描边宽度 width', snapshot.strokeWidth],
        ['描边对齐 alignment', snapshot.alignment],
        ['填充透明度 alpha', snapshot.fillAlpha],
      ];
    },
  }),
  parameters: storySource(shapesSource),
};

export const PathDemo: Story = {
  args: {
    fill: true,
    stroke: true,
    cut: true,
  },
  argTypes: {
    fill: {
      name: '填充 fill',
      description: '给心形路径上填充色。',
      control: { type: 'boolean' },
    },
    stroke: {
      name: '描边 stroke',
      description: '给心形路径描边。',
      control: { type: 'boolean' },
    },
    cut: {
      name: '挖洞 cut',
      description: 'cut 作用于前面的填充几何；仅在填充开启时可见。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createPathDemo,
    apply(instance: PathDemoInstance, args: PathDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: PathDemoSnapshot) {
      return [
        ['填充 fill', snapshot.fill],
        ['描边 stroke', snapshot.stroke],
        ['挖洞 cut', snapshot.cut],
      ];
    },
  }),
  parameters: storySource(pathsSource),
};
