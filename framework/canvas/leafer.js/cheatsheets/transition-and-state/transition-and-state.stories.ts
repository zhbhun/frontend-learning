import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTransitionState,
  type TransitionStateInstance,
  type TransitionStateSnapshot,
  type TransitionStateName,
  type TransitionEasing,
} from './example';

interface TransitionStateArgs {
  state: TransitionStateName;
  duration: number;
  easing: TransitionEasing;
}

const renderInteractive = canvasStory({
  create: createTransitionState,
  apply(instance: TransitionStateInstance, args: TransitionStateArgs) {
    instance.update(args);
  },
  readout(snapshot: TransitionStateSnapshot) {
    return [
      ['当前状态', snapshot.state],
      ['悬停 hover', snapshot.hover],
      ['按下 press', snapshot.press],
      ['过渡进度', snapshot.progress],
    ];
  },
});

const meta = {
  id: 'transition-and-state',
  title: '状态与动画/过渡与状态',
  tags: ['!dev'],
  args: {
    state: 'primary',
    duration: 0.6,
    easing: 'ease',
  },
  argTypes: {
    state: {
      name: '命名状态 state',
      description:
        '切换 box.state，引擎按当前 transition 缓动到 states[state] 预设样式。',
      control: {
        type: 'select',
      },
      options: ['idle', 'primary', 'danger'],
    },
    duration: {
      name: '过渡时长 duration (秒)',
      description:
        'IAnimateOptions.duration。调大后命名状态切换与悬停 / 按下的过渡都变慢，进度读数更易观察。',
      control: {
        type: 'range',
        min: 0,
        max: 2,
        step: 0.1,
      },
    },
    easing: {
      name: '缓动 easing',
      description: 'IAnimateOptions.easing，状态进入时的曲线；pressStyle 退出固定用 bounce-out。',
      control: {
        type: 'select',
      },
      options: [
        'ease',
        'linear',
        'ease-in-out',
        'back-out',
        'bounce-out',
        'elastic-out',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TransitionStateArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
