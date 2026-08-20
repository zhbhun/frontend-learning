import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import labSource from './timer-lab.ts?raw';
import {
  createTimerLab,
  type TimerLabInstance,
  type TimerLabSnapshot,
} from './timer-lab';

interface TimerArgs {
  loaded: boolean;
  heartbeatMs: number;
  windowMs: number;
  burstCount: number;
  fireBurst: boolean;
  stream: boolean;
}

const renderTimerLab = canvasStory({
  create: createTimerLab,
  apply(instance: TimerLabInstance, args: TimerArgs) {
    instance.update(args);
  },
  readout(snapshot: TimerLabSnapshot) {
    return [
      ['当前状态', snapshot.state],
      ['心跳次数', snapshot.beats],
      ['心跳周期', `${snapshot.heartbeatMs}ms`],
      ['节流执行', `${snapshot.throttleFires} 次`],
      ['防抖执行', `${snapshot.debounceFires} 次`],
      ['effect 标签', snapshot.effects],
    ];
  },
  captions: [
    '连发 / 自动触发流开关只触发动作，重新加载插件后先关再开可再次触发',
    '「节流窗口 / 防抖延迟」变化会撤销旧定时器再重建——effect 标签不变，句柄换新',
  ],
});

const meta = {
  id: 'official-plugins',
  title: '加载器与工程化/官方插件',
  tags: ['!dev'],
  args: {
    loaded: true,
    heartbeatMs: 600,
    windowMs: 800,
    burstCount: 6,
    fireBurst: false,
    stream: false,
  },
  argTypes: {
    loaded: {
      name: '加载插件',
      description:
        '开启时 root.plugin(demoPlugin) 注册消费 timer 服务的插件（inject: [\'timer\']），关闭时 await fiber.dispose()——interval 与两个包装函数的 effect 全部撤销。',
      control: {
        type: 'boolean',
      },
    },
    heartbeatMs: {
      name: '心跳周期',
      description:
        'ctx.interval(callback, delay) 的 delay：变化时先调用旧 disposer 再注册新 interval，心跳读数的节奏随之改变。',
      control: {
        type: 'range',
        min: 200,
        max: 2000,
        step: 100,
      },
    },
    windowMs: {
      name: '节流窗口 / 防抖延迟',
      description:
        '同一毫秒数同时作为 ctx.throttle 的窗口与 ctx.debounce 的延迟，便于横向对比两者行为。',
      control: {
        type: 'range',
        min: 200,
        max: 2000,
        step: 100,
      },
    },
    burstCount: {
      name: '连发次数',
      description:
        '「触发连发」动作在同一时刻同步调用两个包装函数的次数。',
      control: {
        type: 'range',
        min: 1,
        max: 12,
        step: 1,
      },
    },
    fireBurst: {
      name: '触发连发',
      description:
        '从关到开时同步连发 N 次：throttle 立即执行第 1 次、窗口结束时尾随执行 1 次（携带最后一次参数）；debounce 在最后一次触发后一个延迟时执行 1 次。',
      control: {
        type: 'boolean',
      },
    },
    stream: {
      name: '自动触发流',
      description:
        '开启后每 120ms 同时触发两者（小于默认窗口）：throttle 约每个窗口执行一次，debounce 持续被重置而不执行——关闭流后才补执行一次。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderTimerLab,
  parameters: storySource(labSource),
} satisfies Meta<TimerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TimerLab: Story = {};
