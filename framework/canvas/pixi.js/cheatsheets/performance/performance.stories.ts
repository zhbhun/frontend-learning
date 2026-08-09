import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import performanceSource from './performance.ts?raw';
import {
  createPerformanceDemo,
  type PerformanceInstance,
  type PerformanceSnapshot,
} from './performance';

interface PerformanceArgs {
  textureMode: 'shared' | 'distinct';
  blendMode: 'normal' | 'alternating';
  count: number;
}

const meta = {
  id: 'performance',
  title: '工程与性能/性能优化',
  tags: ['!dev'],
  args: {
    textureMode: 'shared',
    blendMode: 'normal',
    count: 150,
  },
  argTypes: {
    textureMode: {
      name: '纹理策略',
      description:
        'shared：所有精灵共用同一张纹理，靠 tint 着色——tint 只改顶点色，不打断批次，draw call 最少。distinct：精灵使用独立纹理池（24 张 > 每批次 16 张上限），批次被纹理数量打断，draw call 增多。',
      control: { type: 'radio' },
      options: ['shared', 'distinct'],
    },
    blendMode: {
      name: 'blend 排列',
      description:
        'normal：所有精灵用同一种 blend mode，可合批。alternating：相邻精灵在 NORMAL / SCREEN 间交替，每次切换都打断批次，draw call 数接近精灵数。',
      control: { type: 'radio' },
      options: ['normal', 'alternating'],
    },
    count: {
      name: '精灵数',
      description: '场景中的精灵总数。draw call 随中断因素变化，精灵数放大这一差异。',
      control: { type: 'range', min: 50, max: 600, step: 50 },
    },
  },
  render: canvasStory({
    create: createPerformanceDemo,
    apply(instance: PerformanceInstance, args: PerformanceArgs) {
      instance.update(args);
    },
    readout(snapshot: PerformanceSnapshot) {
      return [
        ['draw calls', snapshot.drawCalls],
        ['精灵数', snapshot.sprites],
        ['FPS', snapshot.fps],
        ['纹理策略', snapshot.textureMode === 'shared' ? '共享纹理' : '独立纹理'],
        ['blend 排列', snapshot.blendMode === 'normal' ? '统一' : '交替'],
      ];
    },
  }),
  parameters: storySource(performanceSource),
} satisfies Meta<PerformanceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DrawCallDemo: Story = {};
