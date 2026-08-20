import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import routingSource from './message-routing.ts?raw';
import {
  createMessageRouting,
  type MessageRoutingInstance,
  type MessageRoutingOptions,
  type MessageRoutingSnapshot,
  type MessageType,
  type SocketState,
  type TrustLevel,
} from './message-routing';

type RoutingArgs = MessageRoutingOptions;

const renderRouting = canvasStory({
  create: createMessageRouting,
  apply(instance: MessageRoutingInstance, args: RoutingArgs) {
    instance.update(args);
  },
  readout(snapshot: MessageRoutingSnapshot) {
    return [
      ['消息类型', snapshot.type],
      ['视图信任级', snapshot.trust],
      ['socket 影响', snapshot.socketEffect],
      ['通道', snapshot.channel],
      ['线上形态', snapshot.wire],
      ['结果', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'architecture',
  title: '进阶/架构原理',
  tags: ['!dev'],
  args: {
    type: 'user-rpc-out',
    trust: 'trusted',
    socket: 'open',
  },
  argTypes: {
    type: {
      name: '消息类型',
      description:
        '用户 RPC 是业务代码的通道；框架内部（webview 标签、拖拽区）与事件上报是框架自身的通道；脚本执行是主进程侧的原生能力。',
      options: [
        'user-rpc-out',
        'user-rpc-in',
        'internal',
        'event',
        'script',
      ] as MessageType[],
      control: {
        type: 'inline-radio',
        labels: {
          'user-rpc-out': '用户 RPC · 视图→bun',
          'user-rpc-in': '用户 RPC · bun→视图',
          internal: '框架内部 · 视图→bun',
          event: '事件上报 · 视图→bun',
          script: '脚本执行 · bun→视图',
        },
      },
    },
    trust: {
      name: '视图信任级',
      description:
        '视图 → bun 的消息指发送方；bun → 视图的消息指目标视图。trusted 与 sandbox 的差异全在 preload 注入与原生桥注册。',
      options: ['trusted', 'sandbox'] as TrustLevel[],
      control: {
        type: 'inline-radio',
        labels: {
          trusted: 'trusted',
          sandbox: 'sandbox',
        },
      },
    },
    socket: {
      name: 'socket 状态',
      description:
        '只影响用户 RPC 的主路径：断开时回落 postMessage 桥或脚本注入；其余通道本就不走 socket。',
      options: ['open', 'down'] as SocketState[],
      control: {
        type: 'inline-radio',
        labels: {
          open: '可用',
          down: '断开',
        },
      },
    },
  },
  render: renderRouting,
  parameters: storySource(routingSource),
} satisfies Meta<RoutingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MessageRouting: Story = {};
