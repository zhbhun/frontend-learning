import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFilterDemo,
  type FilterDemoInstance,
  type FilterDemoSnapshot,
} from './example';

interface FilterDemoArgs {
  blur: number;
  brightness: number;
  hue: number;
}

const renderInteractive = canvasStory({
  create: createFilterDemo,
  apply(instance: FilterDemoInstance, args: FilterDemoArgs) {
    instance.update(args);
  },
  readout(snapshot: FilterDemoSnapshot) {
    return [
      ['模糊 blur', snapshot.blur],
      ['亮度 brightness', snapshot.brightness],
      ['色相 hue-rotate', snapshot.hue],
      ['filter 数组', snapshot.filters],
    ];
  },
});

const meta = {
  id: 'filter',
  title: '进阶与工程/滤镜',
  tags: ['!dev'],
  args: {
    blur: 4,
    brightness: 100,
    hue: 0,
  },
  argTypes: {
    blur: {
      name: '模糊半径 blur',
      description:
        '自定义 blur 滤镜的模糊半径（px）。通过 Filter.register 注册，内部用 CSS blur() 实现；getSpread 返回该值以避免光晕被包围盒裁切。设为 0 时该滤镜被置为 visible:false 并从生效集合剔除。',
      control: {
        type: 'range',
        min: 0,
        max: 20,
        step: 0.5,
      },
    },
    brightness: {
      name: '亮度 brightness',
      description:
        '自定义 brightness 滤镜的亮度（%）。内部映射为 CSS brightness() 的入参（100% = 1，原样）。100 时该滤镜被禁用。',
      control: {
        type: 'range',
        min: 0,
        max: 200,
        step: 1,
      },
    },
    hue: {
      name: '色相 hue-rotate',
      description:
        '自定义 hue 滤镜的色相旋转角度（°）。内部用 CSS hue-rotate() 实现。0 时该滤镜被禁用。',
      control: {
        type: 'range',
        min: 0,
        max: 360,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FilterDemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
