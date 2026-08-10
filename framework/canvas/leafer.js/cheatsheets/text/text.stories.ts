import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createText,
  type TextInstance,
  type TextSnapshot,
} from './example';

interface TextArgs {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  width: number;
  fill: string;
}

const renderInteractive = canvasStory({
  create: createText,
  apply(instance: TextInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: TextSnapshot) {
    return [
      ['文本框', snapshot.boxSize],
      ['行数', snapshot.rows],
      ['内容宽', snapshot.contentW],
      ['溢出', snapshot.overflow],
    ];
  },
});

const meta = {
  id: 'text',
  title: '文本与图片/文本',
  tags: ['!dev'],
  args: {
    fontSize: 18,
    lineHeight: 1.5,
    letterSpacing: 0,
    textAlign: 'left',
    width: 360,
    fill: '#1e293b',
  },
  argTypes: {
    fontSize: {
      name: '字号 fontSize',
      description:
        '文字字号（px）。调大字号会增加行高与文本框尺寸，固定宽度下还可能增加行数。',
      control: {
        type: 'range',
        min: 10,
        max: 40,
        step: 1,
      },
    },
    lineHeight: {
      name: '行高 lineHeight',
      description:
        '行高倍数（percent）。1.5 表示 1.5 倍字号；调大主要增加文本框高度，不改变行数。',
      control: {
        type: 'range',
        min: 1,
        max: 2.4,
        step: 0.1,
      },
    },
    letterSpacing: {
      name: '字间距 letterSpacing',
      description:
        '字间距（px）。正值拉开字符、负值收紧；过大会让固定宽度下的行数变多。',
      control: {
        type: 'range',
        min: -2,
        max: 10,
        step: 0.5,
      },
    },
    textAlign: {
      name: '对齐 textAlign',
      description:
        '水平对齐。注意：仅在「文本框宽度」固定（width > 0）时才有可见差异；width=0 自动宽度时文本框贴合内容，对齐无视觉变化。',
      control: {
        type: 'select',
      },
      options: ['left', 'center', 'right'],
    },
    width: {
      name: '文本框宽度 width',
      description:
        '文本框宽度（px）。0 = 自动宽度（文本排成单行、不换行）；>0 = 固定宽度，文字按此自动换行，行数随之变化。',
      control: {
        type: 'range',
        min: 0,
        max: 560,
        step: 10,
      },
    },
    fill: {
      name: '填充色 fill',
      description: '文字填充颜色。Text 默认 fill 为 #000000（黑色）。',
      control: {
        type: 'color',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TextArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
