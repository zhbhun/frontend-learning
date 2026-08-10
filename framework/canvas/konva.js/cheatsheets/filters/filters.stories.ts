import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFilterDemo,
  createCombineDemo,
  FILTER_NAMES,
  type FilterInstance,
  type FilterSnapshot,
  type CombineInstance,
  type CombineSnapshot,
} from './example';

interface FilterArgs {
  filter: string;
  intensity: number;
}

interface CombineArgs {
  blurRadius: number;
  brightness: number;
  contrast: number;
}

const renderFilter = canvasStory({
  create: createFilterDemo,
  apply(instance: FilterInstance, args: FilterArgs) {
    instance.update(args);
  },
  readout(snapshot: FilterSnapshot) {
    return [
      ['滤镜', snapshot.filter],
      ['参数', snapshot.param],
      ['缓存次数', snapshot.cacheCount],
    ];
  },
});

const renderCombine = canvasStory({
  create: createCombineDemo,
  apply(instance: CombineInstance, args: CombineArgs) {
    instance.update(args);
  },
  readout(snapshot: CombineSnapshot) {
    return [
      ['滤镜链', snapshot.chain],
      ['blurRadius', snapshot.blurRadius],
      ['brightness', snapshot.brightness.toFixed(2)],
      ['contrast', snapshot.contrast],
    ];
  },
});

const meta = {
  id: 'filters',
  title: '性能与滤镜/滤镜',
  tags: ['!dev'],
  parameters: storySource(exampleSource),
} satisfies Meta;

export default meta;

/**
 * 单滤镜探索：在多彩场景上切换 9 种内置滤镜，用「强度」滑块调节参数。
 * 读数「缓存次数」始终为 1——改滤镜或调参不会重新 cache。
 */
export const FilterDemo: StoryObj<FilterArgs> = {
  args: {
    filter: 'Blur',
    intensity: 0.5,
  },
  argTypes: {
    filter: {
      name: '滤镜',
      description:
        '取自 Konva.Filters 的 9 种代表性滤镜。Blur/Pixelate 改变结构，Brighten/Contrast 调颜色，Grayscale/Invert/Sepia 做风格化。',
      control: { type: 'select' },
      options: [...FILTER_NAMES],
    },
    intensity: {
      name: '强度',
      description:
        '0–1 的归一化强度，映射到各滤镜的实际参数范围（如 Blur 映射到 blurRadius 0–40）。Grayscale/Invert/Sepia 无参数，此项不生效。',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
  },
  render: renderFilter,
};

/**
 * 组合滤镜：同一场景同时叠加 Blur + Brighten + Contrast，
 * 三个滤镜按数组顺序链式处理。
 */
export const CombineDemo: StoryObj<CombineArgs> = {
  args: {
    blurRadius: 6,
    brightness: 0.15,
    contrast: 25,
  },
  argTypes: {
    blurRadius: {
      name: 'blurRadius',
      description: 'Blur 滤镜的模糊半径，0–40。',
      control: { type: 'range', min: 0, max: 40, step: 1 },
    },
    brightness: {
      name: 'brightness',
      description: 'Brighten 滤镜的亮度，-1–1；正值增亮，负值变暗。',
      control: { type: 'range', min: -1, max: 1, step: 0.05 },
    },
    contrast: {
      name: 'contrast',
      description: 'Contrast 滤镜的对比度，-100–100。',
      control: { type: 'range', min: -100, max: 100, step: 1 },
    },
  },
  render: renderCombine,
};
