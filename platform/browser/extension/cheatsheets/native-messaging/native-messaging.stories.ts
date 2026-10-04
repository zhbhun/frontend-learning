import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import frameSource from './frame.ts?raw';
import lifecycleSource from './lifecycle.ts?raw';
import {
  createFrameExample,
  type MessageFrameInstance,
  type MessageFrameSnapshot,
} from './frame';
import {
  createLifecycleExample,
  type LifecycleInstance,
  type LifecycleSnapshot,
} from './lifecycle';

interface FrameArgs {
  fill: number;
  unicode: boolean;
}

interface SendOnceArgs {
  crash: boolean;
}

interface PortChatArgs {
  rounds: number;
  disconnect: boolean;
  crash: boolean;
}

const renderFrame = canvasStory({
  create: createFrameExample,
  apply(instance: MessageFrameInstance, args: FrameArgs) {
    instance.update({ fill: args.fill, unicode: args.unicode });
  },
  readout(snapshot: MessageFrameSnapshot) {
    return [
      ['text 字符数', snapshot.textChars.toLocaleString('en-US')],
      ['消息 JSON 字节数', snapshot.messageBytes.toLocaleString('en-US')],
      ['帧头（小端 hex）', snapshot.headerHex],
      ['host→Chrome 上限', snapshot.limitLabel],
    ];
  },
  captions: ['帧结构示意：4 字节小端长度头 + UTF-8 JSON 负载', '同一字符数下中文填充的字节数约为 ASCII 的 3 倍'],
});

const renderSendOnce = canvasStory({
  create: createLifecycleExample,
  apply(instance: LifecycleInstance, args: SendOnceArgs) {
    instance.update({ mode: 'send', rounds: 0, disconnect: false, crash: args.crash });
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['入口 API', snapshot.modeLabel],
      ['host 进程启动次数', snapshot.hostStarts],
      ['扩展侧结果', snapshot.outcome],
      ['host 进程状态', snapshot.process],
    ];
  },
  captions: ['sendNativeMessage 时序（模拟）', '错误文案与 Chrome 真实输出一致'],
});

const renderPortChat = canvasStory({
  create: createLifecycleExample,
  apply(instance: LifecycleInstance, args: PortChatArgs) {
    instance.update({
      mode: 'connect',
      rounds: args.rounds,
      disconnect: args.disconnect,
      crash: args.crash,
    });
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['入口 API', snapshot.modeLabel],
      ['host 进程启动次数', snapshot.hostStarts],
      ['往返轮数', snapshot.roundsLabel],
      ['扩展侧结果', snapshot.outcome],
      ['host 进程状态', snapshot.process],
    ];
  },
  captions: ['connectNative 时序（模拟）', '右泳道红条为 host 进程存活区间'],
});

const meta = {
  id: 'native-messaging',
  title: '进阶能力/Native Messaging',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const MessageFrame: StoryObj<FrameArgs> = {
  args: {
    fill: 64,
    unicode: false,
  },
  argTypes: {
    fill: {
      name: 'text 填充字符数',
      description: 'text 字段的填充字符数，推到 1 MiB 边界附近观察帧头变化。',
      control: { type: 'range', min: 0, max: 1100000, step: 50000 },
    },
    unicode: {
      name: '中文填充（UTF-8 多字节）',
      description: '用「中」还是「a」填充；中文每字符 3 字节，用来观察字节数与字符数的差异。',
      control: { type: 'boolean' },
    },
  },
  render: renderFrame,
  parameters: storySource(frameSource),
};

export const SendOnce: StoryObj<SendOnceArgs> = {
  args: {
    crash: false,
  },
  argTypes: {
    crash: {
      name: 'host 提前退出',
      description: 'host 在写响应帧之前退出，stdout 管道断裂。',
      control: { type: 'boolean' },
    },
  },
  render: renderSendOnce,
  parameters: storySource(lifecycleSource),
};

export const PortChat: StoryObj<PortChatArgs> = {
  args: {
    rounds: 3,
    disconnect: true,
    crash: false,
  },
  argTypes: {
    rounds: {
      name: '往返轮数',
      description: '同一条端口上 postMessage / onMessage 的往返轮数。',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    disconnect: {
      name: '发送方调用 port.disconnect()',
      description: '收发结束后是否主动断开端口；断开后 host 进程退出。',
      control: { type: 'boolean' },
    },
    crash: {
      name: 'host 提前退出',
      description: 'host 在某一轮收发后提前退出，触发 onDisconnect 与 lastError。',
      control: { type: 'boolean' },
    },
  },
  render: renderPortChat,
  parameters: storySource(lifecycleSource),
};
