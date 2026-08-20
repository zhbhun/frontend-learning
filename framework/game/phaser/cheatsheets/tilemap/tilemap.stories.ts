import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import tilemapLabSource from './tilemap-lab.ts?raw';
import {
  createTilemapLab,
  type TilemapLabInstance,
  type TilemapLabParams,
  type TilemapLabSnapshot,
} from './tilemap-lab';

const renderTilemapLab = canvasStory({
  create: createTilemapLab,
  apply(instance: TilemapLabInstance, args: TilemapLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: TilemapLabSnapshot) {
    return [
      ['地图尺寸', snapshot.mapSize],
      ['tileWidth × tileHeight', snapshot.tileSize],
      ['orientation / renderOrder', `${snapshot.orientation} / ${snapshot.renderOrder}`],
      ['tile 图层', snapshot.layerNames],
      ['tileset', snapshot.tilesets],
      ['渲染瓦片数(tilesDrawn)', snapshot.drawnPerLayer],
      ['合计(剔除后 / 网格总数)', snapshot.drawnTotal],
      ['滚动 scrollX / scrollY', `(${snapshot.scrollX}, ${snapshot.scrollY})`],
      ['zoom', String(snapshot.zoom)],
    ];
  },
  captions: [
    '按住画布拖拽平移 · 切换图层显隐与剔除观察层叠和渲染瓦片数',
    '素材:terrain.png + props.png + level.json(手工构建的 Tiled JSON)',
  ],
});

const meta = {
  id: 'tilemap',
  title: '瓦片地图/瓦片地图',
  tags: ['!dev'],
  args: {
    showGround: true,
    showDecoration: true,
    showForeground: true,
    zoom: 1,
    skipCull: false,
  },
  argTypes: {
    showGround: {
      name: '地面层',
      description: 'ground.setVisible:最底层的地形(草地 / 泥土 / 水 / 路)。',
      control: { type: 'boolean' },
    },
    showDecoration: {
      name: '装饰层',
      description: 'decoration.setVisible:灌木、花丛、岩石等点缀,混用两个 tileset。',
      control: { type: 'boolean' },
    },
    showForeground: {
      name: '前景层',
      description: 'foreground.setVisible:砖墙与栅栏,setDepth(2) 压在装饰层之上。',
      control: { type: 'boolean' },
    },
    zoom: {
      name: 'zoom 缩放',
      description:
        'setZoom:纯显示缩放;zoom 0.5 时可见范围超过整张地图,滚动会被边界锁死。',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
    },
    skipCull: {
      name: 'skipCull 跳过剔除',
      description:
        'setSkipCull:开启后不再按镜头可见范围剔除,每层的 tilesDrawn 等于该层非空瓦片总数。',
      control: { type: 'boolean' },
    },
  },
  render: renderTilemapLab,
  parameters: storySource(tilemapLabSource),
} satisfies Meta<TilemapLabParams>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TilemapLab: Story = {};
