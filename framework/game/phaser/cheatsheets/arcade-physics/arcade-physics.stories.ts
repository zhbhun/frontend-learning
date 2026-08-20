import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import projectileLabSource from './projectile-lab.ts?raw';
import {
  createProjectileLab,
  type ProjectileLabInstance,
  type ProjectileLabParams,
  type ProjectileLabSnapshot,
} from './projectile-lab';

function pt(x: number, y: number): string {
  return `(${x}, ${y})`;
}

function flags(f: ProjectileLabSnapshot['blocked']): string {
  const on = (['up', 'down', 'left', 'right'] as const)
    .filter((k) => f[k])
    .join('·');
  return on ? `${on} = true` : 'none(未接触)';
}

const renderProjectileLab = canvasStory({
  create: createProjectileLab,
  apply(instance: ProjectileLabInstance, args: ProjectileLabParams) {
    instance.applyParams(args);
  },
  readout(snapshot: ProjectileLabSnapshot) {
    return [
      ['velocity', `${pt(snapshot.vx, snapshot.vy)} px/s`],
      ['speed(速度大小)', `${snapshot.speed} px/s`],
      ['acceleration', `${pt(snapshot.ax, snapshot.ay)} px/s²`],
      [
        '生效重力',
        `world.gravity.y = ${snapshot.worldGravityY} · allowGravity = ${snapshot.allowGravity} → ${snapshot.effectiveGravityY} px/s²`,
      ],
      ['position(对象坐标)', pt(snapshot.x, snapshot.y)],
      [
        '本帧位移 deltaX/Y',
        `${pt(snapshot.dx, snapshot.dy)} px(固定步长 1/60 s,≈ velocity ÷ 60)`,
      ],
      ['blocked(边界/静态体)', flags(snapshot.blocked)],
      [
        'touching(动态体之间)',
        flags(snapshot.touching) + (snapshot.touching.none ? '(本课单刚体,见 3.2)' : ''),
      ],
      ['worldbounds 反弹计数', `${snapshot.bounces} 次(body.onWorldBounds = true)`],
    ];
  },
  captions: ['点击画布发射 · 橙色残影是轨迹,绿色箭头是速度矢量'],
});

const meta = {
  id: 'arcade-physics',
  title: '物理与碰撞/Arcade 物理',
  tags: ['!dev'],
  args: {
    gravityY: 300,
    launchSpeed: 260,
    launchAngle: -45,
    bounce: 0.6,
    drag: 0,
    allowGravity: true,
    collideWorldBounds: true,
    debug: false,
  },
  argTypes: {
    gravityY: {
      name: '重力 y',
      description:
        'this.physics.world.gravity.y,单位 px/s²:每步把 vy 拉大该值 ÷ 60;负值向上,0 为失重直线。',
      control: { type: 'range', min: -400, max: 1200, step: 50 },
    },
    launchSpeed: {
      name: '初速度',
      description:
        '发射速度(px/s),经 velocityFromAngle 按发射角分解为 vx / vy;点击画布后生效。',
      control: { type: 'range', min: 50, max: 600, step: 10 },
    },
    launchAngle: {
      name: '发射角',
      description:
        'velocityFromAngle 的角度参数:度,0 = 水平向右,负值向上,顺时针为正;发射台旁的指示线同步。',
      control: { type: 'range', min: -80, max: 80, step: 5 },
    },
    bounce: {
      name: 'bounce 反弹',
      description:
        'setBounce:撞边界速度乘 -bounce。0 贴墙停死,1 完全弹性永不衰减,可大于 1(越弹越快)。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    drag: {
      name: 'drag 阻力',
      description:
        'setDrag(px/s²,线性):该轴加速度为 0 时把速度拉向 0,两轴同值;空气感 / 滑行减速。',
      control: { type: 'range', min: 0, max: 200, step: 10 },
    },
    allowGravity: {
      name: 'allowGravity',
      description:
        'setAllowGravity:默认 true。false 时重力完全不参与积分,速度保持不变(自机、子弹常用)。',
      control: { type: 'boolean' },
    },
    collideWorldBounds: {
      name: 'collideWorldBounds',
      description:
        'setCollideWorldBounds:默认 false。true 时被世界边界(默认 = 画布尺寸)钳制并按 bounce 反弹。',
      control: { type: 'boolean' },
    },
    debug: {
      name: 'debug 调试绘制',
      description:
        'world.createDebugGraphic + drawDebug:品红描碰撞盒、绿色描速度矢量(与范例箭头重合)。',
      control: { type: 'boolean' },
    },
  },
  render: renderProjectileLab,
  parameters: storySource(projectileLabSource),
} satisfies Meta<ProjectileLabParams>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProjectileLab: Story = {};
