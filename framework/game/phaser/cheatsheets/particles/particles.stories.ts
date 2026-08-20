import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import emitterLabSource from './emitter-lab.ts?raw';
import {
  createParticlesLab,
  type EmitterStatus,
  type ParticlesInstance,
  type ParticlesParams,
  type ParticlesSnapshot,
} from './emitter-lab';

const renderParticlesLab = canvasStory({
  create: createParticlesLab,
  apply(instance: ParticlesInstance, args: ParticlesParams) {
    instance.applyParams(args);
  },
  readout(snapshot: ParticlesSnapshot) {
    const line = (s: EmitterStatus) => `${s.alive} 存活 / 池 ${s.pool}`;
    return [
      ['喷泉(连续发射)', line(snapshot.fountain)],
      ['喷泉累计发射', `${snapshot.fountain.emittedTotal} 次`],
      [
        'emitting(喷泉)',
        snapshot.fountain.emitting ? 'true(发射中)' : 'false(已 stop)',
      ],
      ['尾迹(follow 方块)', line(snapshot.trail)],
      [
        'follow 目标坐标',
        `(${snapshot.trail.target.x}, ${snapshot.trail.target.y})`,
      ],
      ['爆发(explode)', line(snapshot.burst)],
      [
        '当前配置',
        `frequency ${snapshot.frequency}ms · quantity ${snapshot.quantity} · speed ${snapshot.speed} · lifespan ${snapshot.lifespan}ms · gravityY ${snapshot.gravityY}`,
      ],
      ['tint / blendMode', `${snapshot.tint} · ${snapshot.blendMode}`],
      ['最近粒子事件', snapshot.lastEvent],
    ];
  },
  captions: [
    '点击画布空白处在点击位置 explode 爆发 · STOP 只停发射,存量粒子活完寿命,归零后触发 complete',
    '喷泉参数全部热调:改 speed / lifespan / frequency 只影响之后出生的粒子,改 scale 曲线立即作用于空中粒子',
  ],
});

const meta = {
  id: 'particles',
  title: '音频与粒子/粒子',
  tags: ['!dev'],
  args: {
    speed: 160,
    lifespan: 1500,
    frequency: 30,
    quantity: 2,
    scaleStart: 1.4,
    scaleEnd: 0,
    ease: 'Cubic.out',
    gravityY: 220,
    tintMode: 'random',
    tintColor: '#66e0ff',
    blendAdd: true,
    emitZone: false,
    deathZone: false,
    explodeCount: 60,
  },
  argTypes: {
    speed: {
      name: '初速 speed(px/s)',
      description:
        'radial 模式的初速:方向由 angle 决定,数值越大飞得越远;受 gravityY 拉回形成抛物线。',
      control: { type: 'range', min: 0, max: 400, step: 10 },
    },
    lifespan: {
      name: '寿命 lifespan(ms)',
      description:
        '粒子存活的毫秒数,是曲线插值的自变量(lifeT 0→1)。emit-only:修改后只对之后出生的粒子生效。',
      control: { type: 'range', min: 250, max: 4000, step: 250 },
    },
    frequency: {
      name: '发射间隔 frequency(ms)',
      description:
        '流动模式两批发射的间隔;0 = 每个逻辑帧一批(60fps 下即每秒 60 批 × quantity 个)。',
      control: { type: 'range', min: 0, max: 200, step: 10 },
    },
    quantity: {
      name: '每批数量 quantity',
      description: '每个发射周期一次性喷出的粒子数;explode(count) 的缺省值也取自它。',
      control: { type: 'range', min: 1, max: 8, step: 1 },
    },
    scaleStart: {
      name: 'scale 曲线 start',
      description: '粒子出生时的大小倍率,scale: { start, end, ease } 的起点。',
      control: { type: 'range', min: 0.2, max: 3, step: 0.1 },
    },
    scaleEnd: {
      name: 'scale 曲线 end',
      description: '粒子死亡时的大小倍率;start → end 沿寿命进度插值,热调立即作用于空中粒子。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    ease: {
      name: 'scale 缓动 ease',
      description:
        '曲线插值的缓动函数:Linear 匀速收缩;Quad.out / Cubic.out 先快后慢;Bounce.out 弹跳收尾。',
      options: ['Linear', 'Quad.out', 'Cubic.out', 'Bounce.out'] as ParticlesParams['ease'][],
      control: { type: 'inline-radio' },
    },
    gravityY: {
      name: '重力 gravityY(px/s²)',
      description: '作用于粒子的竖直加速度(不是物理引擎,粒子不受碰撞);喷泉与爆发共用。',
      control: { type: 'range', min: 0, max: 600, step: 20 },
    },
    tintMode: {
      name: 'tint 模式',
      description:
        'solid = 单色(取下方颜色);random = 出生时从随机色数组抽一个。tint 需要 WebGL 渲染器。',
      options: ['solid', 'random'] as ParticlesParams['tintMode'][],
      control: { type: 'inline-radio' },
    },
    tintColor: {
      name: 'tint 颜色(solid)',
      description: 'tint 模式为 solid 时使用的颜色,配合白色柔边纹理即发光粒子。',
      control: { type: 'color' },
    },
    blendAdd: {
      name: 'ADD 发光(blendMode)',
      description:
        '开启后发射器用 blendMode ADD 叠加混色,重叠粒子互相增亮形成光晕;关闭则 NORMAL 普通绘制。',
      control: { type: 'boolean' },
    },
    emitZone: {
      name: 'edge 发射区(圆环边线)',
      description:
        '开启后粒子从发射器周围的圆形边线(EdgeZone,quantity 48 个采样点)出生,而非中心点。',
      control: { type: 'boolean' },
    },
    deathZone: {
      name: '地面死亡区(deathZone)',
      description:
        '开启后粒子进入地面矩形(onEnter)立即死亡——lifespan 未走完也会被截断,readout 的存活数随之下降。',
      control: { type: 'boolean' },
    },
    explodeCount: {
      name: '爆发数量 explode(count)',
      description: '点击画布时一次 explode 喷出的粒子数;爆发用独立发射器,不影响喷泉的流动模式。',
      control: { type: 'range', min: 5, max: 200, step: 5 },
    },
  },
  render: renderParticlesLab,
  parameters: storySource(emitterLabSource),
} satisfies Meta<ParticlesParams>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmitterLab: Story = {};
