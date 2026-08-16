import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGradientLab,
  createPatternLab,
  type GradientLabInstance,
  type GradientLabOptions,
  type GradientLabSnapshot,
  type PatternLabInstance,
  type PatternLabOptions,
  type PatternLabSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface GradientsPatternsArgs
  extends GradientLabOptions,
    PatternLabOptions {}

const renderGradientLab = canvasStory({
  create: createGradientLab,
  apply(instance: GradientLabInstance, args: GradientsPatternsArgs) {
    instance.update({
      gradientType: args.gradientType,
      gradientAngle: args.gradientAngle,
      stopOffset: args.stopOffset,
      radialR1: args.radialR1,
      focalShift: args.focalShift,
      objectAngle: args.objectAngle,
      mutateInPlace: args.mutateInPlace,
      markDirty: args.markDirty,
    });
  },
  readout(snapshot: GradientLabSnapshot) {
    return [
      ['fill 类型', snapshot.fillTypeLabel],
      ['实例 id', snapshot.gradientId],
      ['coords（对象局部坐标）', snapshot.coordsLabel],
      ['色标 offset', snapshot.stopsLabel],
      ['更新方式', snapshot.updateModeLabel],
      ['缓存位图重画', snapshot.cacheRepaints],
      ['矩形 / 圆共用', snapshot.sharedLabel],
      ['toObject().type', snapshot.serializedTypeLabel],
    ];
  },
});

const renderPatternLab = canvasStory({
  create: createPatternLab,
  apply(instance: PatternLabInstance, args: GradientsPatternsArgs) {
    instance.update({
      repeatMode: args.repeatMode,
      tileSize: args.tileSize,
      patternOffsetX: args.patternOffsetX,
      patternOffsetY: args.patternOffsetY,
      patternRotate: args.patternRotate,
      objectAngle: args.objectAngle,
    });
  },
  readout(snapshot: PatternLabSnapshot) {
    return [
      ['fill 类型', snapshot.fillTypeLabel],
      ['repeat', snapshot.repeatLabel],
      ['source 形态', snapshot.sourceKindLabel],
      ['tile 尺寸', snapshot.tileSizeLabel],
      ['offsetX / offsetY', snapshot.offsetLabel],
      ['patternTransform', snapshot.transformLabel],
      ['序列化 source', snapshot.serializedSourceLabel],
    ];
  },
});

const meta = {
  id: 'gradients-patterns',
  title: '图形与样式/样式/渐变与图案',
  tags: ['!dev'],
  render: renderGradientLab,
  parameters: storySource(exampleSource),
} satisfies Meta<GradientsPatternsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GradientLab: Story = {
  args: {
    gradientType: 'linear',
    gradientAngle: 0,
    stopOffset: 0.5,
    radialR1: 0,
    focalShift: 0,
    objectAngle: 0,
    mutateInPlace: false,
    markDirty: false,
  },
  argTypes: {
    gradientType: {
      name: '渐变类型',
      description:
        "Gradient 的 type：'linear' 沿一条轴渐变；'radial' 在两圆之间渐变。切换即换 coords 形状。",
      control: {
        type: 'inline-radio',
        labels: { linear: 'linear 线性', radial: 'radial 径向' },
      },
      options: ['linear', 'radial'],
    },
    gradientAngle: {
      name: '线性轴角度',
      description:
        'linear 专用：端点取过对象中心、按该角度横贯 280×160 矩形的直径两端（coords 单位是对象自身像素）。',
      control: { type: 'range', min: 0, max: 360, step: 15 },
    },
    stopOffset: {
      name: '中间色标 offset',
      description:
        'colorStops 三档色标的中间档位置：0 在轴起点，1 在轴终点（径向为内圆到外圆）。',
      control: { type: 'range', min: 0.05, max: 0.95, step: 0.05 },
    },
    radialR1: {
      name: '径向内圆 r1',
      description:
        'radial 专用：内圆（offset 0）半径，外圆 r2 固定 160；r1 为 0 时中心是纯色点光。',
      control: { type: 'range', min: 0, max: 120, step: 4 },
    },
    focalShift: {
      name: '径向焦点偏移',
      description:
        'radial 专用：内圆圆心相对外圆圆心的水平偏移（×120px），两圆偏心形成"侧光"。',
      control: { type: 'range', min: -1, max: 1, step: 0.1 },
    },
    objectAngle: {
      name: '对象旋转',
      description:
        'rect.angle：渐变画在对象自己的坐标系里（贴花），旋转对象时渐变跟着一起转。',
      control: { type: 'range', min: 0, max: 180, step: 15 },
    },
    mutateInPlace: {
      name: '就地修改',
      description:
        '开启后不再换新实例，而是原地改 type/coords/colorStops——fill 引用不变，set 缺席，缓存位图不重画。',
      control: { type: 'boolean' },
    },
    markDirty: {
      name: '手动置 dirty',
      description:
        "配合「就地修改」：set('dirty', true) 强制下一帧重画缓存位图，画面追上实例状态。",
      control: { type: 'boolean' },
    },
  },
};

export const PatternLab: Story = {
  render: renderPatternLab,
  args: {
    repeatMode: 'repeat',
    tileSize: 48,
    patternOffsetX: 0,
    patternOffsetY: 0,
    patternRotate: 0,
    objectAngle: 0,
  },
  argTypes: {
    repeatMode: {
      name: '平铺模式',
      description:
        "Pattern 的 repeat，语义同 CSS background-repeat：repeat 双向 / repeat-x 只横向 / repeat-y 只纵向 / no-repeat 只一块。",
      control: {
        type: 'inline-radio',
        labels: {
          repeat: 'repeat',
          'repeat-x': 'repeat-x',
          'repeat-y': 'repeat-y',
          'no-repeat': 'no-repeat',
        },
      },
      options: ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'],
    },
    tileSize: {
      name: 'tile 尺寸',
      description: '离屏 canvas 源的边长：tile 越小重复越密（source 换成新的 canvas 元素）。',
      control: { type: 'inline-radio' },
      options: [24, 36, 48],
      labels: { 24: '24px', 36: '36px', 48: '48px' },
    },
    patternOffsetX: {
      name: 'offsetX',
      description: '平铺锚点相对对象自身左上角的水平偏移，正值向右。',
      control: { type: 'range', min: -48, max: 48, step: 6 },
    },
    patternOffsetY: {
      name: 'offsetY',
      description: '平铺锚点相对对象自身左上角的垂直偏移，正值向下。',
      control: { type: 'range', min: -48, max: 48, step: 6 },
    },
    patternRotate: {
      name: 'patternTransform 旋转',
      description: '把 patternTransform 设为旋转矩阵（绕对象左上角锚点转 tile）；0 表示不设置该矩阵。',
      control: { type: 'range', min: 0, max: 90, step: 15 },
    },
    objectAngle: {
      name: '对象旋转',
      description:
        'rect.angle：平铺画在对象自己的坐标系里（贴花），旋转对象时图案跟着一起转。',
      control: { type: 'range', min: 0, max: 90, step: 15 },
    },
  },
};
