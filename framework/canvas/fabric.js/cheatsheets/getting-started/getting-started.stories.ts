import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGettingStarted,
  type GettingStartedInstance,
  type GettingStartedSnapshot,
} from './example';

interface GettingStartedArgs {
  canvasType: 'canvas' | 'static';
  width: number;
  height: number;
  backgroundColor: string;
  shape: 'rect' | 'circle' | 'triangle';
  selection: boolean;
}

const renderInteractive = canvasStory({
  create: createGettingStarted,
  apply(instance: GettingStartedInstance, args: GettingStartedArgs) {
    instance.update(args);
  },
  readout(snapshot: GettingStartedSnapshot) {
    return [
      ['fabric 版本', snapshot.version],
      ['画布类型', snapshot.canvasType],
      ['画布尺寸', snapshot.dimensions],
      ['选中对象', snapshot.activeLabel],
    ];
  },
});

const meta = {
  id: 'getting-started',
  title: '起步/安装与第一个画布',
  tags: ['!dev'],
  args: {
    canvasType: 'canvas',
    width: 480,
    height: 280,
    backgroundColor: '',
    shape: 'rect',
    selection: true,
  },
  argTypes: {
    canvasType: {
      name: '画布类型',
      description:
        'Canvas 建有事件与选区层；StaticCanvas 只负责渲染。切换会销毁重建画布实例。',
      control: { type: 'inline-radio' },
      options: ['canvas', 'static'],
      labels: { canvas: '交互 Canvas', static: '静态 StaticCanvas' },
    },
    width: {
      name: '画布宽度',
      description: '构造选项 width，逻辑像素。',
      control: { type: 'range', min: 320, max: 640, step: 20 },
    },
    height: {
      name: '画布高度',
      description: '构造选项 height，逻辑像素。',
      control: { type: 'range', min: 200, max: 360, step: 20 },
    },
    backgroundColor: {
      name: '背景色',
      description: "构造选项 backgroundColor，默认 ''（透明）。",
      control: { type: 'select' },
      options: ['', '#ffffff', '#e0f2fe', '#fef3c7'],
      labels: {
        '': "默认 ''（透明）",
        '#ffffff': '白色',
        '#e0f2fe': '浅蓝',
        '#fef3c7': '浅黄',
      },
    },
    shape: {
      name: '第一个图形',
      description: '加入画布的第一个图形对象。',
      control: { type: 'inline-radio' },
      options: ['rect', 'circle', 'triangle'],
      labels: { rect: 'Rect 矩形', circle: 'Circle 圆', triangle: 'Triangle 三角' },
    },
    selection: {
      name: '启用框选',
      description: '构造选项 selection（仅交互画布生效）：空白处拖拽框选的开关。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GettingStartedArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
