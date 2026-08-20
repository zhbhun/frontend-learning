import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import tilemapLabSource from './tilemap-lab.ts?raw';
import {
  createTilemapLab,
  type TilemapLabInstance,
  type TilemapLabOptions,
  type TilemapLabSnapshot,
} from './tilemap-lab';

const renderTilemapLab = canvasStory({
  create: createTilemapLab,
  apply(instance: TilemapLabInstance, args: TilemapLabOptions) {
    instance.applyOptions(args);
  },
  readout(snapshot: TilemapLabSnapshot) {
    return [
      ['玩家瓦片坐标', snapshot.playerTile],
      ['脚下瓦片', snapshot.footTile],
      ['拾取(瓦片/精灵)', snapshot.pickups],
      ['尖刺命中', `${snapshot.spikeHits}(区域回调)`],
      ['最近 tile 回调', snapshot.lastTileCallback],
      ['最近精灵拾取', snapshot.lastSpritePickup],
      ['点击编辑(放/移)', snapshot.edits],
      ['全图瓦片(地形/碰撞)', snapshot.tileStats],
    ];
  },
  captions: [
    '先点击画布获得键盘焦点(该次点击也会编辑瓦片)· ←/→ 移动,↑/空格 跳',
    '点击空瓦片放置、点击已占用瓦片移除;蓝块为碰撞瓦片,粉线为 interesting faces',
  ],
});

const meta = {
  id: 'tilemap-collision',
  title: '瓦片地图/地图碰撞与交互',
  tags: ['!dev'],
  args: {
    tileDebug: true,
    bodyDebug: false,
    brush: 'stone',
  },
  argTypes: {
    tileDebug: {
      name: '瓦片碰撞可视化',
      description:
        'layer.renderDebug:蓝块是可碰撞瓦片,粉色描边是 interesting faces(真正参与分离的面);地面内部的面没有描边。',
      control: { type: 'boolean' },
    },
    bodyDebug: {
      name: '物理调试',
      description: 'Arcade 物理 debug 绘制:品红动态体、绿速度线。',
      control: { type: 'boolean' },
    },
    brush: {
      name: '放置图块',
      description:
        '点击画布时 putTileAtWorldXY 放的瓦片:石块(碰撞,需重建碰撞)或金币(踩上触发 index 回调)。',
      control: { type: 'inline-radio', options: ['stone', 'coin'] },
    },
  },
  render: renderTilemapLab,
  parameters: storySource(tilemapLabSource),
} satisfies Meta<TilemapLabOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TilemapLab: Story = {};
