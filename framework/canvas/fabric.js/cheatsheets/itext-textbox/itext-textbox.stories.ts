import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createItextLesson,
  createWrapLesson,
  type ITextLessonInstance,
  type ITextLessonOptions,
  type ITextLessonSnapshot,
  type WrapLessonInstance,
  type WrapLessonOptions,
  type WrapLessonSnapshot,
} from './example';

/** 两份范例的读者输入合并；各 story 只使用自己那一组 */
interface LessonArgs extends ITextLessonOptions, WrapLessonOptions {}

const renderEditing = canvasStory({
  create: createItextLesson,
  apply(instance: ITextLessonInstance, args: LessonArgs) {
    instance.update({
      editable: args.editable,
      script: args.script,
      selectionFill: args.selectionFill,
    });
  },
  readout(snapshot: ITextLessonSnapshot) {
    return [
      ['编辑中', snapshot.editing],
      ['选区', snapshot.selection],
      ['选中文本', snapshot.selectedText],
      ['选区 fontSize', snapshot.fontSize],
      ['选区 deltaY', snapshot.deltaY],
    ];
  },
});

const renderWrapping = canvasStory({
  create: createWrapLesson,
  apply(instance: WrapLessonInstance, args: LessonArgs) {
    instance.update({
      boxWidth: args.boxWidth,
      splitByGrapheme: args.splitByGrapheme,
    });
  },
  readout(snapshot: WrapLessonSnapshot) {
    return [
      ['编辑中', snapshot.editing],
      ['行数', snapshot.lineCount],
      ['width×height', snapshot.size],
      ['最小宽下限', snapshot.minLimit],
    ];
  },
});

const meta = {
  id: 'itext-textbox',
  title: '图形与样式/文本与图片/交互文本',
  tags: ['!dev'],
  parameters: storySource(exampleSource),
} satisfies Meta<LessonArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Editing: Story = {
  args: {
    editable: true,
    script: 'none',
    selectionFill: '#0f172a',
  },
  argTypes: {
    editable: {
      name: '允许编辑',
      description:
        '对应 IText.editable（默认 true）。关闭后双击与单击都不再进入编辑态；若正在编辑会先 exitEditing。',
      control: { type: 'boolean' },
    },
    script: {
      name: '选区上下标',
      description:
        '切换时把 setSuperscript / setSubscript（或恢复默认 fontSize 与 deltaY）应用于当前选区；无选区时先 selectAll。换算：fontSize × 0.6，deltaY = fontSize × -0.35（上标）/ +0.11（下标）。',
      control: {
        type: 'inline-radio',
        labels: { none: '标准', superscript: '上标', subscript: '下标' },
      },
      options: ['none', 'superscript', 'subscript'],
    },
    selectionFill: {
      name: '选区填充色',
      description:
        '编辑态无参 setSelectionStyles({ fill }) 应用于当前选区；无选区时先 selectAll。',
      control: { type: 'color' },
    },
  },
  render: renderEditing,
};

export const Wrapping: Story = {
  args: {
    boxWidth: 620,
    splitByGrapheme: false,
  },
  argTypes: {
    boxWidth: {
      name: '文本框宽度',
      description:
        'set(\'width\', v)：width 在 Textbox.textLayoutProperties 里，set 自动重排换行并重算高度。中文长句在默认模式下整句算一个词，width 会被 dynamicMinWidth 顶住。',
      control: {
        type: 'range',
        min: 120,
        max: 620,
        step: 10,
      },
    },
    splitByGrapheme: {
      name: '按字素换行',
      description:
        '对应 Textbox.splitByGrapheme（默认 false）。开启后按字素逐字断行，适合中文；该属性不在 textLayoutProperties 里，set 后需要手动 initDimensions() 重排。',
      control: { type: 'boolean' },
    },
  },
  render: renderWrapping,
};
