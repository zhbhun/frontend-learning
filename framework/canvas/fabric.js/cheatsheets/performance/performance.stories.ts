import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPerformance,
  type PerformanceInstance,
  type PerformanceOptions,
  type PerformanceSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createPerformance,
  apply(instance: PerformanceInstance, args: PerformanceOptions) {
    instance.update(args);
  },
  readout(snapshot: PerformanceSnapshot) {
    return [
      ['对象数', snapshot.objectCount],
      ['运动方式', snapshot.motionLabel],
      ['整帧重绘次数', snapshot.renderCount],
      ['实际帧率', `${snapshot.fps} fps`],
      ['帧耗时 均值', snapshot.avgFrameMs],
      ['帧耗时 最大', snapshot.maxFrameMs],
      ['动画对象位图重画', snapshot.heroRepaints],
      ['动画对象走缓存', snapshot.heroCached],
      ['缓存内存 估算', snapshot.cacheMemory],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '进阶与工程/性能优化',
  tags: ['!dev'],
  args: {
    objectCount: 200,
    objectCaching: true,
    motion: 'drag',
    skipOffscreen: true,
  },
  argTypes: {
    objectCount: {
      name: '对象数量',
      description:
        '同构复杂路径对象的数量；约一半初始布局在视口右边界之外，供视口剔除对比。',
      control: { type: 'inline-radio' },
      options: [50, 200, 800],
    },
    objectCaching: {
      name: '对象缓存',
      description:
        'objectCaching：对象先画进离屏位图，整帧重绘时贴图；关闭则每个对象每帧现场画。',
      control: { type: 'boolean' },
    },
    motion: {
      name: '运动方式',
      description:
        '静止：不发起重绘；拖动：每帧改 left/top（合成期属性）；缩放：每帧改 scaleX/scaleY（位图尺寸随之变化）。',
      control: {
        type: 'inline-radio',
        labels: { static: '静止', drag: '拖动', scale: '缩放' },
      },
      options: ['static', 'drag', 'scale'],
    },
    skipOffscreen: {
      name: '跳过视口外对象',
      description:
        'skipOffscreen：整帧重绘时跳过完全在视口外的对象（fabric 默认开启）。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<PerformanceOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
