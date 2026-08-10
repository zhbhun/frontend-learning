import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCachePerformanceDemo,
  type CachePerformanceInstance,
  type CachePerformanceSnapshot,
} from './example';

interface CachePerformanceArgs {
  /** 是否缓存：true 对每个星形调用 cache()，false 调用 clearCache()。 */
  cached: boolean;
  /** 星形数量：越多越能体现缓存的收益。 */
  shapeCount: number;
}

const renderInteractive = canvasStory({
  create: createCachePerformanceDemo,
  apply(instance: CachePerformanceInstance, args: CachePerformanceArgs) {
    instance.update(args);
  },
  readout(snapshot: CachePerformanceSnapshot) {
    return [
      ['缓存状态', snapshot.cached ? '已缓存' : '未缓存'],
      ['形状数量', snapshot.shapeCount],
      ['绘制耗时', `${snapshot.drawTime} ms`],
    ];
  },
});

const meta = {
  id: 'cache-performance',
  title: '性能与滤镜/缓存与性能',
  tags: ['!dev'],
  args: {
    cached: false,
    shapeCount: 500,
  },
  argTypes: {
    cached: {
      name: '缓存',
      description:
        '对每个星形调用 cache() / clearCache()。缓存后绘制直接复制离屏 canvas 图像，跳过 fill + stroke + shadow 的逐帧重新渲染。',
      control: { type: 'boolean' },
    },
    shapeCount: {
      name: '形状数量',
      description:
        '场景中的星形数量；越多越能体现缓存的收益。测量方法：同步调用 layer.draw() 多次取平均。',
      control: { type: 'range', min: 100, max: 2000, step: 100 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CachePerformanceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
