import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import timerLabSource from './timer-lab.ts?raw';
import timerConsoleSource from './timer-console.ts?raw';
import {
  createTimerLab,
  type TimerLabInstance,
  type TimerLabParams,
  type TimerLabSnapshot,
} from './timer-lab';
import {
  createTimerConsole,
  type TimerConsoleInstance,
  type TimerConsoleParams,
  type TimerConsoleSnapshot,
} from './timer-console';

/** 数值读数统一取一位小数,整数省去小数位;百分比取一位小数。 */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const renderTimerLab = canvasStory({
  create: createTimerLab,
  apply(instance: TimerLabInstance, args: TimerLabParams) {
    instance.applyTimer(args);
  },
  readout(snapshot: TimerLabSnapshot) {
    return [
      [
        '已触发 / 预计',
        Number.isFinite(snapshot.expected)
          ? `${snapshot.fired} / ${snapshot.expected}`
          : `${snapshot.fired} / ∞(无限)`,
      ],
      [
        'getRepeatCount() 剩余',
        snapshot.repeatCount > 9_999_999
          ? `${snapshot.repeatCount}(loop / repeat: -1)`
          : String(snapshot.repeatCount),
      ],
      ['getElapsed() 当前轮', `${num(snapshot.elapsed)} ms`],
      [
        'getProgress / getOverallProgress',
        `${pct(snapshot.progress)} / ${pct(snapshot.overallProgress)}`,
      ],
      ['getRemaining() 距下次', `${num(Math.max(0, snapshot.remaining))} ms`],
      ['事件 paused', String(snapshot.paused)],
    ];
  },
  captions: ['进度条 = 当前轮 elapsed / delay · 参数变化即 removeEvent + addEvent 重建'],
});

const renderTimerConsole = canvasStory({
  create: createTimerConsole,
  apply(instance: TimerConsoleInstance, args: TimerConsoleParams) {
    instance.applyClockScale(args);
  },
  readout(snapshot: TimerConsoleSnapshot) {
    return [
      ['已触发次数', String(snapshot.fired)],
      [
        'repeatCount 剩余 / elapsed',
        `${snapshot.repeatCount} / ${num(snapshot.elapsed)} ms`,
      ],
      [
        'progress / 距下次',
        `${pct(snapshot.progress)} / ${num(Math.max(0, snapshot.remaining))} ms`,
      ],
      ['事件 paused', String(snapshot.eventPaused)],
      [
        'Clock.timeScale(目标场景)',
        num(snapshot.clockTimeScale),
      ],
      [
        '目标场景游戏时长',
        `${num(Math.round(snapshot.targetClockTime))} ms(场景暂停时冻结)`,
      ],
      [
        '控制台场景游戏时长',
        `${num(Math.round(snapshot.consoleClockTime))} ms(对照,一直走)`,
      ],
    ];
  },
  captions: ['目标场景 delay 1000 · repeat 3 · 按钮直达事件 / Clock / 场景级 API'],
});

/** 两个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface TimersArgs extends TimerLabParams, TimerConsoleParams {}

const meta: Meta<TimersArgs> = {
  id: 'timers',
  title: '资源与显示/时钟与计时器',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderTimerLab,
};

export default meta;

type Story = StoryObj<TimersArgs>;

export const TimerLab: Story = {
  args: {
    delay: 1000,
    repeat: 0,
    loop: false,
    startAt: 0,
    timeScale: 1,
    paused: false,
  },
  argTypes: {
    delay: {
      name: '间隔(ms)',
      description: 'delay:每轮触发间隔,ms;没有独立的 loopDelay,每轮都是它。',
      control: { type: 'range', min: 200, max: 2000, step: 100 },
    },
    repeat: {
      name: '重复次数',
      description: 'repeat:额外重复次数,共触发 repeat + 1 次;-1 无限(与 loop 等价)。',
      control: { type: 'range', min: -1, max: 4, step: 1 },
    },
    loop: {
      name: '无限循环',
      description: 'loop:true 无限循环,等价 repeat: -1;两者同开以 loop 为准(仍是无限)。',
      control: { type: 'boolean' },
    },
    startAt: {
      name: '预置elapsed(ms)',
      description: 'startAt:预置 elapsed 让首轮提前触发;不影响后续轮次的间隔。',
      control: { type: 'range', min: 0, max: 1500, step: 250 },
    },
    timeScale: {
      name: '事件时间缩放',
      description: 'TimerEvent.timeScale:只缩放这一个事件,与 Clock.timeScale 相乘生效。',
      control: { type: 'range', min: 0.25, max: 3, step: 0.25 },
    },
    paused: {
      name: '暂停创建',
      description: 'paused:true 创建即冻结(elapsed 停在 startAt);Phaser 4 切 paused 属性恢复。',
      control: { type: 'boolean' },
    },
  },
  render: renderTimerLab,
  parameters: storySource(timerLabSource),
};

export const TimerConsole: Story = {
  args: {
    clockTimeScale: 1,
  },
  argTypes: {
    clockTimeScale: {
      name: 'Clock 时间缩放',
      description:
        'this.time.timeScale:缩放目标场景全部 TimerEvent;0 冻结事件,但 Clock.now 与场景游戏时长仍在走。',
      control: { type: 'range', min: 0, max: 2, step: 0.25 },
    },
  },
  render: renderTimerConsole,
  parameters: storySource(timerConsoleSource),
};
