import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import stressLabSource from './stress-lab.ts?raw';
import {
  createStressLab,
  type StressLabInstance,
  type StressLabParams,
  type StressLabSnapshot,
} from './stress-lab';

function ms(value: number): string {
  return `${value.toFixed(2)} ms`;
}

const renderStressLab = canvasStory({
  create: createStressLab,
  apply(instance: StressLabInstance, args: StressLabParams) {
    instance.apply(args);
  },
  readout(snapshot: StressLabSnapshot) {
    return [
      [
        'FPS / 平均 delta',
        `${snapshot.fps.toFixed(0)} · ${snapshot.avgDelta.toFixed(1)} ms`,
      ],
      [
        '峰值 delta',
        `${snapshot.maxDelta.toFixed(1)} ms(GC 停顿 / 卡顿尖峰看这里)`,
      ],
      [
        '逻辑步 / 渲染耗时',
        `${ms(snapshot.updateMs)} / ${ms(snapshot.renderMs)}(最近 90 帧均值)`,
      ],
      [
        'draw 调用数',
        snapshot.renderer === 'WebGL'
          ? `${snapshot.draws}(包装 renderer.drawElements 计数)`
          : `${snapshot.draws}(Canvas renderer.drawCount)`,
      ],
      [
        '渲染器 / 纹理单元 / 单批 quad',
        `${snapshot.renderer} · maxTextures ${snapshot.maxTextures ?? '—'} · batchSize ${snapshot.batchSize}`,
      ],
      [
        '存活 GL 纹理数',
        snapshot.glTextures === null ? '—(Canvas 无此读数)' : String(snapshot.glTextures),
      ],
      [
        '成员 / 存活 / 可见',
        `${snapshot.total} / ${snapshot.alive} / ${snapshot.visible}(摄像机 x ${Math.round(snapshot.cameraX)})`,
      ],
      [
        '池复用 / 新建 / 销毁',
        `${snapshot.reused} / ${snapshot.created} / ${snapshot.destroyed}(累计)`,
      ],
      [
        'JS 堆用量',
        snapshot.heapMb === null ? '—(当前浏览器不暴露 performance.memory)' : `${snapshot.heapMb.toFixed(1)} MB`,
      ],
    ];
  },
  captions: [
    '对象数量 × 来源(池复用 / 新建)× 更新逻辑(复用 / 每帧分配)× 剔除(无 / 手动)四档对照',
    '同纹理的几千个精灵通常只有个位数 draw 调用——批处理在起作用,这不是读数故障',
  ],
});

const meta: Meta<StressLabParams> = {
  id: 'performance',
  title: '进阶/性能优化',
  tags: ['!dev'],
  render: renderStressLab,
};

export default meta;

type Story = StoryObj<StressLabParams>;

export const StressLab: Story = {
  args: {
    count: 500,
    source: 'pool',
    updateMode: 'reuse',
    cullMode: 'none',
  },
  argTypes: {
    count: {
      name: '对象数量',
      description: '场上存活对象的目标数量:调大后先看逻辑步耗时与 FPS 的变化,再看渲染耗时。',
      control: { type: 'radio', options: [100, 500, 1000, 2000] },
    },
    source: {
      name: '对象来源',
      description:
        'pool:退役对象 killAndHide 归还池,get() 复用;alloc:退役即 destroy,补充走全新新建。切换会整场重建并清零计数。',
      control: { type: 'radio', labels: { pool: '池复用', alloc: '每次新建' } },
    },
    updateMode: {
      name: '更新逻辑',
      description:
        'reuse:预分配工作对象反复改写;alloc:每个对象每帧 new 一个 Vector2、一个对象字面量并拼接字符串(反面教材),制造 GC 压力。',
      control: { type: 'radio', labels: { reuse: '复用对象', alloc: '每帧分配' } },
    },
    cullMode: {
      name: '剔除',
      description:
        'none:出视口的对象照常进批处理(精灵无自动剔除);manual:每帧用 camera.worldView 手动判活,出视口即隐藏。',
      control: { type: 'radio', labels: { none: '不剔除', manual: '手动判活' } },
    },
  },
  render: renderStressLab,
  parameters: storySource(stressLabSource),
};
