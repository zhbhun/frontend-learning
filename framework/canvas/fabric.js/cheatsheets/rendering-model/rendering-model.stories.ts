import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createRenderingModel,
  type RenderingModelInstance,
  type RenderingModelOptions,
  type RenderingModelSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createRenderingModel,
  apply(instance: RenderingModelInstance, args: RenderingModelOptions) {
    instance.update(args);
  },
  readout(snapshot: RenderingModelSnapshot) {
    return [
      ['对象 fill', snapshot.objectFill],
      ['缓存待重绘', snapshot.cacheDirty],
      ['下层重绘次数', snapshot.renderCount],
      ['画布像素 CSS', snapshot.cssSize],
      ['画布像素 物理', snapshot.pixelSize],
      ['retina 缩放', snapshot.retinaScaling],
    ];
  },
});

const meta = {
  id: 'rendering-model',
  title: '起步/渲染模型',
  tags: ['!dev'],
  args: {
    fill: '#4f7cff',
    assignMode: 'set',
    refreshMode: 'none',
    enableRetina: true,
  },
  argTypes: {
    fill: {
      name: '填充色',
      description:
        '改矩形的 fill 属性；fill 属于 cacheProperties，set() 改它会标记缓存失效。',
      control: { type: 'color' },
    },
    assignMode: {
      name: '改属性方式',
      description:
        'set() 走 Fabric 内部 _set 并维护 dirty；直接赋值绕过它，缓存不失效。',
      control: {
        type: 'inline-radio',
        labels: { set: 'set()', direct: '直接赋值' },
      },
      options: ['set', 'direct'],
    },
    refreshMode: {
      name: '改后刷新',
      description:
        '不刷新：只改属性；requestRenderAll()：把整帧重绘排队到下一动画帧。',
      control: {
        type: 'inline-radio',
        labels: { none: '不刷新', request: 'requestRenderAll()' },
      },
      options: ['none', 'request'],
    },
    enableRetina: {
      name: 'retina 高清缩放',
      description:
        'enableRetinaScaling：画布物理像素是否按 devicePixelRatio 放大。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<RenderingModelOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
