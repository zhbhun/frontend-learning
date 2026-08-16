import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAnchorPivot,
  createCoordsCache,
  createFlipMatrix,
  createScaleSkew,
  type AnchorPivotInstance,
  type AnchorPivotOptions,
  type AnchorPivotSnapshot,
  type CoordsCacheInstance,
  type CoordsCacheOptions,
  type CoordsCacheSnapshot,
  type FlipMatrixInstance,
  type FlipMatrixOptions,
  type FlipMatrixSnapshot,
  type ScaleSkewInstance,
  type ScaleSkewOptions,
  type ScaleSkewSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface TransformArgs
  extends AnchorPivotOptions,
    ScaleSkewOptions,
    FlipMatrixOptions,
    CoordsCacheOptions {}

const renderAnchorPivot = canvasStory({
  create: createAnchorPivot,
  apply(instance: AnchorPivotInstance, args: TransformArgs) {
    instance.update(args);
  },
  readout(snapshot: AnchorPivotSnapshot) {
    return [
      ['originX / originY', snapshot.origin],
      ['设置方式', snapshot.mode],
      ['left / top', snapshot.leftTop],
      ['锚点画布坐标', snapshot.anchorPoint],
      ['中心点', snapshot.centerPoint],
    ];
  },
});

const renderScaleSkew = canvasStory({
  create: createScaleSkew,
  apply(instance: ScaleSkewInstance, args: TransformArgs) {
    instance.update(args);
  },
  readout(snapshot: ScaleSkewSnapshot) {
    return [
      ['width×height', snapshot.size],
      ['scaleX / scaleY', snapshot.scale],
      ['getScaledWidth×Height', snapshot.scaledSize],
      ['包围盒 left, top → w×h', snapshot.boundingBox],
    ];
  },
});

const renderFlipMatrix = canvasStory({
  create: createFlipMatrix,
  apply(instance: FlipMatrixInstance, args: TransformArgs) {
    instance.update(args);
  },
  readout(snapshot: FlipMatrixSnapshot) {
    return [
      ['镜像方式', snapshot.mirrorMode],
      ['calcOwnMatrix()', snapshot.ownMatrix],
      ['calcTransformMatrix()', snapshot.fullMatrix],
      ['qrDecompose 分解', snapshot.decompose],
    ];
  },
});

const renderCoordsCache = canvasStory({
  create: createCoordsCache,
  apply(instance: CoordsCacheInstance, args: TransformArgs) {
    instance.update(args);
  },
  readout(snapshot: CoordsCacheSnapshot) {
    return [
      ['getBoundingRect().left', snapshot.bboxLeft],
      ['包围盒 w×h', snapshot.bboxSize],
      ['containsPoint(330, 180)', snapshot.containsProbe ? 'true' : 'false'],
      ['aCoords.tl.x', snapshot.aCoordsTlX],
    ];
  },
});

const meta = {
  id: 'transform',
  title: '变换与组织/变换',
  tags: ['!dev'],
  render: renderAnchorPivot,
  parameters: storySource(exampleSource),
} satisfies Meta<TransformArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AnchorPivot: Story = {
  args: {
    pivotOriginX: 'center',
    pivotOriginY: 'center',
    pivotAngle: 30,
    pivotMode: 'set',
  },
  argTypes: {
    pivotOriginX: {
      name: 'originX',
      description:
        "锚点的水平语义（取值还有 'right'）。v7 默认 'center'；切到 'left' 后 left 指对象左边缘。",
      control: { type: 'inline-radio' },
      options: ['center', 'left'],
      labels: { center: "'center'", left: "'left'" },
    },
    pivotOriginY: {
      name: 'originY',
      description: "锚点的垂直语义（取值还有 'bottom'），与 originX 同一套解释。",
      control: { type: 'inline-radio' },
      options: ['center', 'top'],
      labels: { center: "'center'", top: "'top'" },
    },
    pivotAngle: {
      name: 'angle 角度',
      description: '旋转角，单位度。绕哪个点转由「设置方式」与 origin 共同决定。',
      control: { type: 'range', min: -180, max: 180, step: 5 },
    },
    pivotMode: {
      name: '设置方式',
      description:
        "set('angle') 绕 origin 锚点旋转；rotate() 绕对象中心旋转并改写 left/top。",
      control: { type: 'inline-radio' },
      options: ['set', 'rotate'],
      labels: { set: "set('angle')", rotate: 'rotate()' },
    },
  },
};

export const ScaleSkew: Story = {
  render: renderScaleSkew,
  args: { scaleLevel: 1, skewDeg: 0, fitWidth: 200 },
  argTypes: {
    scaleLevel: {
      name: 'scaleX',
      description:
        '水平缩放系数（默认 1）。只乘在渲染上，width/height 读数保持不变。',
      control: { type: 'range', min: 0.5, max: 2.5, step: 0.05 },
    },
    skewDeg: {
      name: 'skewX 倾斜角',
      description: '水平剪切角，单位度（默认 0）。宽度读数不动，包围盒变宽。',
      control: { type: 'range', min: -60, max: 60, step: 5 },
    },
    fitWidth: {
      name: 'scaleToWidth 目标宽',
      description:
        '变化时调用 scaleToWidth(目标)：等比缩放（scaleX = scaleY），按包围盒口径换算。',
      control: { type: 'range', min: 80, max: 320, step: 10 },
    },
  },
};

export const FlipMatrix: Story = {
  render: renderFlipMatrix,
  args: { mirrorMode: 'none' },
  argTypes: {
    mirrorMode: {
      name: '镜像方式',
      description:
        'flipX: true 与 scaleX: -1 渲染完全等价；读数区给出两个矩阵与 qrDecompose 分解结果。',
      control: { type: 'inline-radio' },
      options: ['none', 'flipX', 'negScaleX'],
      labels: { none: '无镜像', flipX: 'flipX: true', negScaleX: 'scaleX: -1' },
    },
  },
};

export const CoordsCache: Story = {
  render: renderCoordsCache,
  args: { cacheLeft: 130, cacheRefresh: true },
  argTypes: {
    cacheLeft: {
      name: 'left',
      description:
        '程序化移动对象。拖到 330 时对象中心恰好压在红色探测点上。',
      control: { type: 'range', min: 80, max: 560, step: 10 },
    },
    cacheRefresh: {
      name: '改后调 setCoords()',
      description:
        '开：set() 后刷新 aCoords 缓存；关：getBoundingRect / containsPoint 读到旧值。',
      control: { type: 'boolean' },
    },
  },
};
