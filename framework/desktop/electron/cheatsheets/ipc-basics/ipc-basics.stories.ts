import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './direction-sim.ts?raw';
import {
  createDirectionSim,
  type DirectionInstance,
  type DirectionKind,
  type DirectionOptions,
  type DirectionSnapshot,
} from './direction-sim';

interface DirectionArgs extends DirectionOptions {
  direction: DirectionKind;
}

const renderInteractive = canvasStory({
  create: createDirectionSim,
  apply(instance: DirectionInstance, args: DirectionArgs) {
    instance.update(args);
  },
  readout(snapshot: DirectionSnapshot) {
    return [
      ['消息方向', snapshot.directionLabel],
      ['发起端', snapshot.senderLabel],
      ['接收端', snapshot.receiverLabel],
      ['通道', snapshot.channelLabel],
      ['回音方式', snapshot.replyLabel],
    ];
  },
});

const meta = {
  id: 'ipc-basics',
  title: '通信/IPC 概念',
  tags: ['!dev'],
  args: {
    direction: 'invoke',
  },
  argTypes: {
    direction: {
      name: '通信方向',
      description: '选择一次跨进程通信的需求，观察对应的标准 API 配对、消息流向与回音方式。',
      control: {
        type: 'radio',
        options: ['invoke', 'send', 'push', 'between'],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<DirectionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
