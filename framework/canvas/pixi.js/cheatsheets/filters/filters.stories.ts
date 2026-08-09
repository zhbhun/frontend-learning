import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import filtersSource from './filters.ts?raw';
import chainSource from './filter-chain.ts?raw';
import {
  createFilterDemo,
  type FilterDemoInstance,
  type FilterDemoSnapshot,
} from './filters';
import {
  createChainDemo,
  type ChainDemoInstance,
  type ChainDemoSnapshot,
} from './filter-chain';

interface FilterDemoArgs {
  filterType: string;
  strength: number;
  amount: number;
  noise: number;
  scale: number;
  alpha: number;
  padding: number;
}

interface ChainDemoArgs {
  order: string;
  enabledSecond: boolean;
}

const meta = {
  id: 'filters',
  title: '视觉效果/滤镜',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FilterDemo: Story = {
  args: {
    filterType: 'blur',
    strength: 8,
    amount: 0,
    noise: 0.5,
    scale: 20,
    alpha: 1,
    padding: 0,
  },
  argTypes: {
    filterType: {
      name: '滤镜类型',
      description:
        '选择要应用的内置滤镜。前三个 saturate/sepia/negative 都是 ColorMatrixFilter 的用法。',
      options: [
        'blur',
        'saturate',
        'sepia',
        'negative',
        'noise',
        'displacement',
        'alpha',
      ],
      control: { type: 'radio' },
      labels: {
        blur: 'BlurFilter 模糊',
        saturate: 'ColorMatrixFilter 饱和度',
        sepia: 'ColorMatrixFilter 棕褐',
        negative: 'ColorMatrixFilter 反色',
        noise: 'NoiseFilter 噪声',
        displacement: 'DisplacementFilter 位移',
        alpha: 'AlphaFilter 透明',
      },
    },
    strength: {
      name: '模糊强度 strength',
      description:
        'BlurFilter 的 strength（默认 8）。仅在「模糊」类型时生效。调大可见边缘溢出被裁切，padding 可恢复。',
      control: { type: 'range', min: 0, max: 20, step: 0.5 },
    },
    amount: {
      name: '饱和度 amount',
      description:
        'ColorMatrixFilter.saturate(amount) 的参数，-1 灰度 ~ 1 高饱和（默认 0）。仅在「饱和度」类型时生效。',
      control: { type: 'range', min: -1, max: 1, step: 0.1 },
    },
    noise: {
      name: '噪声量 noise',
      description:
        'NoiseFilter 的 noise（默认 0.5），接近 0 几乎无噪声、接近 1 噪声很强。仅在「噪声」类型时生效。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    scale: {
      name: '位移强度 scale',
      description:
        'DisplacementFilter 的 scale（默认 20），红通道→水平位移、绿通道→垂直位移。仅在「位移」类型时生效。',
      control: { type: 'range', min: 0, max: 80, step: 2 },
    },
    alpha: {
      name: '透明度 alpha',
      description:
        'AlphaFilter 的 alpha（默认 1），整体均匀透明，0 全透明。仅在「透明」类型时生效。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    padding: {
      name: '边距 padding',
      description:
        'Filter 共有属性（默认 0）。给处理区加边距，防止模糊、位移等溢出对象边界的部分被裁切。',
      control: { type: 'range', min: 0, max: 40, step: 2 },
    },
  },
  render: canvasStory({
    create: createFilterDemo,
    apply(instance: FilterDemoInstance, args: FilterDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: FilterDemoSnapshot) {
      return [
        ['当前滤镜', snapshot.filterType],
        ['主参数', snapshot.primaryParam],
        ['padding', snapshot.padding],
      ];
    },
  }),
  parameters: storySource(filtersSource),
};

export const ChainDemo: Story = {
  args: {
    order: 'blurThenNoise',
    enabledSecond: true,
  },
  argTypes: {
    order: {
      name: '滤镜链顺序',
      description:
        'scene.filters 数组顺序即处理顺序：前一个滤镜的输出是后一个滤镜的输入。',
      options: ['blurThenNoise', 'noiseThenBlur'],
      control: { type: 'radio' },
      labels: {
        blurThenNoise: 'blur → noise（先模糊后噪声）',
        noiseThenBlur: 'noise → blur（先噪声后模糊）',
      },
    },
    enabledSecond: {
      name: '启用第二个滤镜',
      description:
        '关闭时只剩链里第一个滤镜，作为单滤镜对照；开启后两个滤镜按顺序叠加。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createChainDemo,
    apply(instance: ChainDemoInstance, args: ChainDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: ChainDemoSnapshot) {
      return [['当前滤镜链', snapshot.chain]];
    },
  }),
  parameters: storySource(chainSource),
};
