import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import renderersSource from './renderers.ts?raw';
import {
  createRenderers,
  type RenderersInstance,
  type RenderersOptions,
  type RenderersSnapshot,
} from './renderers';

interface RenderersArgs {
  renderer: RenderersOptions['renderer'];
}

const renderRenderers = canvasStory({
  create: createRenderers,
  apply(instance: RenderersInstance, args: RenderersArgs) {
    instance.update(args);
  },
  readout(snapshot: RenderersSnapshot) {
    return [
      ['当前渲染器', snapshot.renderer],
      ['动画产生的 DOM 节点数', snapshot.domNodes],
    ];
  },
});

const meta = {
  id: 'renderers',
  title: 'lottie-web 核心/渲染器选型',
  tags: ['!dev'],
  args: {
    renderer: 'svg',
  },
  argTypes: {
    renderer: {
      name: 'renderer',
      description: 'loadAnimation 的创建参数：切换后销毁旧实例并按新渲染器重建。',
      control: { type: 'select' },
      options: ['svg', 'canvas', 'html'],
    },
  },
  render: renderRenderers,
  parameters: storySource(renderersSource),
} satisfies Meta<RenderersArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Renderers: Story = {};
