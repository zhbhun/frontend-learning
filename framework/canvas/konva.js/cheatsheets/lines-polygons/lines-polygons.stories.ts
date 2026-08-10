import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLineFamily,
  type LineFamilyInstance,
  type LineFamilySnapshot,
} from './example';

interface LineFamilyArgs {
  /** 顶点数：围绕椭圆均匀分布的点数。 */
  pointCount: number;
  /** tension：0 = 直线段；>0 = 在顶点间平滑插值。 */
  tension: number;
  /** closed：false = 开放线；true = 首尾相连（多边形，可填充）。 */
  closed: boolean;
}

const renderInteractive = canvasStory({
  create: createLineFamily,
  apply(instance: LineFamilyInstance, args: LineFamilyArgs) {
    instance.update(args);
  },
  readout(snapshot: LineFamilySnapshot) {
    return [
      ['顶点数', snapshot.pointCount],
      ['tension', snapshot.tension],
      ['闭合 closed', snapshot.closed ? '是' : '否'],
      ['形态', snapshot.mode],
    ];
  },
});

const meta = {
  id: 'lines-polygons',
  title: '形状与样式/形状/线、多边形与路径',
  tags: ['!dev'],
  args: {
    pointCount: 5,
    tension: 0,
    closed: false,
  },
  argTypes: {
    pointCount: {
      name: '顶点数',
      description:
        'points 数组的顶点个数；围绕椭圆均匀分布，决定多边形的边数。',
      control: { type: 'range', min: 3, max: 8, step: 1 },
    },
    tension: {
      name: 'tension',
      description: '0 = 直线段连接顶点；>0 = 在顶点间平滑插值，得到样条曲线。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    closed: {
      name: '闭合 closed',
      description:
        'false = 开放折线（只描边）；true = 首尾相连成多边形，fill 才会生效。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<LineFamilyArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
