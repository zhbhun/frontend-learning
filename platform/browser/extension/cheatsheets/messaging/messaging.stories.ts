import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import oneTimeSource from './one-time.ts?raw';
import portSource from './port.ts?raw';
import {
  createOneTimeExample,
  type OneTimeInstance,
  type OneTimeSnapshot,
  type ResponseMode,
} from './one-time';
import {
  createPortExample,
  type PortInstance,
  type PortSnapshot,
} from './port';

interface OneTimeArgs {
  mode: string;
  delay: number;
}

interface PortArgs {
  rounds: number;
  disconnect: boolean;
}

const MODE_BY_LABEL: Record<string, ResponseMode> = {
  '同步 sendResponse': 'sync',
  '异步 + return true': 'keepalive',
  '异步未 return true': 'no-keepalive',
};

const renderOneTime = canvasStory({
  create: createOneTimeExample,
  apply(instance: OneTimeInstance, args: OneTimeArgs) {
    instance.update({ mode: MODE_BY_LABEL[args.mode], delay: args.delay });
  },
  readout(snapshot: OneTimeSnapshot) {
    return [
      ['监听器返回', snapshot.listenerReturn],
      ['通道存活', snapshot.channel],
      ['发送方 await', snapshot.outcome],
    ];
  },
  captions: ['一次性消息时序（模拟）', '错误文案与 Chrome 真实输出一致'],
});

const renderPort = canvasStory({
  create: createPortExample,
  apply(instance: PortInstance, args: PortArgs) {
    instance.update(args);
  },
  readout(snapshot: PortSnapshot) {
    return [
      ['端口', snapshot.portLabel],
      ['往返轮数', snapshot.rounds],
      ['最终状态', snapshot.finalState],
    ];
  },
  captions: ['端口时序（模拟）', '箭头到达即触发对端 port.onMessage'],
});

const meta = {
  id: 'messaging',
  title: '核心机制/消息通信',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const OneTime: StoryObj<OneTimeArgs> = {
  args: {
    mode: '异步 + return true',
    delay: 600,
  },
  argTypes: {
    mode: {
      name: '响应方式',
      description: 'onMessage 监听器以哪种方式调用 sendResponse。',
      control: { type: 'select' },
      options: ['同步 sendResponse', '异步 + return true', '异步未 return true'],
    },
    delay: {
      name: 'sendResponse 耗时（毫秒）',
      description: '异步分支从监听器返回到调用 sendResponse 之间的等待时间。',
      control: { type: 'range', min: 0, max: 1200, step: 100 },
    },
  },
  render: renderOneTime,
  parameters: storySource(oneTimeSource),
};

export const Port: StoryObj<PortArgs> = {
  args: {
    rounds: 3,
    disconnect: true,
  },
  argTypes: {
    rounds: {
      name: '往返轮数',
      description: '同一条端口上双向收发的轮数。',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    disconnect: {
      name: '发送方调用 port.disconnect()',
      description: '收发结束后是否主动断开端口。',
      control: { type: 'boolean' },
    },
  },
  render: renderPort,
  parameters: storySource(portSource),
};
