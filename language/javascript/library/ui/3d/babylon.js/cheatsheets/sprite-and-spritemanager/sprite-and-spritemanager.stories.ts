import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSpriteExample,
  type SpriteExampleInstance,
  type SpriteExampleSnapshot,
} from './example';

interface SpriteArgs {
  count: number;
  cellIndex: number;
  size: number;
  autoRotate: boolean;
}

const renderSprites = canvasStory({
  create: createSpriteExample,
  apply(instance: SpriteExampleInstance, args: SpriteArgs) {
    instance.update(args);
  },
  readout(snapshot: SpriteExampleSnapshot) {
    return [
      ['活跃 Sprite', snapshot.spriteCount],
      ['cellIndex', snapshot.cellIndex],
      ['manager 容量', snapshot.capacity],
      ['单格像素', snapshot.cellPixel],
      ['渲染批次', '1（单 manager 批量）'],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'sprite-and-spritemanager',
  title: '场景与对象/Sprite',
  tags: ['!dev'],
};

export const Sprites = {
  name: '广告牌图标',
  args: {
    count: 16,
    cellIndex: 0,
    size: 1,
    autoRotate: true,
  },
  argTypes: {
    count: {
      name: 'Sprite 数量',
      control: { type: 'range', min: 1, max: 48, step: 1 },
      description:
        '在 manager.capacity 范围内增删 Sprite。一个 SpriteManager 共享同一张图集，所有 Sprite 合并为一次批量绘制。',
    },
    cellIndex: {
      name: '图集 cellIndex',
      control: { type: 'range', min: 0, max: 3, step: 1 },
      description:
        '切换每个 Sprite 从图集里取的分格。范例图集是 2×2 共 4 格；改变 cellIndex 立即换图标。',
    },
    size: {
      name: 'Sprite size',
      control: { type: 'range', min: 0.4, max: 3, step: 0.1 },
      description:
        '写入 sprite.size，同步 width 与 height（世界单位）。远小近大随透视衰减，没有屏幕恒定档。',
    },
    autoRotate: {
      name: '相机自转',
      control: 'boolean',
      description:
        '开启后每帧推进 ArcRotateCamera.alpha，相机绕 target 公转，便于观察 Sprite 始终朝向观察者；关闭后可手动拖拽。',
    },
  },
  render: renderSprites,
  parameters: storySource(exampleSource),
};
