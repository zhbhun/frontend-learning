import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFreeDrawingLab,
  type FreeDrawingInstance,
  type FreeDrawingOptions,
  type FreeDrawingSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createFreeDrawingLab,
  apply(instance: FreeDrawingInstance, args: FreeDrawingOptions) {
    instance.update(args);
  },
  readout(snapshot: FreeDrawingSnapshot) {
    return [
      ['绘制模式', snapshot.mode],
      ['当前笔刷', snapshot.brushName],
      ['最近事件', snapshot.lastEvent],
      ['对象类型', snapshot.objectType],
      ['path 命令数', snapshot.pathCommands],
      ['Group 子对象数', snapshot.groupSize],
      ['stroke', snapshot.stroke],
      ['strokeWidth', snapshot.strokeWidth],
      ['pathOffset', snapshot.pathOffset],
      ['对象总数', snapshot.objectCount],
    ];
  },
  captions: [
    '直接在画布上拖动绘制，松手看 path:created 快照；按住 shift 拖出直线；关掉「绘制模式」后可点选编辑',
  ],
});

const meta = {
  id: 'free-drawing',
  title: '交互与编辑/自由绘制',
  tags: ['!dev'],
  args: {
    brush: 'PencilBrush',
    drawingMode: true,
    color: '#2563eb',
    width: 8,
    decimate: 0.4,
  },
  argTypes: {
    brush: {
      name: '笔刷（freeDrawingBrush）',
      description:
        '挂到 canvas.freeDrawingBrush 上的内置笔刷：PencilBrush 产出 Path，CircleBrush / SprayBrush 产出 Group，PatternBrush 产出 stroke 为 Pattern 的 Path。',
      control: {
        type: 'select',
        labels: {
          PencilBrush: 'PencilBrush（铅笔 → Path）',
          CircleBrush: 'CircleBrush（圆点 → Group）',
          SprayBrush: 'SprayBrush（喷雾 → Group）',
          PatternBrush: 'PatternBrush（图案 → Path）',
        },
      },
      options: [
        'PencilBrush',
        'CircleBrush',
        'SprayBrush',
        'PatternBrush',
      ],
    },
    drawingMode: {
      name: '绘制模式（isDrawingMode）',
      description:
        'canvas.isDrawingMode：开 = 鼠标事件转交笔刷（按下会丢弃当前选中）；关 = 恢复普通点选 / 拖动编辑。',
      control: { type: 'boolean' },
    },
    color: {
      name: '笔刷颜色（brush.color）',
      description:
        'BaseBrush 公共配置：Pencil 系成为生成 Path 的 stroke，圆点 / 喷雾成为子对象 fill；PatternBrush 的内置圆点图案也用它绘制。',
      control: { type: 'color' },
    },
    width: {
      name: '笔刷宽度（brush.width）',
      description:
        'BaseBrush 公共配置：Pencil 系成为 strokeWidth；CircleBrush 决定圆点半径区间、SprayBrush 决定喷雾散布半径（两者构造默认 10，本例默认 8）。',
      control: { type: 'range', min: 1, max: 40, step: 1 },
    },
    decimate: {
      name: '抽稀距离（decimate）',
      description:
        'PencilBrush / PatternBrush 专属（默认 0.4）：松手前丢弃与上一点距离小于该值的中间点，距离按 zoom 折算；0 关闭抽稀。拉大后同样的笔迹 path 命令数变少。',
      control: { type: 'range', min: 0, max: 5, step: 0.5 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FreeDrawingOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
