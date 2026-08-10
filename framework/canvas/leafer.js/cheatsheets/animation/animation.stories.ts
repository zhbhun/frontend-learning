import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAnimation,
  type AnimationInstance,
  type AnimationSnapshot,
  type AnimationEasing,
  type AnimationRepeat,
} from './example';

interface AnimationArgs {
  duration: number;
  easing: AnimationEasing;
  repeat: AnimationRepeat;
  running: boolean;
}

const renderInteractive = canvasStory({
  create: createAnimation,
  apply(instance: AnimationInstance, args: AnimationArgs) {
    instance.update(args);
  },
  readout(snapshot: AnimationSnapshot) {
    return [
      ['进度', snapshot.progress],
      ['状态', snapshot.state],
      ['循环', snapshot.loop],
      ['时长', snapshot.duration],
    ];
  },
});

const meta = {
  id: 'animation',
  title: '状态与动画/动画系统',
  tags: ['!dev'],
  args: {
    duration: 1.5,
    easing: 'ease',
    repeat: 'once',
    running: true,
  },
  argTypes: {
    duration: {
      name: '时长（秒）',
      description: '单段动画时长，对应 IAnimateOptions.duration。',
      control: {
        type: 'range',
        min: 0.3,
        max: 3,
        step: 0.1,
      },
    },
    easing: {
      name: '动画曲线',
      description: '缓动曲线 easing，决定运动节奏。',
      control: {
        type: 'select',
      },
      options: [
        'ease',
        'linear',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'back-out',
        'bounce-out',
        'elastic-out',
      ],
    },
    repeat: {
      name: '排队方式',
      description:
        'once 播一次、loop 无限循环、swing 无限往返；改变后会从起点重建动画。',
      control: {
        type: 'inline-radio',
      },
      options: ['once', 'loop', 'swing'],
    },
    running: {
      name: '播放 / 暂停',
      description: '控制动画运行；once 完成后再开启会从头重放。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AnimationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
