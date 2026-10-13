import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import eventsLifecycleSource from './events-lifecycle.ts?raw';
import {
  createEventsLifecycle,
  type EventsLifecycleInstance,
  type EventsLifecycleSnapshot,
} from './events-lifecycle';

interface EventsLifecycleArgs {
  loop: boolean;
  autoplay: boolean;
}

const renderEventsLifecycle = canvasStory({
  create: createEventsLifecycle,
  apply(instance: EventsLifecycleInstance, args: EventsLifecycleArgs) {
    instance.update(args);
  },
  readout(snapshot: EventsLifecycleSnapshot) {
    return [
      ['播放状态', snapshot.status],
      ['当前帧', snapshot.frame],
      ['已循环次数', snapshot.loops],
      ['事件日志', snapshot.log],
    ];
  },
});

const meta = {
  id: 'events-lifecycle',
  title: 'lottie-web 核心/事件与生命周期',
  tags: ['!dev'],
  args: {
    loop: true,
    autoplay: true,
  },
  argTypes: {
    loop: {
      name: 'loop',
      description:
        '到达末帧后是否从头再播；创建参数，切换后销毁旧实例并重建，日志中会出现 destroy。',
      control: { type: 'boolean' },
    },
    autoplay: {
      name: 'autoplay',
      description:
        '动画数据就绪后是否立即播放；创建参数，切换后销毁旧实例并重建。',
      control: { type: 'boolean' },
    },
  },
  render: renderEventsLifecycle,
  parameters: storySource(eventsLifecycleSource),
} satisfies Meta<EventsLifecycleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EventsLifecycle: Story = {};
