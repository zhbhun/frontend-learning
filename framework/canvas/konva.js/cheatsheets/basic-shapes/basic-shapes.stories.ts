import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createShapes,
  type ShapesInstance,
  type ShapesSnapshot,
} from './example';

interface ShapesArgs {
  /** 三种形状共用的水平位置 x。 */
  x: number;
  rectWidth: number;
  rectHeight: number;
  cornerRadius: number;
  circleRadius: number;
  ellipseRadiusX: number;
  ellipseRadiusY: number;
}

const renderInteractive = canvasStory({
  create: createShapes,
  apply(instance: ShapesInstance, args: ShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: ShapesSnapshot) {
    return [
      ['共享 x', snapshot.x],
      ['矩形 左上角=x', `${snapshot.rectLeft} → ${snapshot.rectRight}`],
      ['圆 中心=x', `${snapshot.circleLeft} → ${snapshot.circleRight}`],
      ['椭圆 中心=x', `${snapshot.ellipseLeft} → ${snapshot.ellipseRight}`],
    ];
  },
});

const meta = {
  id: 'basic-shapes',
  title: '形状与样式/形状/矩形、圆与椭圆',
  tags: ['!dev'],
  args: {
    x: 140,
    rectWidth: 130,
    rectHeight: 86,
    cornerRadius: 0,
    circleRadius: 52,
    ellipseRadiusX: 64,
    ellipseRadiusY: 34,
  },
  argTypes: {
    x: {
      name: '位置 x',
      description:
        '三种形状共用的 x。矩形把它当作左边（左上角），圆与椭圆把它当作中心。',
      control: { type: 'range', min: 40, max: 420, step: 2 },
    },
    rectWidth: {
      name: '矩形 宽',
      control: { type: 'range', min: 20, max: 220, step: 2 },
    },
    rectHeight: {
      name: '矩形 高',
      control: { type: 'range', min: 20, max: 160, step: 2 },
    },
    cornerRadius: {
      name: '矩形 圆角',
      description: 'cornerRadius：单个数值时四角统一。',
      control: { type: 'range', min: 0, max: 60, step: 1 },
    },
    circleRadius: {
      name: '圆 半径',
      description: 'radius：圆的半径，圆心位于 x。',
      control: { type: 'range', min: 4, max: 90, step: 1 },
    },
    ellipseRadiusX: {
      name: '椭圆 radiusX',
      control: { type: 'range', min: 4, max: 110, step: 2 },
    },
    ellipseRadiusY: {
      name: '椭圆 radiusY',
      control: { type: 'range', min: 4, max: 80, step: 2 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ShapesArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
