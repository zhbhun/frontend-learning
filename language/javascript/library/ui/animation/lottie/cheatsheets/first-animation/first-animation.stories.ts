import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import firstAnimationSource from './first-animation.ts?raw';
import {
  createFirstAnimation,
  type FirstAnimationInstance,
  type FirstAnimationSnapshot,
} from './first-animation';

interface FirstAnimationArgs {
  loop: boolean;
  autoplay: boolean;
}

const renderFirstAnimation = canvasStory({
  create: createFirstAnimation,
  apply(instance: FirstAnimationInstance, args: FirstAnimationArgs) {
    instance.update(args);
  },
  readout(snapshot: FirstAnimationSnapshot) {
    return [
      ['当前帧', snapshot.frame],
      ['播放状态', snapshot.status],
      ['已循环次数', snapshot.loops],
    ];
  },
});

const meta = {
  id: 'first-animation',
  title: '认识与上手/第一次播放',
  tags: ['!dev'],
  args: {
    loop: true,
    autoplay: true,
  },
  argTypes: {
    loop: {
      name: 'loop',
      description: '到达末帧后是否从头再播；创建参数，切换后重建动画实例。',
      control: { type: 'boolean' },
    },
    autoplay: {
      name: 'autoplay',
      description: '动画数据就绪后是否立即开始播放；创建参数，切换后重建动画实例。',
      control: { type: 'boolean' },
    },
  },
  render: renderFirstAnimation,
  parameters: storySource(firstAnimationSource),
} satisfies Meta<FirstAnimationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstAnimation: Story = {};
