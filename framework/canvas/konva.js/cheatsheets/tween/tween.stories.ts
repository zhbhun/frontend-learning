import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createEasingTween,
  createPlayback,
  EASING_NAMES,
  PLAYBACK_ACTIONS,
  type EasingInstance,
  type EasingSnapshot,
  type PlaybackInstance,
  type PlaybackSnapshot,
  type PlaybackAction,
} from './example';

interface EasingArgs {
  easing: string;
  duration: number;
}

interface PlaybackArgs {
  action: PlaybackAction;
  seekTime: number;
}

const renderEasing = canvasStory({
  create: createEasingTween,
  apply(instance: EasingInstance, args: EasingArgs) {
    instance.update(args);
  },
  readout(snapshot: EasingSnapshot) {
    return [
      ['缓动函数', snapshot.easing],
      ['时长 s', snapshot.duration],
      ['进度 %', Math.round(snapshot.progress * 100)],
    ];
  },
});

const renderPlayback = canvasStory({
  create: createPlayback,
  apply(instance: PlaybackInstance, args: PlaybackArgs) {
    instance.update(args);
  },
  readout(snapshot: PlaybackSnapshot) {
    return [
      ['执行方法', snapshot.action],
      ['状态', snapshot.state],
      ['进度 %', Math.round(snapshot.progress * 100)],
    ];
  },
});

const meta = {
  id: 'tween',
  title: '动画/补间与缓动',
  tags: ['!dev'],
  parameters: storySource(exampleSource),
} satisfies Meta;

export default meta;

/**
 * 缓动曲线：圆球沿轨道往返补间（yoyo），切换缓动函数与时长，
 * 上方曲线随之重绘，圆球运动速度与曲线形状一一对应。
 */
export const EasingDemo: StoryObj<EasingArgs> = {
  args: {
    easing: 'EaseInOut',
    duration: 2,
  },
  argTypes: {
    easing: {
      name: '缓动函数',
      description:
        '取自 Konva.Easings 的 16 个函数。默认 Linear（匀速）；下方表格按家族分组。',
      control: { type: 'select' },
      options: [...EASING_NAMES],
    },
    duration: {
      name: '时长 s',
      description: '单次正向补间时长，秒。duration 默认 0.3，这里允许更长以便观察。',
      control: { type: 'range', min: 0.5, max: 4, step: 0.1 },
    },
  },
  render: renderEasing,
};

/**
 * 播放控制：固定 EaseInOut 的单向补间，选择方法调用
 * play / pause / reverse / reset / finish / seek。
 */
export const Playback: StoryObj<PlaybackArgs> = {
  args: {
    action: 'play',
    seekTime: 1,
  },
  argTypes: {
    action: {
      name: '执行方法',
      description:
        'play 正向播放 / pause 暂停 / reverse 反向 / reset 回起点 / finish 到终点 / seek 跳到指定时间。',
      control: { type: 'select' },
      options: [...PLAYBACK_ACTIONS],
    },
    seekTime: {
      name: 'seek 位置 s',
      description: '仅 seek 生效：跳到的时间，秒（0–2）。',
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
    },
  },
  render: renderPlayback,
};
