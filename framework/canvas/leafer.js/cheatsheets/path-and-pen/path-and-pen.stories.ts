import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPathScene,
  createPenScene,
  type PathInstance,
  type PathSnapshot,
  type PenInstance,
  type PenSnapshot,
} from './example';

// Path 范例：声明式 SVG 路径字符串 + windingRule 填充规则。
interface PathArgs {
  windingRule: 'nonzero' | 'evenodd';
}

const renderPath = canvasStory({
  create: createPathScene,
  apply(instance: PathInstance, args: PathArgs) {
    instance.update(args);
  },
  readout(snapshot: PathSnapshot) {
    return [
      ['填充规则', snapshot.windingRule],
      ['路径命令数', snapshot.commandCount],
      ['路径字符数', snapshot.charCount],
    ];
  },
});

// Pen 范例：命令式 drawPoints + 平滑度。
interface PenArgs {
  pointCount: number;
  curve: number;
}

const renderPen = canvasStory({
  create: createPenScene,
  apply(instance: PenInstance, args: PenArgs) {
    instance.update(args);
  },
  readout(snapshot: PenSnapshot) {
    return [
      ['采样点数', snapshot.pointCount],
      ['平滑度 curve', snapshot.curve.toFixed(2)],
      ['路径数据长度', snapshot.dataLength],
    ];
  },
});

const meta = {
  id: 'path-and-pen',
  title: '图形与样式/路径与画笔',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const PathDemo = {
  args: {
    windingRule: 'nonzero',
  },
  argTypes: {
    windingRule: {
      name: '填充规则',
      description:
        'Path.windingRule：自相交路径的填充判定。nonzero（默认）完全填充；evenodd 在重叠区域留孔。',
      control: {
        type: 'select',
      },
      options: ['nonzero', 'evenodd'],
    },
  },
  render: renderPath,
  parameters: storySource(exampleSource),
} satisfies StoryObj<PathArgs>;

export const PenDemo = {
  args: {
    pointCount: 6,
    curve: 0.5,
  },
  argTypes: {
    pointCount: {
      name: '采样点数',
      description:
        'Pen.drawPoints 的输入点数。点越多，拟合曲线越贴合波形；红色圆点标出每个采样点。',
      control: {
        type: 'range',
        min: 4,
        max: 14,
        step: 1,
      },
    },
    curve: {
      name: '平滑度',
      description:
        'drawPoints 的 curve 参数：0 为折线（直线段），0–1 为二次贝塞尔平滑度，true 等价 0.5。',
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
  },
  render: renderPen,
  parameters: storySource(exampleSource),
} satisfies StoryObj<PenArgs>;
