import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import webComponentsSource from './web-components.ts?raw';
import {
  createWebComponents,
  type WebComponentsInstance,
  type WebComponentsSnapshot,
} from './web-components';

interface WebComponentsArgs {
  autoplay: boolean;
  loop: boolean;
  speed: number;
}

const renderPlayer = canvasStory({
  create: createWebComponents,
  apply(instance: WebComponentsInstance, args: WebComponentsArgs) {
    instance.update(args);
  },
  readout(snapshot: WebComponentsSnapshot) {
    return [
      ['当前帧', snapshot.frame],
      ['播放速度', `${snapshot.speed}×`],
      ['播放状态', snapshot.status],
      ['已循环次数', snapshot.loops],
    ];
  },
});

const meta = {
  id: 'web-components',
  title: '交互与生态/播放器组件',
  tags: ['!dev'],
  args: {
    autoplay: true,
    loop: true,
    speed: 1,
  },
  argTypes: {
    autoplay: {
      name: 'autoplay',
      description: '数据就绪后是否自动播放；加载期参数，切换后重建组件元素。',
      control: { type: 'boolean' },
    },
    loop: {
      name: 'loop',
      description: '循环播放；通过实例方法 setLoop 热更新，不重建。',
      control: { type: 'boolean' },
    },
    speed: {
      name: 'speed',
      description: '播放速度倍率；通过实例方法 setSpeed 热更新。',
      control: {
        type: 'range',
        min: 0.25,
        max: 3,
        step: 0.25,
      },
    },
  },
  render: renderPlayer,
  parameters: storySource(webComponentsSource),
} satisfies Meta<WebComponentsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Player: Story = {};
