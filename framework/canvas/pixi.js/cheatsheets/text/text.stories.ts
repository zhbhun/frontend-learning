import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import textSource from './text.ts?raw';
import bitmapTextSource from './bitmap-text.ts?raw';
import htmlTextSource from './html-text.ts?raw';
import {
  createTextDemo,
  type TextDemoInstance,
  type TextDemoSnapshot,
} from './text';
import {
  createBitmapTextDemo,
  type BitmapTextDemoInstance,
  type BitmapTextDemoSnapshot,
} from './bitmap-text';
import {
  createHtmlTextDemo,
  type HtmlTextDemoInstance,
  type HtmlTextDemoSnapshot,
} from './html-text';

interface TextDemoArgs {
  fill: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
  dropShadow: boolean;
}

interface BitmapTextDemoArgs {
  running: boolean;
  fontSize: number;
  tint: string;
}

interface HtmlTextDemoArgs {
  mode: 'inline' | 'tags';
  align: 'left' | 'center' | 'right';
}

const meta = {
  id: 'text',
  title: '内容对象/文本',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextDemo: Story = {
  args: {
    fill: '#f8fafc',
    fontSize: 36,
    align: 'center',
    dropShadow: true,
  },
  argTypes: {
    fill: {
      name: '填充 fill',
      description: 'TextStyle.fill，支持颜色 / 渐变 / 图案。改后 Text 重新光栅化。',
      control: { type: 'color' },
    },
    fontSize: {
      name: '字号 fontSize',
      description: 'TextStyle.fontSize（数字即像素）。改后 Text 重新光栅化。',
      control: { type: 'range', min: 20, max: 56, step: 2 },
    },
    align: {
      name: '对齐 align',
      description: '多行对齐，只对多行文本有效（单行无变化）。',
      options: ['left', 'center', 'right'],
      control: { type: 'radio' },
      labels: { left: '左 left', center: '中 center', right: '右 right' },
    },
    dropShadow: {
      name: '投影 dropShadow',
      description: '是否启用投影（TextStyle.dropShadow）。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createTextDemo,
    apply(instance: TextDemoInstance, args: TextDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: TextDemoSnapshot) {
      return [
        ['字体 fontFamily', snapshot.fontFamily],
        ['字号 fontSize', snapshot.fontSize],
        ['对齐 align', snapshot.align],
        ['分辨率 resolution', snapshot.resolution],
      ];
    },
  }),
  parameters: storySource(textSource),
};

export const BitmapTextDemo: Story = {
  args: {
    running: true,
    fontSize: 40,
    tint: '#fde047',
  },
  argTypes: {
    running: {
      name: '计数器 running',
      description: '开启后每帧改 text（演示「改文本只重排字形」的廉价更新）。',
      control: { type: 'boolean' },
    },
    fontSize: {
      name: '字号 fontSize（缩放）',
      description: '实例 fontSize 缩放已生成的字形，字体数据不变。',
      control: { type: 'range', min: 24, max: 72, step: 4 },
    },
    tint: {
      name: '染色 tint',
      description: '整体染色（继承自 Container 的 tint），不改字体数据。',
      control: { type: 'color' },
    },
  },
  render: canvasStory({
    create: createBitmapTextDemo,
    apply(instance: BitmapTextDemoInstance, args: BitmapTextDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: BitmapTextDemoSnapshot) {
      return [
        ['字体 fontFamily', snapshot.fontFamily],
        ['字号 fontSize', snapshot.fontSize],
        ['染色 tint', snapshot.tint],
        ['当前文本', snapshot.text],
      ];
    },
  }),
  parameters: storySource(bitmapTextSource),
};

export const HtmlTextDemo: Story = {
  args: {
    mode: 'inline',
    align: 'center',
  },
  argTypes: {
    mode: {
      name: '内容模式',
      description: '内联样式：每段 span 套不同颜色 / 字号；HTML 标签：粗体 / 斜体 / 下划线 + emoji。',
      options: ['inline', 'tags'],
      control: { type: 'radio' },
      labels: { inline: '内联样式', tags: 'HTML 标签' },
    },
    align: {
      name: '对齐 align',
      description: '多行对齐；HTML 标签模式含 <br/> 换行，效果更明显。',
      options: ['left', 'center', 'right'],
      control: { type: 'radio' },
      labels: { left: '左 left', center: '中 center', right: '右 right' },
    },
  },
  render: canvasStory({
    create: createHtmlTextDemo,
    apply(instance: HtmlTextDemoInstance, args: HtmlTextDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: HtmlTextDemoSnapshot) {
      return [
        ['模式', snapshot.mode],
        ['对齐 align', snapshot.align],
        ['字体 fontFamily', snapshot.fontFamily],
      ];
    },
  }),
  parameters: storySource(htmlTextSource),
};
