import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import atlasDemoSource from './atlas-demo.ts?raw';
import {
  createAtlasDemo,
  type AtlasDemoInstance,
  type AtlasDemoSnapshot,
} from './atlas-demo';

interface TextureAtlasArgs {
  frameName: string;
  showSingle: boolean;
}

const renderAtlasDemo = canvasStory({
  create: createAtlasDemo,
  apply(instance: AtlasDemoInstance, args: TextureAtlasArgs) {
    instance.setFrame(args.frameName);
    instance.setSingleVisible(args.showSingle);
  },
  readout(snapshot: AtlasDemoSnapshot) {
    return [
      ['当前帧', snapshot.frameName],
      ['图集帧数', `${snapshot.frameCount}(frameTotal ${snapshot.frameTotal})`],
      ['frame 裁剪尺寸', snapshot.frameSize],
      ['sourceSize', snapshot.sourceSize],
      ['精灵显示尺寸', snapshot.spriteSize],
      ['图集源图像', snapshot.atlasSize],
      ['hash 通路帧数', snapshot.hashFrameCount],
    ];
  },
  captions: [
    '上:单图(独立 PNG)与图集帧对照 | 下:图集全部命名帧',
    '素材由 generate-atlas.mjs 生成,坐标与 atlas.json 一一对应',
  ],
});

const meta = {
  id: 'texture-atlas',
  title: '资源与显示/纹理图集',
  tags: ['!dev'],
  args: {
    frameName: 'square-red',
    showSingle: true,
  },
  argTypes: {
    frameName: {
      name: '当前帧',
      description:
        "sprite.setFrame(帧名);'__BASE' 是每个图集自带的整图帧。",
      options: [
        'square-red',
        'circle-blue',
        'triangle-yellow',
        'dot-orange',
        'diamond-green',
        'bar-purple',
        '__BASE',
      ],
      control: { type: 'select' },
      labels: { '__BASE': '__BASE(整张图集)' },
    },
    showSingle: {
      name: '显示单图对照',
      description: '隐藏后只保留图集通路,便于专注观察帧切换。',
      control: { type: 'boolean' },
    },
  },
  render: renderAtlasDemo,
  parameters: storySource(atlasDemoSource),
} satisfies Meta<TextureAtlasArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtlasDemo: Story = {};
