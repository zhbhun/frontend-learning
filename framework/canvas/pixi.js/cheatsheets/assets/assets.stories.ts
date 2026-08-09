import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import assetsSource from './assets.ts?raw';
import {
  createAssets,
  type AssetsInstance,
  type AssetsSnapshot,
} from './assets';

interface AssetsArgs {
  alias: string;
}

const renderInteractive = canvasStory({
  create: createAssets,
  apply(instance: AssetsInstance, args: AssetsArgs) {
    instance.update(args);
  },
  readout(snapshot: AssetsSnapshot) {
    return [
      ['加载状态', snapshot.state],
      ['资源别名', snapshot.alias],
      ['进度', `${Math.round(snapshot.progress * 100)}%`],
      ['缓存命中', snapshot.cached ? '是' : '否'],
    ];
  },
});

const meta = {
  id: 'assets',
  title: '内容对象/资源加载',
  tags: ['!dev'],
  args: {
    alias: 'bunny',
  },
  argTypes: {
    alias: {
      name: '资源',
      description:
        '选择要加载的纹理别名。首次加载会显示进度条；切回已加载的别名则命中缓存、瞬时显示。',
      control: {
        type: 'radio',
      },
      options: ['bunny', 'flowerTop', 'eggHead'],
    },
  },
  render: renderInteractive,
  parameters: storySource(assetsSource),
} satisfies Meta<AssetsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
