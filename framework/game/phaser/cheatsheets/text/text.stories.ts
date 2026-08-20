import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import textStyleLabSource from './text-style-lab.ts?raw';
import textVsBitmapSource from './text-vs-bitmap.ts?raw';
import {
  createTextStyleLab,
  type TextStyleLabInstance,
  type TextStyleParams,
  type TextStyleLabSnapshot,
} from './text-style-lab';
import {
  createTextVsBitmap,
  type TextVsBitmapInstance,
  type TextVsBitmapParams,
  type TextVsBitmapSnapshot,
} from './text-vs-bitmap';

interface TextArgs extends TextStyleParams, TextVsBitmapParams {}

const renderStyleLab = canvasStory({
  create: createTextStyleLab,
  apply(instance: TextStyleLabInstance, args: TextArgs) {
    instance.applyStyle({
      fontSize: args.fontSize,
      color: args.color,
      strokeThickness: args.strokeThickness,
      shadow: args.shadow,
      align: args.align,
      wordWrapWidth: args.wordWrapWidth,
      advancedWrap: args.advancedWrap,
      maxLines: args.maxLines,
      resolution: args.resolution,
    });
  },
  readout(snapshot: TextStyleLabSnapshot) {
    return [
      ['文本内容', snapshot.content],
      ['style.fontSize', snapshot.fontSize],
      ['width × height', snapshot.size],
      ['行数', snapshot.lines],
      ['行高', snapshot.lineHeight],
      ['内部画布', snapshot.canvas],
      ['resolution', snapshot.resolution],
      ['重栅格化计数', snapshot.rasterCount],
      ['本次调节', snapshot.rasterDelta],
    ];
  },
  captions: ['红框 = text.width × text.height(含 padding 与描边)'],
});

const renderTextVsBitmap = canvasStory({
  create: createTextVsBitmap,
  apply(instance: TextVsBitmapInstance, args: TextArgs) {
    instance.apply({
      content: args.content,
      fontSize: args.fontSize,
      letterSpacing: args.letterSpacing,
    });
  },
  readout(snapshot: TextVsBitmapSnapshot) {
    return [
      ['当前内容', snapshot.content],
      ['Text width × height', snapshot.textSize],
      ['BitmapText width × height', snapshot.bitmapSize],
      ['位图字号缩放', snapshot.bitmapScale],
      ['位图字体缺失字形', snapshot.missingGlyphs],
      ['Text 重栅格化', snapshot.textRaster],
      ['BitmapText 重栅格化', snapshot.bitmapRaster],
    ];
  },
  captions: ['红框 = Text 尺寸,蓝框 = BitmapText 尺寸'],
});

const meta: Meta<TextArgs> = {
  id: 'text',
  title: '资源与显示/文本',
  tags: ['!dev'],
  // 默认 render,同时为两个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderStyleLab,
};

export default meta;

type Story = StoryObj<TextArgs>;

export const TextStyleLab: Story = {
  args: {
    fontSize: 24,
    color: '#e2e8f0',
    strokeThickness: 0,
    shadow: false,
    align: 'left',
    wordWrapWidth: 0,
    advancedWrap: false,
    maxLines: 0,
    resolution: 1,
  },
  argTypes: {
    fontSize: {
      name: '字号',
      description: 'setFontSize(px):canvas 按新字号重新测量并重画。',
      control: { type: 'range', min: 8, max: 48, step: 4 },
    },
    color: {
      name: '颜色',
      description: 'setColor:CSS 颜色字符串,也支持 CanvasGradient / CanvasPattern。',
      control: { type: 'color' },
    },
    strokeThickness: {
      name: '描边厚度',
      description: 'setStroke(color, thickness):0 关闭;描边同时加高每一行的行高。',
      control: { type: 'range', min: 0, max: 12, step: 2 },
    },
    shadow: {
      name: '阴影',
      description: 'setShadow(0, 4, rgba, blur, false, true):关闭时全部参数归零。',
      control: { type: 'boolean' },
    },
    align: {
      name: '对齐',
      description: 'setAlign:多行文本各行的对齐方式,相对最宽行(或 fixedWidth)。',
      control: { type: 'radio' },
      options: ['left', 'center', 'right'],
      labels: { left: '左对齐', center: '居中', right: '右对齐' },
    },
    wordWrapWidth: {
      name: '换行宽度',
      description: 'setWordWrapWidth:0 表示关闭(传 null);开起后超宽的行自动折行。',
      control: { type: 'range', min: 0, max: 480, step: 40 },
    },
    advancedWrap: {
      name: '高级换行',
      description: 'useAdvancedWrap:基础换行只按空格断词,高级换行会拆开超宽长词。',
      control: { type: 'boolean' },
    },
    maxLines: {
      name: '最大行数',
      description: 'setMaxLines:0 表示不限制;超出部分直接不绘制。',
      control: { type: 'range', min: 0, max: 4, step: 1 },
    },
    resolution: {
      name: '分辨率',
      description: 'setResolution:内部画布尺寸 = 对象尺寸 × resolution,高 DPI 下更清晰。',
      control: { type: 'range', min: 1, max: 3, step: 1 },
    },
  },
  parameters: storySource(textStyleLabSource),
  render: renderStyleLab,
};

export const TextVsBitmap: Story = {
  args: {
    content: 'score',
    fontSize: 32,
    letterSpacing: 0,
  },
  argTypes: {
    content: {
      name: '内容',
      description:
        "同一段文字写入两个对象;字体 'arcade' 只含空格、% + - . : 、数字与大写字母。",
      control: { type: 'radio' },
      options: ['score', 'gameover', 'lowercase', 'chinese'],
      labels: {
        score: 'SCORE 1024(全命中)',
        gameover: 'GAME OVER +100%(全命中)',
        lowercase: 'score 1024 small(小写缺失)',
        chinese: '得分:1024(中文缺失)',
      },
    },
    fontSize: {
      name: '字号',
      description:
        'Text 用 setFontSize 重画;BitmapText 用 setFontSize 缩放字形(基准 16)。',
      control: { type: 'range', min: 8, max: 48, step: 8 },
    },
    letterSpacing: {
      name: '字间距',
      description: '两个对象都有 setLetterSpacing:正值加宽,负值收紧。',
      control: { type: 'range', min: -2, max: 8, step: 2 },
    },
  },
  parameters: storySource(textVsBitmapSource),
  render: renderTextVsBitmap,
};
