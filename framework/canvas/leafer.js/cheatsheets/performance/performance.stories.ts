import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPerformance,
  type PerformanceInstance,
  type PerformanceSnapshot,
  type PerformanceSpread,
} from './example';

interface PerformanceArgs {
  count: number;
  spread: PerformanceSpread;
  usePartRender: boolean;
  showRepaint: boolean;
}

const renderInteractive = canvasStory({
  create: createPerformance,
  apply(instance: PerformanceInstance, args: PerformanceArgs) {
    instance.update(args);
  },
  readout(snapshot: PerformanceSnapshot) {
    return [
      ['方块总数', snapshot.count],
      ['闪烁元素', snapshot.animated],
      ['脏区覆盖', `${snapshot.coverage}%`],
      ['实测 FPS', snapshot.fps],
      ['累计出帧', snapshot.totalTimes],
      ['渲染状态', snapshot.state],
      ['局部渲染', snapshot.partRender ? '开' : '关'],
      ['重绘高亮', snapshot.showRepaint ? '开' : '关'],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '进阶与工程/性能优化',
  tags: ['!dev'],
  args: {
    count: 800,
    spread: 'cluster',
    usePartRender: true,
    showRepaint: false,
  },
  argTypes: {
    count: {
      name: '方块总数',
      description:
        '网格里的静态方块数量（闪烁子集另取一小撮）。局部渲染开启时静态方块不参与重绘，数量上涨对 FPS 几乎无影响；关闭局部渲染时全量重绘成本随之上升。',
      control: {
        type: 'range',
        min: 100,
        max: 2000,
        step: 100,
      },
    },
    spread: {
      name: '动效分布',
      description:
        '集中：闪烁方块聚在左上角，合并脏区很小；分散：闪烁方块均匀散布全画布，合并脏区膨胀到接近整屏。',
      control: {
        type: 'inline-radio',
      },
      options: ['cluster', 'scatter'],
    },
    usePartRender: {
      name: '局部渲染',
      description:
        '对应 Leafer config 的 usePartRender。开 → 只重绘脏区（partRender）；关 → 每帧全量重绘（fullRender）。',
      control: {
        type: 'boolean',
      },
    },
    showRepaint: {
      name: '显示重绘区',
      description:
        '打开 Debug.showRepaint：渲染器把每帧真正重绘的脏区涂上随机半透明色块，直观看清「到底画了哪一块」。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<PerformanceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
