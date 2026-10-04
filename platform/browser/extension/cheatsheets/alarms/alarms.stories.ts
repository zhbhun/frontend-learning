import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import intervalVsAlarmsSource from './interval-vs-alarms.ts?raw';
import scheduleSource from './schedule.ts?raw';
import {
  createIntervalVsAlarms,
  type IntervalVsAlarmsInstance,
  type IntervalVsAlarmsSnapshot,
} from './interval-vs-alarms';
import {
  createSchedule,
  type ScheduleInstance,
  type ScheduleParam,
  type ScheduleSnapshot,
} from './schedule';

interface IntervalVsAlarmsArgs {
  interval: number;
}

interface ScheduleArgs {
  param: string;
  minutes: number;
  unpacked: boolean;
  recreate: boolean;
}

const PARAM_BY_LABEL: Record<string, ScheduleParam> = {
  delayInMinutes: 'delay',
  when: 'when',
  periodInMinutes: 'period',
};

const renderIntervalVsAlarms = canvasStory({
  create: createIntervalVsAlarms,
  apply(instance: IntervalVsAlarmsInstance, args: IntervalVsAlarmsArgs) {
    instance.update({ interval: args.interval });
  },
  readout(snapshot: IntervalVsAlarmsSnapshot) {
    return [
      ['任务间隔', snapshot.intervalLabel],
      ['setInterval 触发', snapshot.intervalFires],
      ['alarms 触发', snapshot.alarmFires],
      ['alarms 场景冷启动', snapshot.coldStarts],
    ];
  },
  captions: ['模拟时间轴 0–150 秒：条带为 SW 存活区间，圆点为 create，菱形为到点'],
});

const renderSchedule = canvasStory({
  create: createSchedule,
  apply(instance: ScheduleInstance, args: ScheduleArgs) {
    instance.update({
      param: PARAM_BY_LABEL[args.param],
      minutes: args.minutes,
      unpacked: args.unpacked,
      recreate: args.recreate,
    });
  },
  readout(snapshot: ScheduleSnapshot) {
    return [
      ['时间参数', snapshot.paramLabel],
      ['打包状态', snapshot.packageLabel],
      ['首次触发', snapshot.firstFire],
      ['周期', snapshot.period],
      ['同名重建', snapshot.recreate],
    ];
  },
  captions: ['create 触发计划模拟：空心菱形为请求值，实心菱形为实际执行值'],
});

const meta = {
  id: 'alarms',
  title: '核心机制/定时任务',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const IntervalVsAlarms: StoryObj<IntervalVsAlarmsArgs> = {
  args: {
    interval: 45,
  },
  argTypes: {
    interval: {
      name: '任务间隔（秒）',
      description: '两种调度器使用同一周期执行同一个任务。',
      control: { type: 'range', min: 5, max: 60, step: 5 },
    },
  },
  render: renderIntervalVsAlarms,
  parameters: storySource(intervalVsAlarmsSource),
};

export const Create: StoryObj<ScheduleArgs> = {
  args: {
    param: 'periodInMinutes',
    minutes: 1,
    unpacked: false,
    recreate: false,
  },
  argTypes: {
    param: {
      name: '时间参数',
      description: 'create 的 alarmInfo 采用哪种时间参数。',
      control: { type: 'select' },
      options: ['delayInMinutes', 'when', 'periodInMinutes'],
    },
    minutes: {
      name: '时长（分钟）',
      description: 'delay / when 距创建时刻的距离，或 period 的周期。',
      control: { type: 'range', min: 0.25, max: 5, step: 0.25 },
    },
    unpacked: {
      name: '未打包（开发模式）',
      description: '加载已解压的扩展没有触发频率下限。',
      control: { type: 'boolean' },
    },
    recreate: {
      name: '20 秒后同名 create',
      description: '在时间轴第 20 秒用同名再 create 一次，观察计划重排。',
      control: { type: 'boolean' },
    },
  },
  render: renderSchedule,
  parameters: storySource(scheduleSource),
};
