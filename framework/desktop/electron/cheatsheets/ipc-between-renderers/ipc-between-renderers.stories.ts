import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './route-sim.ts?raw';
import {
  createRouteSim,
  type RouteSimInstance,
  type RouteSimOptions,
  type RouteSimSnapshot,
} from './route-sim';

interface RouteSimArgs {
  route: RouteSimOptions['route'];
  windowB: RouteSimOptions['windowB'];
}

const renderInteractive = canvasStory({
  create: createRouteSim,
  apply(instance: RouteSimInstance, args: RouteSimArgs) {
    instance.update(args);
  },
  readout(snapshot: RouteSimSnapshot) {
    return [
      ['通信路线', snapshot.route],
      ['窗口 B', snapshot.windowB],
      ['消息结果', snapshot.delivered ? '到达' : '丢失'],
      [
        '主进程可见性',
        snapshot.mainSeesMessage ? '看到（转发中心）' : '看不到（专线）',
      ],
    ];
  },
});

const meta = {
  id: 'ipc-between-renderers',
  title: '通信/渲染进程间通信',
  tags: ['!dev'],
  args: {
    route: '主进程中转',
    windowB: '在线',
  },
  argTypes: {
    route: {
      name: '通信路线',
      description: '窗口 A 与窗口 B 之间选哪条路线传消息。',
      control: {
        type: 'radio',
        options: ['主进程中转', 'MessagePort 直连'],
      },
    },
    windowB: {
      name: '窗口 B 状态',
      description: '接收端窗口在线，还是刷新后尚未重建连接。',
      control: {
        type: 'radio',
        options: ['在线', '刷新后未重建'],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<RouteSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
