import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import renderTextureSource from './render-texture.ts?raw';
import {
  createRenderTextureDemo,
  type RenderTextureInstance,
  type RenderTextureSnapshot,
} from './render-texture';

interface RenderTextureArgs {
  clearMode: 'clear' | 'accumulate';
}

const renderInteractive = canvasStory({
  create: createRenderTextureDemo,
  apply(instance: RenderTextureInstance, args: RenderTextureArgs) {
    instance.update(args);
  },
  readout(snapshot: RenderTextureSnapshot) {
    return [
      ['清除模式', snapshot.clearMode],
      ['纹理逻辑尺寸', snapshot.textureSize],
      ['纹理分辨率', snapshot.textureResolution],
      ['后备像素', snapshot.backingPixels],
      ['复用 Sprite', snapshot.displaySprites],
    ];
  },
});

const meta = {
  id: 'render-texture',
  title: '进阶渲染/渲染纹理',
  tags: ['!dev'],
  args: {
    clearMode: 'clear',
  },
  argTypes: {
    clearMode: {
      name: '清除模式',
      description:
        '对应 renderer.render 的 clear。每帧清除 → 纹理先清透明再画，只显示当前帧（快照）；累积保留 → 不清除，新内容画在旧像素之上，适合拖尾、刮刮卡等累积效果。',
      options: ['clear', 'accumulate'],
      control: { type: 'radio' },
      labels: {
        clear: '每帧清除 clear=true',
        accumulate: '累积保留 clear=false',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(renderTextureSource),
} satisfies Meta<RenderTextureArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
