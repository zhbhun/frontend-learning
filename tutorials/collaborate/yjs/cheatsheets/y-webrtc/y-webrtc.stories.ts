import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import tabSyncSource from './tab-sync.ts?raw';
import datachannelLoopbackSource from './datachannel-loopback.ts?raw';
import {
  createTabSync,
  type TabSyncInstance,
  type TabSyncSnapshot,
} from './tab-sync';
import {
  createDataChannelLoopback,
  type DataChannelLoopbackInstance,
  type DataChannelLoopbackSnapshot,
} from './datachannel-loopback';

/** 两个范例的控件集合;每个 story 只取自己需要的字段。 */
interface YWebrtcArgs {
  text?: string;
  room?: string;
  password?: string;
  signaling?: boolean;
  connected?: boolean;
  textB?: string;
}

const ROOM_STORAGE_KEY = 'cheatsheet:y-webrtc-room';

/**
 * 默认房间名:持久化到 localStorage,让同一浏览器的两个标签页落进同一房间
 * (BroadcastChannel 近路);不同读者 / 不同浏览器互不撞房。想跨设备互找,
 * 在 Controls 里把房间名改成同一个值即可。
 */
function defaultRoomName(): string {
  try {
    const stored = window.localStorage.getItem(ROOM_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = `cwr-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(ROOM_STORAGE_KEY, created);
    return created;
  } catch {
    return 'cwr-static';
  }
}

const renderTabSync = canvasStory({
  create: createTabSync,
  apply(instance: TabSyncInstance, args: YWebrtcArgs) {
    instance.update({
      text: args.text ?? '你好,y-webrtc!',
      room: args.room ?? 'cwr-static',
      password: args.password ?? '',
      signaling: args.signaling ?? true,
      connected: args.connected ?? true,
    });
  },
  readout(snapshot: TabSyncSnapshot) {
    return [
      ['connected', snapshot.connected ? 'true(在找对等端)' : 'false'],
      ['synced', snapshot.synced ? 'true' : 'false'],
      ['信令连接', snapshot.signaling],
      ['对等端 WebRTC / BC', `${snapshot.webrtcPeers} / ${snapshot.bcPeers}`],
      ['awareness 在线(含本端)', `${snapshot.online} 端`],
      ['本地 update', `${snapshot.localUpdates} 条`],
      ['已接收 update', `${snapshot.received} 条`],
      ['maxConns', snapshot.maxConns],
      ['BC 通道名', snapshot.channel],
      ['最近事件', snapshot.lastEvent],
    ];
  },
  captions: ['本标签页', '对等端(其他标签页 / 浏览器 / 设备)'],
});

const renderDataChannelLoopback = canvasStory({
  create: createDataChannelLoopback,
  apply(instance: DataChannelLoopbackInstance, args: YWebrtcArgs) {
    instance.update({
      textA: args.text ?? '信令只搬运连接信息',
      textB: args.textB ?? '',
      connected: args.connected ?? true,
    });
  },
  readout(snapshot: DataChannelLoopbackSnapshot) {
    return [
      ['连接状态 A / B', `${snapshot.connA} / ${snapshot.connB}`],
      ['ICE 状态 A / B', `${snapshot.iceA} / ${snapshot.iceB}`],
      ['DataChannel', snapshot.channel],
      ['A 本地 / 接收 update', `${snapshot.localUpdatesA} / ${snapshot.receivedA} 条`],
      ['B 本地 / 接收 update', `${snapshot.localUpdatesB} / ${snapshot.receivedB} 条`],
      ['两端一致', snapshot.consistent ? '是' : '否'],
    ];
  },
  captions: ['文档 A(本端)', '文档 B(DataChannel 直连)'],
});

const meta = {
  id: 'y-webrtc',
  title: '同步与持久化/y-webrtc',
  tags: ['!dev'],
} satisfies Meta<YWebrtcArgs>;

export default meta;

type Story = StoryObj<YWebrtcArgs>;

export const TabSync: Story = {
  name: '跨标签页对等发现与同步',
  args: {
    text: '你好,y-webrtc!',
    room: defaultRoomName(),
    password: '',
    signaling: true,
    connected: true,
  },
  argTypes: {
    text: {
      name: '文档内容',
      description: '写入本页 Y.Text;对等端经 BC 或 WebRTC DataChannel 收到。',
      control: {
        type: 'text',
      },
    },
    room: {
      name: '房间名',
      description:
        'P2P 的唯一汇合键:房间名相同的端互找互同步;也是 BroadcastChannel 通道名与密码盐。',
      control: {
        type: 'text',
      },
    },
    password: {
      name: '房间密码',
      description:
        '留空不加密;设置后 BC 消息与信令内容经 AES-GCM 加密,密码不一致的端互相同步不上。',
      control: {
        type: 'text',
      },
    },
    signaling: {
      name: '连接信令服务器',
      description:
        '勾选 = 默认公共信令地址;取消 = signaling: [],不连任何信令服务器,仅 BroadcastChannel 近路。',
      control: {
        type: 'boolean',
      },
    },
    connected: {
      name: '加入房间',
      description: '对应 provider.connect() / disconnect()。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderTabSync,
  parameters: storySource(tabSyncSource),
};

export const DataChannelLoopback: Story = {
  name: '手动信令与 DataChannel 直连',
  args: {
    text: '信令只搬运连接信息',
    textB: '',
    connected: true,
  },
  argTypes: {
    text: {
      name: '文档 A 内容',
      description: '写入文档 A;通道打开时经 DataChannel 同步到 B。',
      control: {
        type: 'text',
      },
    },
    textB: {
      name: '文档 B 内容',
      description: '写入文档 B;P2P 是双向的,B 的编辑同样直达 A。',
      control: {
        type: 'text',
      },
    },
    connected: {
      name: '建立连接',
      description:
        '勾选 = 手工交换 offer / answer / ICE 候选并打开 DataChannel;取消 = 断开,断开期间的编辑在重新建连握手后自动追平。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderDataChannelLoopback,
  parameters: storySource(datachannelLoopbackSource),
};
