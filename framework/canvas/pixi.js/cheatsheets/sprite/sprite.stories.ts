import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import spriteSource from './sprite.ts?raw';
import animatedSpriteSource from './animated-sprite.ts?raw';
import {
  createSpriteDemo,
  type SpriteDemoInstance,
  type SpriteDemoSnapshot,
} from './sprite';
import {
  createAnimatedSpriteDemo,
  type AnimatedSpriteDemoInstance,
  type AnimatedSpriteDemoSnapshot,
} from './animated-sprite';

interface SpriteDemoArgs {
  anchor: string;
  tint: string;
}

interface AnimatedSpriteDemoArgs {
  animationSpeed: number;
  loop: boolean;
}

const meta = {
  id: 'sprite',
  title: '内容对象/纹理与精灵',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpriteDemo: Story = {
  args: {
    anchor: '0.5,0.5',
    tint: '#ffffff',
  },
  argTypes: {
    anchor: {
      name: '锚点 anchor',
      description:
        '纹理在精灵内的锚点（0~1 归一化）。影响定位中心与旋转中心。',
      options: ['0,0', '0.5,0.5', '1,1'],
      control: { type: 'radio' },
      labels: {
        '0,0': '左上 (0, 0)',
        '0.5,0.5': '中心 (0.5, 0.5)',
        '1,1': '右下 (1, 1)',
      },
    },
    tint: {
      name: '染色 tint',
      description: '与纹理颜色相乘的整体染色；不改 Texture 数据。',
      control: { type: 'color' },
    },
  },
  render: canvasStory({
    create: createSpriteDemo,
    apply(instance: SpriteDemoInstance, args: SpriteDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: SpriteDemoSnapshot) {
      return [
        ['锚点 anchor', snapshot.anchor],
        ['纹理尺寸', snapshot.size],
        ['染色 tint', snapshot.tint],
      ];
    },
  }),
  parameters: storySource(spriteSource),
};

export const AnimatedSprite: Story = {
  args: {
    animationSpeed: 0.2,
    loop: true,
  },
  argTypes: {
    animationSpeed: {
      name: '播放速度 animationSpeed',
      description: '每帧推进倍率，值越大播放越快；0 为暂停。',
      control: { type: 'range', min: 0, max: 3, step: 0.05 },
    },
    loop: {
      name: '循环 loop',
      description: 'true 循环播放；false 播完停在末帧。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createAnimatedSpriteDemo,
    apply(instance: AnimatedSpriteDemoInstance, args: AnimatedSpriteDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: AnimatedSpriteDemoSnapshot) {
      return [
        ['当前帧 currentFrame', snapshot.currentFrame],
        ['总帧数 totalFrames', snapshot.totalFrames],
        ['播放中 playing', snapshot.playing ? 'true' : 'false'],
      ];
    },
  }),
  parameters: storySource(animatedSpriteSource),
};
