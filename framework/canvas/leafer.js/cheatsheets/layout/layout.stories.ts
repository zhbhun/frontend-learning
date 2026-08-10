import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLayout,
  type LayoutInstance,
  type LayoutSnapshot,
  type FlowOption,
  type FlowAlignOption,
} from './example';

interface LayoutArgs {
  flow: FlowOption;
  gap: number;
  flowAlign: FlowAlignOption;
  flowWrap: boolean;
  growLast: number;
  childCount: number;
}

const renderInteractive = canvasStory({
  create: createLayout,
  apply(instance: LayoutInstance, args: LayoutArgs) {
    instance.update(args);
  },
  readout(snapshot: LayoutSnapshot) {
    return [
      ['排列方向', snapshot.flow],
      ['首项坐标', `(${snapshot.firstX}, ${snapshot.firstY})`],
      ['项间间距', snapshot.gapMeasured === null ? '—' : `${snapshot.gapMeasured}px`],
      ['末项主轴尺寸', `${snapshot.lastMainSize}px`],
      ['排列行/列数', snapshot.lines],
    ];
  },
});

const meta = {
  id: 'layout',
  title: '变换与布局/自动布局',
  tags: ['!dev'],
  args: {
    flow: 'x',
    gap: 8,
    flowAlign: 'top-left',
    flowWrap: false,
    growLast: 0,
    childCount: 3,
  },
  argTypes: {
    flow: {
      name: '排列方向 flow',
      description:
        '开启自动布局并决定主轴方向。true 等价 x；-reverse 沿主轴反向排列。',
      control: { type: 'select' },
      options: ['x', 'y', 'x-reverse', 'y-reverse'],
    },
    gap: {
      name: '间距 gap',
      description: '子项之间的间距（同时作用于主轴行内与换行后的交叉轴）。',
      control: { type: 'range', min: 0, max: 32, step: 2 },
    },
    flowAlign: {
      name: '对齐 flowAlign',
      description: '内容整体在容器内的对齐；方向字符串同时决定行内对齐。',
      control: { type: 'select' },
      options: [
        'top-left',
        'top',
        'top-right',
        'left',
        'center',
        'right',
        'bottom-left',
        'bottom',
        'bottom-right',
      ],
    },
    flowWrap: {
      name: '换行 flowWrap',
      description: '主轴放不下时是否换到下一行/列。',
      control: { type: 'boolean' },
    },
    growLast: {
      name: '末项拉伸 flexGrow',
      description:
        '给最后一个子项沿主轴的弹性权重（autoWidth / autoHeight），>0 时吃掉剩余空间。',
      control: { type: 'range', min: 0, max: 2, step: 0.5 },
    },
    childCount: {
      name: '子项数量',
      description: '容器内参与排列的固定尺寸子元素个数。',
      control: { type: 'range', min: 2, max: 6, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<LayoutArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
