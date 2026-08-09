import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createShadowGallery,
  type ShadowGalleryInstance,
  type ShadowGallerySnapshot,
} from './example';

interface ShadowGalleryArgs {
  filterType: string;
  mapSize: number;
  darkness: number;
}

const renderShadows = canvasStory({
  create: createShadowGallery,
  apply(instance: ShadowGalleryInstance, args: ShadowGalleryArgs) {
    instance.update(args);
  },
  readout(snapshot: ShadowGallerySnapshot) {
    return [
      ['阴影类型', snapshot.filterType],
      ['mapSize', `${snapshot.mapSize} × ${snapshot.mapSize}`],
      ['投射物 / 接收物', `${snapshot.casterCount} / ${snapshot.receiverCount}`],
    ];
  },
});

export default {
  id: 'shadows-and-shading',
  title: '材质与光照/明暗与阴影',
  tags: ['!dev'],
};

export const Shadows = {
  name: '阴影类型对比',
  args: {
    filterType: 'pcf',
    mapSize: 1024,
    darkness: 0,
  },
  argTypes: {
    filterType: {
      name: '阴影类型',
      control: { type: 'select' },
      options: ['none', 'poisson', 'esm', 'bluresm', 'pcf'],
      description:
        '切换 ShadowGenerator 的过滤模式（互斥）。none 回退到硬边（FILTER_NONE）；四种 filter 的边缘软硬与开销不同，详见正文「阴影类型」比较表。',
    },
    mapSize: {
      name: 'shadow map 尺寸',
      control: { type: 'select' },
      options: [512, 1024, 2048],
      description:
        '构造时传入 ShadowGenerator(mapSize, light)；运行时改尺寸会 dispose 重建并重新登记所有投射物。越大边缘越细，纹理内存与重绘成本也越高。',
    },
    darkness: {
      name: '暗度 darkness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description:
        '写入 shadowGenerator.darkness（默认 0）。0 = 最暗；1 = 无阴影。只能调淡，无法调到比 0 更暗。',
    },
  },
  render: renderShadows,
  parameters: storySource(exampleSource),
};
