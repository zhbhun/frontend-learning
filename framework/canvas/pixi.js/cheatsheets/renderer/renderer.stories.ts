import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import rendererSource from './renderer.ts?raw';
import {
  createRenderer,
  type RendererInstance,
  type RendererSnapshot,
} from './renderer';

interface RendererArgs {
  resolution: number;
}

const renderInteractive = canvasStory({
  create: createRenderer,
  apply(instance: RendererInstance, args: RendererArgs) {
    instance.update(args);
  },
  readout(snapshot: RendererSnapshot) {
    return [
      ['渲染器', snapshot.backend],
      ['分辨率', snapshot.resolution],
      ['设备像素比', snapshot.devicePixelRatio],
      ['后备像素', snapshot.backing],
      ['逻辑尺寸', snapshot.screen],
    ];
  },
});

const meta = {
  id: 'renderer',
  title: '进阶渲染/渲染器与分辨率',
  tags: ['!dev'],
  args: {
    resolution: 1,
  },
  argTypes: {
    resolution: {
      name: '分辨率',
      description:
        '对应 app.renderer.resolution。调低后画布像素数减少、文字和细线发糊；调高到设备像素比（通常 2）时最清晰。',
      control: {
        type: 'range',
        min: 0.5,
        max: 2,
        step: 0.5,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(rendererSource),
} satisfies Meta<RendererArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
