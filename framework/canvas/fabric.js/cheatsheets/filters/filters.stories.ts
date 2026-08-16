import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFilterBench,
  createResizeDemo,
  type FilterBenchInstance,
  type FilterBenchOptions,
  type FilterBenchSnapshot,
  type ResizeDemoInstance,
  type ResizeDemoOptions,
  type ResizeDemoSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface FiltersArgs
  extends FilterBenchOptions,
    ResizeDemoOptions {}

const renderFilterBench = canvasStory({
  create: createFilterBench,
  apply(instance: FilterBenchInstance, args: FiltersArgs) {
    instance.update(args);
  },
  readout(snapshot: FilterBenchSnapshot) {
    return [
      ['生效滤镜链', snapshot.filterList],
      ['被跳过（中性）', snapshot.neutralSkipped],
      ['滤镜后端', snapshot.backend],
      ['渲染元素', snapshot.elementState],
    ];
  },
});

const renderResizeDemo = canvasStory({
  create: createResizeDemo,
  apply(instance: ResizeDemoInstance, args: FiltersArgs) {
    instance.update(args);
  },
  readout(snapshot: ResizeDemoSnapshot) {
    return [
      ['scaleX / scaleY', snapshot.scale],
      ['resizeFilter', snapshot.resizeState],
      ['元素缩放比', snapshot.filterScale],
      ['显示尺寸', snapshot.displaySize],
    ];
  },
});

const meta = {
  id: 'filters',
  title: '滤镜与动画/滤镜',
  tags: ['!dev'],
  render: renderFilterBench,
  parameters: storySource(exampleSource),
} satisfies Meta<FiltersArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FilterBench: Story = {
  args: { filterKind: 'blur', intensity: 40, stackGrayscale: false },
  argTypes: {
    filterKind: {
      name: '滤镜选择',
      description:
        '内置滤镜的代表性抽样 + Composed 组合（官方 duotone 套路）+ 自定义 SwapColor。切换后读数「生效滤镜链」给出实例与参数快照。',
      control: { type: 'select' },
      options: [
        'none',
        'brightness',
        'contrast',
        'saturation',
        'vibrance',
        'hueRotation',
        'blur',
        'noise',
        'pixelate',
        'removeColor',
        'sepia',
        'vintage',
        'duotone',
        'swapColor',
      ],
      labels: {
        none: '无滤镜（空数组）',
        brightness: 'Brightness 亮度',
        contrast: 'Contrast 对比度',
        saturation: 'Saturation 饱和度',
        vibrance: 'Vibrance 自然饱和度',
        hueRotation: 'HueRotation 色相旋转',
        blur: 'Blur 模糊',
        noise: 'Noise 噪点',
        pixelate: 'Pixelate 像素化',
        removeColor: 'RemoveColor 去色（白）',
        sepia: 'Sepia 胶片预设',
        vintage: 'Vintage 胶片预设',
        duotone: 'Composed 双色调（组合）',
        swapColor: 'SwapColor 换色（自定义）',
      },
    },
    intensity: {
      name: '滤镜强度',
      description:
        '0-100 统一映射到各滤镜的真实量纲：色调类为 -1..1（50 = 0 = 默认值 = 中性态），blur 为 0..1，noise 为 0..600，blocksize 为 1..40，distance 为 0..1。预设 / 组合 / 自定义滤镜不使用强度。',
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    stackGrayscale: {
      name: '追加 Grayscale（组合）',
      description:
        '在所选滤镜之后追加一个 Grayscale 实例：filters 数组就是管线，多个实例按顺序链式生效。',
      control: { type: 'boolean' },
    },
  },
};

export const ResizeQuality: Story = {
  render: renderResizeDemo,
  args: { displayScale: 0.3, resizeMode: 'lanczos' },
  argTypes: {
    displayScale: {
      name: '显示倍率',
      description:
        'scaleX / scaleY。低于 minimumScaleTrigger（0.5）时 resizeFilter 才触发；高于 0.5 时直接按倍率绘制源图。',
      control: { type: 'range', min: 0.1, max: 1, step: 0.05 },
    },
    resizeMode: {
      name: 'resizeFilter',
      description:
        'off 移除滤镜；其余为 Canvas 2D 后端的 resizeType（WebGL 后端一律走 lanczos）。观察细网格在 0.2 倍下关 / 开的差异。',
      control: { type: 'inline-radio' },
      options: ['off', 'lanczos', 'bilinear', 'hermite'],
      labels: {
        off: 'off（关闭）',
        lanczos: 'lanczos',
        bilinear: 'bilinear',
        hermite: 'hermite',
      },
    },
  },
};
