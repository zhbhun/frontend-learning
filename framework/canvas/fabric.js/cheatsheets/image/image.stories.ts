import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCropWindow,
  createLoadingPaths,
  createScalingSize,
  type CropWindowInstance,
  type CropWindowOptions,
  type CropWindowSnapshot,
  type LoadingPathsInstance,
  type LoadingPathsOptions,
  type LoadingPathsSnapshot,
  type ScalingSizeInstance,
  type ScalingSizeOptions,
  type ScalingSizeSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface ImageArgs
  extends LoadingPathsOptions,
    ScalingSizeOptions,
    CropWindowOptions {}

const renderLoadingPaths = canvasStory({
  create: createLoadingPaths,
  apply(instance: LoadingPathsInstance, args: ImageArgs) {
    instance.update(args);
  },
  readout(snapshot: LoadingPathsSnapshot) {
    return [
      ['加载状态', snapshot.status],
      ['异步耗时', snapshot.elapsed],
      ['getOriginalSize()', snapshot.originalSize],
      ['width×height（窗口）', snapshot.size],
    ];
  },
});

const renderScalingSize = canvasStory({
  create: createScalingSize,
  apply(instance: ScalingSizeInstance, args: ImageArgs) {
    instance.update(args);
  },
  readout(snapshot: ScalingSizeSnapshot) {
    return [
      ['width×height（源窗口）', snapshot.windowSize],
      ['getScaledWidth()×getScaledHeight()', snapshot.displaySize],
      ['scaleX / scaleY', snapshot.scale],
      ['imageSmoothing', snapshot.smoothing],
    ];
  },
});

const renderCropWindow = canvasStory({
  create: createCropWindow,
  apply(instance: CropWindowInstance, args: ImageArgs) {
    instance.update(args);
  },
  readout(snapshot: CropWindowSnapshot) {
    return [
      ['set 四数 cropX,Y,W,H', snapshot.setValues],
      ['渲染可见窗口（钳制后）', snapshot.visibleWindow],
      ['hasCrop()', snapshot.hasCrop],
      ['显示尺寸（×0.6）', snapshot.displaySize],
    ];
  },
});

const meta = {
  id: 'image',
  title: '图形与样式/文本与图片/图片',
  tags: ['!dev'],
  render: renderLoadingPaths,
  parameters: storySource(exampleSource),
} satisfies Meta<ImageArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoadingPaths: Story = {
  args: { loadMode: 'fromURL' },
  argTypes: {
    loadMode: {
      name: '加载方式',
      description:
        'fromURL 与 setSrc 走 Promise 管线（本例用本地 dataURL，与网络 URL 同一条 loadImage 链路）；元素直接构造是同步的。',
      control: { type: 'inline-radio' },
      options: ['fromURL', 'constructor', 'setSrc'],
      labels: {
        fromURL: 'FabricImage.fromURL（异步）',
        constructor: 'new FabricImage(元素)（同步）',
        setSrc: 'setSrc 换源（异步）',
      },
    },
  },
};

export const ScalingSize: Story = {
  render: renderScalingSize,
  args: { scaleMode: 'scale', scaleFactor: 1, targetWidth: 192, smoothing: true },
  argTypes: {
    scaleMode: {
      name: '缩放入口',
      description:
        '两种入口最终改的都是 scaleX/scaleY；width/height 恒为源窗口 96×72，读数「源窗口」不变即可证。',
      control: { type: 'inline-radio' },
      options: ['scale', 'fitWidth'],
      labels: { scale: 'set scaleX/scaleY', fitWidth: 'scaleToWidth(目标宽)' },
    },
    scaleFactor: {
      name: 'scaleX/scaleY 倍率',
      description:
        '缩放入口为 set scaleX/scaleY 时生效：显示尺寸 = 源窗口 96×72 × 倍率。',
      control: { type: 'range', min: 0.5, max: 4, step: 0.1 },
    },
    targetWidth: {
      name: 'scaleToWidth 目标宽',
      description:
        '缩放入口为 scaleToWidth 时生效：按目标显示宽反推 scaleX/scaleY（改的不是窗口宽）。',
      control: { type: 'range', min: 60, max: 384, step: 4 },
    },
    smoothing: {
      name: 'imageSmoothing 平滑',
      description: '默认 true。放大到 3× 以上再关闭，像素块立刻可见。',
      control: { type: 'boolean' },
    },
  },
};

export const CropWindow: Story = {
  render: renderCropWindow,
  args: { cropX: 120, cropY: 80, cropW: 160, cropH: 120 },
  argTypes: {
    cropX: {
      name: 'cropX 横偏移',
      description:
        '窗口左上角在源图上的 x（源像素）。默认 0；与 cropY、width、height 共同决定窗口。',
      control: { type: 'range', min: 0, max: 320, step: 4 },
    },
    cropY: {
      name: 'cropY 纵偏移',
      description: '窗口左上角在源图上的 y（源像素）。默认 0。',
      control: { type: 'range', min: 0, max: 240, step: 4 },
    },
    cropW: {
      name: 'width 窗口宽',
      description:
        '窗口宽就是对象 width：小于源宽 320 即发生裁剪（hasCrop 为 true），不是把图压扁。',
      control: { type: 'range', min: 40, max: 320, step: 4 },
    },
    cropH: {
      name: 'height 窗口高',
      description: '窗口高就是对象 height；默认等于源高 240。',
      control: { type: 'range', min: 40, max: 240, step: 4 },
    },
  },
};
