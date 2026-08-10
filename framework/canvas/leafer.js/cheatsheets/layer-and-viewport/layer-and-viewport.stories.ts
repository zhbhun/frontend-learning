import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLayerViewport,
  type LayerViewportInstance,
  type LayerViewportSnapshot,
} from './example';

interface LayerViewportArgs {
  scale: number;
  panX: number;
  panY: number;
  layerSync: boolean;
}

const renderInteractive = canvasStory({
  create: createLayerViewport,
  apply(instance: LayerViewportInstance, args: LayerViewportArgs) {
    instance.update(args);
  },
  readout(snapshot: LayerViewportSnapshot) {
    const round = (value: number) => Math.round(value);
    return [
      ['tree 视口缩放', snapshot.scale.toFixed(2)],
      ['tree 视口偏移', `${round(snapshot.panX)}, ${round(snapshot.panY)}`],
      ['ground 视口缩放', snapshot.groundScale.toFixed(2)],
      ['P 内容坐标', `${snapshot.markerContentX}, ${snapshot.markerContentY}`],
      [
        'P 屏幕坐标',
        `${round(snapshot.markerWorldX)}, ${round(snapshot.markerWorldY)}`,
      ],
    ];
  },
});

const meta = {
  id: 'layer-and-viewport',
  title: '进阶与工程/分层渲染与视口',
  tags: ['!dev'],
  args: {
    scale: 1,
    panX: 80,
    panY: 60,
    layerSync: false,
  },
  argTypes: {
    scale: {
      name: '视口缩放',
      description:
        'app.tree.zoomLayer 的 scaleX / scaleY，放大内容层视口。同步开启时同时作用于 ground。',
      control: { type: 'range', min: 0.3, max: 2.5, step: 0.05 },
    },
    panX: {
      name: '视口平移 X',
      description: 'app.tree.zoomLayer.x，沿水平方向平移内容层视口。',
      control: { type: 'range', min: -200, max: 200, step: 5 },
    },
    panY: {
      name: '视口平移 Y',
      description: 'app.tree.zoomLayer.y，沿垂直方向平移内容层视口。',
      control: { type: 'range', min: -150, max: 150, step: 5 },
    },
    layerSync: {
      name: '背景层跟随视口',
      description:
        '打开后把 tree 的同一视口变换同步到 ground，演示层间坐标映射；关闭时 ground 保持独立。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<LayerViewportArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
