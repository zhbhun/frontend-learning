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
  /** 文本框宽：缩小会触发换行。 */
  width: number;
  /** 文本框高：缩小到容不下内容时配合 ellipsis 截断。 */
  height: number;
  fontSize: number;
  wrap: 'none' | 'word' | 'char';
  ellipsis: boolean;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

const renderInteractive = canvasStory({
  create: createText,
  apply(instance: TextInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: TextSnapshot) {
    return [
      ['最长行宽 getTextWidth()', `${snapshot.textWidth.toFixed(0)} px`],
      ['完整一行宽 measureSize()', `${snapshot.fullTextWidth.toFixed(0)} px`],
      ['框宽 width()', `${snapshot.boxWidth.toFixed(0)} px`],
      ['行数', snapshot.lines],
    ];
  },
});

const meta = {
  id: 'text',
  title: '形状与样式/形状/文本',
  tags: ['!dev'],
  args: {
    width: 320,
    height: 200,
    fontSize: 22,
    wrap: 'word',
    ellipsis: false,
    align: 'left',
    verticalAlign: 'top',
  },
  argTypes: {
    width: {
      name: '框宽 width',
      description:
        '文本框宽（含 padding）。固定后文字按 wrap 规则换行 / 截断。',
      control: { type: 'range', min: 120, max: 460, step: 4 },
    },
    height: {
      name: '框高 height',
      description:
        '文本框高（含 padding）。固定后，内容超出时配合 ellipsis 触发截断。',
      control: { type: 'range', min: 48, max: 320, step: 4 },
    },
    fontSize: {
      name: '字号 fontSize',
      control: { type: 'range', min: 12, max: 40, step: 1 },
    },
    wrap: {
      name: '换行 wrap',
      description:
        "none=不换行（单行截断，超出部分丢弃）；word=按词换行（默认）；char=按字符换行。",
      options: ['none', 'word', 'char'],
      control: { type: 'inline-radio' },
    },
    ellipsis: {
      name: '省略号 ellipsis',
      description: '内容超出框时在末行加「…」，需同时固定 width 与 height。',
      control: { type: 'boolean' },
    },
    align: {
      name: '水平对齐 align',
      options: ['left', 'center', 'right'],
      control: { type: 'inline-radio' },
    },
    verticalAlign: {
      name: '垂直对齐 verticalAlign',
      description: '框高大于内容时，文字停在顶部 / 中部 / 底部。',
      options: ['top', 'middle', 'bottom'],
      control: { type: 'inline-radio' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TextArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
