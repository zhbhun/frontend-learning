import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import nineSliceSource from './nine-slice.ts?raw';
import tilingSource from './tiling.ts?raw';
import {
  createNineSliceDemo,
  type NineSliceInstance,
  type NineSliceSnapshot,
} from './nine-slice';
import {
  createTilingDemo,
  type TilingInstance,
  type TilingSnapshot,
} from './tiling';

interface NineSliceArgs {
  width: number;
  height: number;
}

interface TilingArgs {
  tileScale: number;
  tileRotation: number;
}

const meta = {
  id: 'nine-slice-tiling',
  title: '内容对象/九宫格与平铺',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const NineSlice: Story = {
  args: {
    width: 360,
    height: 240,
  },
  argTypes: {
    width: {
      name: '面板宽度 width',
      description:
        '九宫格面板目标宽度。设置后重算顶点与 UV，四角不缩放、中部水平拉伸。',
      control: { type: 'range', min: 160, max: 640, step: 10 },
    },
    height: {
      name: '面板高度 height',
      description:
        '九宫格面板目标高度。设置后重算顶点与 UV，四角不缩放、中部垂直拉伸。',
      control: { type: 'range', min: 160, max: 420, step: 10 },
    },
  },
  render: canvasStory({
    create: createNineSliceDemo,
    apply(instance: NineSliceInstance, args: NineSliceArgs) {
      instance.update(args);
    },
    readout(snapshot: NineSliceSnapshot) {
      return [
        ['目标尺寸', `${snapshot.width} × ${snapshot.height}`],
        ['纹理原尺寸', snapshot.source],
        ['边宽', snapshot.border],
      ];
    },
  }),
  parameters: storySource(nineSliceSource),
};

export const Tiling: Story = {
  args: {
    tileScale: 1,
    tileRotation: 0,
  },
  argTypes: {
    tileScale: {
      name: '瓦片缩放 tileScale',
      description:
        '每个重复瓦片的缩放；>1 瓦片变大（重复变少），<1 变小（重复变多）。',
      control: { type: 'range', min: 0.5, max: 3, step: 0.1 },
    },
    tileRotation: {
      name: '瓦片旋转 tileRotation',
      description: '每个瓦片的旋转角度（度）；独立于精灵自身的 rotation。',
      control: { type: 'range', min: 0, max: 360, step: 5 },
    },
  },
  render: canvasStory({
    create: createTilingDemo,
    apply(instance: TilingInstance, args: TilingArgs) {
      instance.update(args);
    },
    readout(snapshot: TilingSnapshot) {
      return [
        ['瓦片缩放', snapshot.tileScale],
        ['瓦片旋转', snapshot.tileRotation],
        ['平铺区域', snapshot.area],
      ];
    },
  }),
  parameters: storySource(tilingSource),
};
