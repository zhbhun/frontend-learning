import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAlignSpacing,
  createMeasureReadout,
  createStyleSpans,
  createTextBasics,
  createWrapContrast,
  type AlignSpacingInstance,
  type AlignSpacingOptions,
  type AlignSpacingSnapshot,
  type MeasureReadoutInstance,
  type MeasureReadoutOptions,
  type MeasureReadoutSnapshot,
  type StyleSpansInstance,
  type StyleSpansOptions,
  type StyleSpansSnapshot,
  type TextBasicsInstance,
  type TextBasicsOptions,
  type TextBasicsSnapshot,
  type WrapContrastInstance,
  type WrapContrastOptions,
  type WrapContrastSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface TextArgs
  extends TextBasicsOptions,
    AlignSpacingOptions,
    WrapContrastOptions,
    StyleSpansOptions,
    MeasureReadoutOptions {}

const FONT_OPTIONS = ['Times New Roman', 'Arial', 'Courier New', 'Georgia'];

const renderTextBasics = canvasStory({
  create: createTextBasics,
  apply(instance: TextBasicsInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: TextBasicsSnapshot) {
    return [
      ['width×height（派生）', snapshot.size],
      ['textLines 行数', snapshot.lineCount],
      ['行高基准 = fontSize×1.13', snapshot.singleLineHeight],
    ];
  },
});

const renderAlignSpacing = canvasStory({
  create: createAlignSpacing,
  apply(instance: AlignSpacingInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: AlignSpacingSnapshot) {
    return [
      ['textAlign', snapshot.textAlign],
      ['width×height', snapshot.size],
      ['height 公式', snapshot.heightFormula],
      ['首行宽 / 末行宽', snapshot.lineWidths],
    ];
  },
});

const renderWrapContrast = canvasStory({
  create: createWrapContrast,
  apply(instance: WrapContrastInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: WrapContrastSnapshot) {
    return [
      ['FabricText 行数', snapshot.plainLines],
      ['FabricText width', snapshot.plainWidth],
      ['Textbox 行数', snapshot.boxLines],
      ['Textbox height', snapshot.boxHeight],
    ];
  },
});

const renderStyleSpans = canvasStory({
  create: createStyleSpans,
  apply(instance: StyleSpansInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: StyleSpansSnapshot) {
    return [
      ['分片区间（toObject 序列化）', snapshot.spans],
      ['对象级 fill', snapshot.objectFill],
      ['分片处生效 fill', snapshot.overrideFill],
      ['width×height', snapshot.size],
    ];
  },
});

const renderMeasureReadout = canvasStory({
  create: createMeasureReadout,
  apply(instance: MeasureReadoutInstance, args: TextArgs) {
    instance.update(args);
  },
  readout(snapshot: MeasureReadoutSnapshot) {
    return [
      ['obj.width', snapshot.width],
      ['calcTextWidth()', snapshot.calcTextWidth],
      ['getLineWidth(0)', snapshot.lineWidth],
      ['measureLine(0).width', snapshot.measureLine],
      ['obj.height', snapshot.height],
      ['getHeightOfLine(0)', snapshot.heightOfLine],
    ];
  },
});

const meta = {
  id: 'text',
  title: '图形与样式/文本与图片/文本',
  tags: ['!dev'],
  render: renderTextBasics,
  parameters: storySource(exampleSource),
} satisfies Meta<TextArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextBasics: Story = {
  args: {
    textPreset: 'single',
    fontFamily: 'Times New Roman',
    fontSize: 40,
    fontWeight: 'normal',
    fontStyle: 'normal',
  },
  argTypes: {
    textPreset: {
      name: '文本预设',
      description: '切换文字内容：手动换行预设含 \\n，行数随之变化。',
      control: { type: 'inline-radio' },
      options: ['single', 'manual'],
      labels: { single: '单行', manual: '手动换行（\\n）' },
    },
    fontFamily: {
      name: 'fontFamily 字体',
      description:
        "默认 'Times New Roman'。是布局属性：set 后自动重新测量并派生 width/height。",
      control: { type: 'inline-radio' },
      options: FONT_OPTIONS,
      labels: {
        'Times New Roman': 'Times New Roman（默认）',
        Arial: 'Arial',
        'Courier New': 'Courier New',
        Georgia: 'Georgia',
      },
    },
    fontSize: {
      name: 'fontSize 字号',
      description: '默认 40（px）。改变后 width/height 与单行行高读数同步重算。',
      control: { type: 'range', min: 16, max: 72, step: 2 },
    },
    fontWeight: {
      name: 'fontWeight 字重',
      description:
        "默认 'normal'。可传 'bold' 或数值（如 '600'），实际效果取决于字体包含的字重。",
      control: { type: 'inline-radio' },
      options: ['normal', 'bold', '600'],
      labels: { normal: "'normal'", bold: "'bold'", '600': "'600'" },
    },
    fontStyle: {
      name: 'fontStyle 字体样式',
      description: "默认 'normal'，可选 'italic' / 'oblique'。",
      control: { type: 'inline-radio' },
      options: ['normal', 'italic'],
      labels: { normal: "'normal'", italic: "'italic'" },
    },
  },
};

export const AlignSpacing: Story = {
  render: renderAlignSpacing,
  args: { alignTextAlign: 'left', alignLineHeight: 1.16, alignCharSpacing: 0 },
  argTypes: {
    alignTextAlign: {
      name: 'textAlign 对齐',
      description:
        "默认 'left'。虚线框是包围盒：center/right 让短行在框内换位，justify 拉伸行内空格铺满宽度。",
      control: { type: 'inline-radio' },
      options: ['left', 'center', 'right', 'justify'],
      labels: {
        left: "'left'",
        center: "'center'",
        right: "'right'",
        justify: "'justify'",
      },
    },
    alignLineHeight: {
      name: 'lineHeight 行高',
      description:
        '默认 1.16。行高倍率进入 height 公式：非末行 ×lineHeight，末行不乘。',
      control: { type: 'range', min: 0.8, max: 2, step: 0.02 },
    },
    alignCharSpacing: {
      name: 'charSpacing 字距',
      description:
        '默认 0，单位 1/1000 em：1000 相当于一个字号宽，负值收紧。行宽随字数增加。',
      control: { type: 'range', min: -200, max: 800, step: 50 },
    },
  },
};

export const WrapContrast: Story = {
  render: renderWrapContrast,
  args: { wrapPreset: 'long', wrapWidth: 320 },
  argTypes: {
    wrapPreset: {
      name: '文本预设',
      description: '长文本预设让两类对象的换行差异最直观。',
      control: { type: 'inline-radio' },
      options: ['short', 'long'],
      labels: { short: '短句', long: '长句' },
    },
    wrapWidth: {
      name: '换行宽度',
      description:
        '只对 Textbox 是布局输入：宽度变小时它按词重排、行数增加；FabricText 不受影响、始终一行拉通。',
      control: { type: 'range', min: 160, max: 520, step: 10 },
    },
  },
};

export const StyleSpans: Story = {
  render: renderStyleSpans,
  args: { spanPreset: 'keyword' },
  argTypes: {
    spanPreset: {
      name: '分片预设',
      description:
        'styles 按“行/字素”索引覆盖：放大预设证明分片 fontSize 参与测量（width 读数变化）。',
      control: { type: 'inline-radio' },
      options: ['none', 'keyword', 'enlarge', 'combo'],
      labels: {
        none: '无分片',
        keyword: '关键字标红加粗',
        enlarge: '分片放大（参与测量）',
        combo: '组合（下划线+背景）',
      },
    },
  },
};

export const MeasureReadout: Story = {
  render: renderMeasureReadout,
  args: { fontFamily: 'Times New Roman', fontSize: 40 },
  argTypes: {
    fontFamily: {
      name: 'fontFamily 字体',
      description:
        '换字体族后四个宽度入口同步变化且保持同值——它们都来自同一套逐字符测量。',
      control: { type: 'inline-radio' },
      options: FONT_OPTIONS,
      labels: {
        'Times New Roman': 'Times New Roman（默认）',
        Arial: 'Arial',
        'Courier New': 'Courier New',
        Georgia: 'Georgia',
      },
    },
    fontSize: {
      name: 'fontSize 字号',
      description: '默认 40。height 读数应等于 fontSize×1.13（单行、不含 lineHeight）。',
      control: { type: 'range', min: 16, max: 96, step: 2 },
    },
  },
};
