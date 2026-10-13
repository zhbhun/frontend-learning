import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import playbackControlSource from './playback-control.ts?raw';
import {
  createPlaybackControl,
  type PlaybackControlInstance,
  type PlaybackControlSnapshot,
} from './playback-control';

interface PlaybackControlArgs {
  action: 'play' | 'pause' | 'stop' | 'gotoMid';
  speed: number;
  direction: number;
  targetFrame: number;
  isFrame: boolean;
}

const renderPlaybackControl = canvasStory({
  create: createPlaybackControl,
  apply(instance: PlaybackControlInstance, args: PlaybackControlArgs) {
    instance.update(args);
  },
  readout(snapshot: PlaybackControlSnapshot) {
    return [
      ['当前帧', snapshot.frame],
      ['速度', snapshot.speed],
      ['方向', snapshot.direction],
      ['播放状态', snapshot.status],
    ];
  },
});

const meta = {
  id: 'playback-control',
  title: 'lottie-web 核心/播放控制',
  tags: ['!dev'],
  args: {
    action: 'play',
    speed: 1,
    direction: 1,
    targetFrame: 60,
    isFrame: false,
  },
  argTypes: {
    action: {
      name: '动作',
      description: '选择即触发一次对应调用；goToAndPlay 跳到第 60 帧（中点）后继续播。',
      options: ['play', 'pause', 'stop', 'gotoMid'],
      control: {
        type: 'select',
        labels: {
          play: 'play() 播放',
          pause: 'pause() 暂停',
          stop: 'stop() 停止',
          gotoMid: 'goToAndPlay(60, true) 跳到中点',
        },
      },
    },
    speed: {
      name: '速度',
      description: 'setSpeed 的入参：1 常速，大于 1 加速，小于 1 减速。',
      control: {
        type: 'range',
        min: 0.25,
        max: 3,
        step: 0.25,
      },
    },
    direction: {
      name: '方向',
      description: 'setDirection 的入参：1 正向，-1 反向；对播放中的实例原地掉头。',
      options: [1, -1],
      control: {
        type: 'select',
        labels: {
          '1': '1（正向）',
          '-1': '-1（反向）',
        },
      },
    },
    targetFrame: {
      name: '目标帧',
      description: 'goToAndStop 的跳转目标，滑杆以帧为刻度（0–120）；按毫秒模式（isFrame 关）会先把帧号换成毫秒再传入。',
      control: {
        type: 'range',
        min: 0,
        max: 120,
        step: 1,
      },
    },
    isFrame: {
      name: 'isFrame（按帧）',
      description: 'goToAndStop 的第二个参数：false（API 默认）按毫秒，true 按帧。',
      control: { type: 'boolean' },
    },
  },
  render: renderPlaybackControl,
  parameters: storySource(playbackControlSource),
} satisfies Meta<PlaybackControlArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlaybackControl: Story = {};
