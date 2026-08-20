import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import channelSource from './encrypted-channel.ts?raw';
import {
  createEncryptedChannel,
  type ChannelDirection,
  type ChannelState,
  type EncryptedChannelInstance,
  type EncryptedChannelSnapshot,
} from './encrypted-channel';

interface ChannelArgs {
  direction: ChannelDirection;
  channel: ChannelState;
  message: string;
}

const renderChannel = canvasStory({
  create: createEncryptedChannel,
  apply(instance: EncryptedChannelInstance, args: ChannelArgs) {
    instance.update(args);
  },
  readout(snapshot: EncryptedChannelSnapshot) {
    return [
      ['方向', snapshot.direction],
      ['当前通道', snapshot.route],
      ['加密', snapshot.crypto],
      ['线上载荷', snapshot.wire],
      ['本次 IV', snapshot.iv],
      ['解密回读', snapshot.roundtrip],
    ];
  },
});

const meta = {
  id: 'electroview',
  title: 'RPC 与通信/Electroview',
  tags: ['!dev'],
  args: {
    direction: 'view-to-bun',
    channel: 'socket',
    message: '{"type":"message","id":"bunSays","payload":{"text":"hi"}}',
  },
  argTypes: {
    direction: {
      name: '方向',
      description:
        '视图 → bun：rpc.send / rpc.request 发出的消息；bun → 视图：主进程主动下发。',
      options: ['view-to-bun', 'bun-to-view'],
      control: {
        type: 'inline-radio',
        labels: {
          'view-to-bun': '视图 → bun',
          'bun-to-view': 'bun → 视图',
        },
      },
    },
    channel: {
      name: '通道状态',
      description:
        'socket 可用走加密 WebSocket；断开时回落原生桥（postMessage / 脚本注入），不再套加密包。',
      options: ['socket', 'fallback'],
      control: {
        type: 'inline-radio',
        labels: {
          socket: 'socket 可用',
          fallback: 'socket 断开（回落）',
        },
      },
    },
    message: {
      name: '消息内容',
      description: '明文 RPC 包；socket 模式下会实时加密成线上包再解密回读。',
      control: { type: 'text' },
    },
  },
  render: renderChannel,
  parameters: storySource(channelSource),
} satisfies Meta<ChannelArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EncryptedChannel: Story = {};
