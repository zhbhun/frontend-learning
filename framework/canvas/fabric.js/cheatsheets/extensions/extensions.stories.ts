import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAligningGuidelineLab,
  type ExtensionsInstance,
  type ExtensionsOptions,
  type ExtensionsSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createAligningGuidelineLab,
  apply(instance: ExtensionsInstance, args: ExtensionsOptions) {
    instance.update(args);
  },
  readout(snapshot: ExtensionsSnapshot) {
    return [
      ['对齐状态', snapshot.alignStatus],
      ['最近吸附', snapshot.lastSnap],
      ['吸附次数', snapshot.snapCount],
      ['参考线', snapshot.guideCount],
    ];
  },
  captions: [
    '拖动蓝色矩形靠近灰色对象的边或中心：出现红色参考线并吸附；关闭「启用对齐」后自由拖动',
  ],
});

const meta = {
  id: 'extensions',
  title: '进阶与工程/扩展包',
  tags: ['!dev'],
  args: {
    snapEnabled: true,
    snapMargin: 4,
  },
  argTypes: {
    snapEnabled: {
      name: '启用对齐',
      description:
        '对应 new AligningGuidelines(canvas) 的挂接与 dispose() 的卸载。',
      control: {
        type: 'boolean',
      },
    },
    snapMargin: {
      name: '吸附距离',
      description: 'AligningGuidelines 的 margin：距离多少像素内开始吸附。',
      control: {
        type: 'range',
        min: 2,
        max: 12,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExtensionsOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
