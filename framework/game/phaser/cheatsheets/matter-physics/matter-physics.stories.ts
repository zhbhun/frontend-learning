import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import stackingLabSource from './stacking-lab.ts?raw';
import {
  createStackingLab,
  type StackingLabInstance,
  type StackingLabParams,
  type StackingLabSnapshot,
} from './stacking-lab';

const renderStackingLab = canvasStory({
  create: createStackingLab,
  apply(instance: StackingLabInstance, args: StackingLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: StackingLabSnapshot) {
    return [
      ['动态刚体总数', `${snapshot.bodies}(上限 60,超出移除最早)`],
      [
        '活动 / 休眠',
        `${snapshot.awake} 活动 · ${snapshot.sleeping} 休眠(body.isSleeping)`,
      ],
      [
        '约束数',
        `${snapshot.constraints}(world.getAllConstraints:摆锤 1 + 拖拽 1)`,
      ],
      ['本步接触对', `${snapshot.activePairs}(collisionactive 的 event.pairs)`],
      ['最近碰撞对', snapshot.lastCollision],
      ['传感器命中', `${snapshot.sensorHits} 次(isSensor 只检测不分离)`],
      ['正在拖拽', snapshot.dragging],
    ];
  },
  captions: ['点击画布生成刚体 · 按住任意刚体(含摆锤)直接拖拽', '半透明 = 已休眠 · 右下绿框 = 传感器拾取区'],
});

const meta = {
  id: 'matter-physics',
  title: '物理与碰撞/Matter 物理',
  tags: ['!dev'],
  args: {
    gravityY: 1,
    frictionAir: 0.01,
    enableSleeping: false,
    spawnShape: 'rectangle',
    pendulumStiffness: 1,
    debug: false,
  },
  argTypes: {
    gravityY: {
      name: '重力 y',
      description:
        'world.setGravity(0, v) 的 y 分量:Matter 重力是比例量(默认 1),0 = 失重,2 = 加倍下坠。',
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
    },
    frictionAir: {
      name: 'frictionAir 空气阻力',
      description:
        '每步按比例衰减速度(默认 0.01):0 无衰减一直弹,0.1 落体像陷入糖浆;作用于全部动态刚体。',
      control: { type: 'range', min: 0, max: 0.12, step: 0.005 },
    },
    enableSleeping: {
      name: 'enableSleeping',
      description:
        'world.engine.enableSleeping(默认 false):开启后低速刚体连续约 60 步近零速度即休眠,退出模拟;被撞或拖拽会唤醒。',
      control: { type: 'boolean' },
    },
    spawnShape: {
      name: '生成形状',
      description:
        '下次点击画布生成的刚体:rectangle(工厂矩形)、circle(圆)、pentagon(正五边形)、compound(条+圆的 parts 复合体)。',
      options: ['rectangle', 'circle', 'pentagon', 'compound'],
      control: { type: 'radio' },
    },
    pendulumStiffness: {
      name: '摆锤约束 stiffness',
      description:
        'constraint.stiffness:1 = 刚性销(等长摆动),调低变弹簧(可拉长回弹);销接的另一半条件是 length = 0 之外的高刚度。',
      control: { type: 'range', min: 0.05, max: 1, step: 0.05 },
    },
    debug: {
      name: 'debug 调试绘制',
      description:
        'world.createDebugGraphic + drawDebug:官方线框叠加(与范例自绘的彩色线框重合,静态体另描绿色)。',
      control: { type: 'boolean' },
    },
  },
  render: renderStackingLab,
  parameters: storySource(stackingLabSource),
} satisfies Meta<StackingLabParams>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StackingLab: Story = {};
