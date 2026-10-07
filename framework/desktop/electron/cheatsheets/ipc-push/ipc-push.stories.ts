import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './push-sim.ts?raw';
import {
  createPushSim,
  type PushSimInstance,
  type PushSimOptions,
  type PushSimSnapshot,
} from './push-sim';

interface PushSimArgs {
  pushTiming: PushSimOptions['pushTiming'];
  listenAt: PushSimOptions['listenAt'];
}

const renderInteractive = canvasStory({
  create: createPushSim,
  apply(instance: PushSimInstance, args: PushSimArgs) {
    instance.update(args);
  },
  readout(snapshot: PushSimSnapshot) {
    return [
      ['推送时机', snapshot.pushTiming],
      ['监听注册', snapshot.listenAt],
      ['消息结果', snapshot.delivered ? '到达' : '丢失'],
    ];
  },
});

const meta = {
  id: 'ipc-push',
  title: '通信/主进程推送',
  tags: ['!dev'],
  args: {
    pushTiming: '立即（窗口创建后）',
    listenAt: '页面脚本同步注册',
  },
  argTypes: {
    pushTiming: {
      name: '推送时机',
      description: '主进程在时间线的哪个时刻调用 webContents.send。',
      control: {
        type: 'radio',
        options: ['立即（窗口创建后）', 'did-finish-load 之后', '收到就绪信号后'],
      },
    },
    listenAt: {
      name: '监听注册',
      description: '接收端在时间线的哪个时刻注册 ipcRenderer.on 监听器。',
      control: {
        type: 'radio',
        options: ['preload 里', '页面脚本同步注册', '页面异步初始化后注册'],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<PushSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
