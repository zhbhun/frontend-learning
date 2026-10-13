import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import serverSyncSource from './server-sync.ts?raw';
import broadcastChannelSyncSource from './broadcast-channel-sync.ts?raw';
import {
  createServerSync,
  type ServerSyncInstance,
  type ServerSyncSnapshot,
} from './server-sync';
import {
  createBroadcastChannelSync,
  type BroadcastChannelSyncInstance,
  type BroadcastChannelSyncSnapshot,
} from './broadcast-channel-sync';

/** 两个范例的控件集合；每个 story 只取自己需要的字段。 */
interface YWebsocketArgs {
  text?: string;
  connected?: boolean;
  bc?: boolean;
}

const renderServerSync = canvasStory({
  create: createServerSync,
  apply(instance: ServerSyncInstance, args: YWebsocketArgs) {
    instance.update({
      text: args.text ?? '你好，y-websocket!',
      connected: args.connected ?? true,
    });
  },
  readout(snapshot: ServerSyncSnapshot) {
    return [
      ['连接 A 状态', `${snapshot.statusA} / synced=${snapshot.syncedA}`],
      ['连接 B 状态', `${snapshot.statusB} / synced=${snapshot.syncedB}`],
      ['A 本地 update', `${snapshot.localUpdatesA} 条`],
      ['B 已接收 update', `${snapshot.receivedB} 条`],
      ['两端一致', snapshot.consistent ? '是' : '否'],
      ['重连计数 A / B', `${snapshot.reconnectsA} / ${snapshot.reconnectsB}`],
      ['最近事件', snapshot.lastEvent],
      ['连接 URL', snapshot.url],
    ];
  },
  captions: ['文档 A（可编辑）', '文档 B（经服务器同步）'],
});

const renderBroadcastChannelSync = canvasStory({
  create: createBroadcastChannelSync,
  apply(instance: BroadcastChannelSyncInstance, args: YWebsocketArgs) {
    instance.update({
      text: args.text ?? '不经过网络的同步',
      bc: args.bc ?? true,
    });
  },
  readout(snapshot: BroadcastChannelSyncSnapshot) {
    return [
      [
        'BC 通道 A / B',
        `${snapshot.bcA ? '已接入' : '断开'} / ${snapshot.bcB ? '已接入' : '断开'}`,
      ],
      ['A 本地 update', `${snapshot.localUpdatesA} 条`],
      ['B 已接收 update', `${snapshot.receivedB} 条`],
      ['两端一致', snapshot.consistent ? '是' : '否'],
      ['BC 通道名', snapshot.channel],
    ];
  },
  captions: ['文档 A（可编辑）', '文档 B（同页 BroadcastChannel 直达）'],
});

const meta = {
  id: 'y-websocket',
  title: '同步与持久化/y-websocket',
  tags: ['!dev'],
} satisfies Meta<YWebsocketArgs>;

export default meta;

type Story = StoryObj<YWebsocketArgs>;

export const ServerSync: Story = {
  name: '服务器同步与连接生命周期',
  args: {
    text: '你好，y-websocket!',
    connected: true,
  },
  argTypes: {
    text: {
      name: '文档 A 内容',
      description: '写入文档 A 的 Y.Text；连接状态下经服务器同步到文档 B。',
      control: {
        type: 'text',
      },
    },
    connected: {
      name: '连接服务器',
      description:
        '勾选调用 provider.connect()，取消调用 disconnect()；断开期间的编辑在重连握手后自动追平。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderServerSync,
  parameters: storySource(serverSyncSource),
};

export const BroadcastChannelSync: Story = {
  name: 'BroadcastChannel 同域近路',
  args: {
    text: '不经过网络的同步',
    bc: true,
  },
  argTypes: {
    text: {
      name: '文档 A 内容',
      description: '写入文档 A；BC 开启时经 BroadcastChannel 直达 B，全程零网络。',
      control: {
        type: 'text',
      },
    },
    bc: {
      name: 'BroadcastChannel 同步',
      description:
        '对应 connectBc() / disconnectBc()；两个 Provider 都以 connect: false 创建，从不建立 WebSocket。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderBroadcastChannelSync,
  parameters: storySource(broadcastChannelSyncSource),
};
