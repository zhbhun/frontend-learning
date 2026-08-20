import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import collisionLabSource from './collision-lab.ts?raw';
import {
  createCollisionLab,
  type CollisionLabInstance,
  type CollisionLabOptions,
  type CollisionLabSnapshot,
} from './collision-lab';

const renderCollisionLab = canvasStory({
  create: createCollisionLab,
  apply(instance: CollisionLabInstance, args: CollisionLabOptions) {
    instance.applyOptions(args);
  },
  readout(snapshot: CollisionLabSnapshot) {
    return [
      ['收集 / 命中', `${snapshot.stars} / ${snapshot.hits}`],
      ['箱子判定事件', `${snapshot.crateEvents}(${snapshot.crateJudge})`],
      ['最近回调对', snapshot.lastPair],
      ['玩家 touching', snapshot.touching],
      ['玩家 blocked.down', snapshot.blockedDown ? 'true' : 'false'],
      ['活动 collider', `${snapshot.activeColliders} / ${snapshot.totalColliders}`],
      ['物理状态', snapshot.paused ? 'paused' : 'running'],
      ['玩家 x', snapshot.playerX],
    ];
  },
  captions: [
    '←/→ 移动,↑/空格 跳;橙条为移动平台,黄圆为收集物,红三角为危险物',
    'Controls 切换判定方式、immovable、bounce、带动、debug 与暂停',
  ],
});

const meta = {
  id: 'arcade-collision',
  title: '物理与碰撞/Arcade 碰撞',
  tags: ['!dev'],
  args: {
    crateJudge: 'collider',
    cratesImmovable: false,
    playerBounce: 0,
    moverCarry: 1,
    debugBodies: true,
    physicsPaused: false,
  },
  argTypes: {
    crateJudge: {
      name: '箱子判定',
      description:
        '玩家与箱子的判定方式:collider 会分离推挤;overlap 只触发回调、互相穿过。',
      control: { type: 'inline-radio', options: ['collider', 'overlap'] },
    },
    cratesImmovable: {
      name: '箱子 immovable',
      description: 'true 时箱子完全不被推动,玩家撞上被弹开。',
      control: { type: 'boolean' },
    },
    playerBounce: {
      name: '玩家 bounce',
      description: '玩家分离后的速度保留比例:0 停住,0.8 明显反弹。',
      control: { type: 'range', min: 0, max: 0.8, step: 0.1 },
    },
    moverCarry: {
      name: '平台带动',
      description: '移动平台 friction:骑在橙条上被水平带动的比例(0~1)。',
      control: { type: 'range', min: 0, max: 1, step: 0.25 },
    },
    debugBodies: {
      name: 'debug 绘制',
      description: '显示物理调试渲染:品红动态体、蓝静态体、绿速度线。',
      control: { type: 'boolean' },
    },
    physicsPaused: {
      name: '暂停物理',
      description: 'world.pause():body 与 collider 全部停跑,输入不再改变位置。',
      control: { type: 'boolean' },
    },
  },
  render: renderCollisionLab,
  parameters: storySource(collisionLabSource),
} satisfies Meta<CollisionLabOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CollisionLab: Story = {};
