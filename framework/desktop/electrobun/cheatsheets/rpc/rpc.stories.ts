import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import packetFlowSource from './rpc-packet-flow.ts?raw';
import {
  createRpcPacketFlow,
  type CallKind,
  type CallOutcome,
  type PacketFlowInstance,
  type PacketFlowSnapshot,
} from './rpc-packet-flow';

interface PacketFlowArgs {
  callKind: CallKind;
  outcome: CallOutcome;
}

const renderFlow = canvasStory({
  create: createRpcPacketFlow,
  apply(instance: PacketFlowInstance, args: PacketFlowArgs) {
    instance.update(args);
  },
  readout(snapshot: PacketFlowSnapshot) {
    return [
      ['方向', snapshot.direction],
      ['调用侧代码', snapshot.proxyCode],
      ['线上包 1', snapshot.packet1],
      ['线上包 2', snapshot.packet2],
      ['调用侧结果', snapshot.result],
    ];
  },
});

const meta = {
  id: 'rpc',
  title: 'RPC 与通信/自定义 RPC',
  tags: ['!dev'],
  args: {
    callKind: 'view-request',
    outcome: 'ok',
  },
  argTypes: {
    callKind: {
      name: '调用方向',
      description:
        '发起方（视图/主进程）与代理类型（request 有响应，send 单向）的组合。',
      options: ['view-request', 'bun-request', 'view-send', 'bun-send'],
      control: {
        type: 'inline-radio',
        labels: {
          'view-request': '视图→主进程 request',
          'bun-request': '主进程→视图 request',
          'view-send': '视图→主进程 send',
          'bun-send': '主进程→视图 send',
        },
      },
    },
    outcome: {
      name: '处理结果',
      description:
        '仅 request 适用：正常返回、handler 抛错，或超过 maxRequestTime 超时。',
      options: ['ok', 'handler-error', 'timeout'],
      control: {
        type: 'inline-radio',
        labels: {
          ok: '正常返回',
          'handler-error': 'handler 抛错',
          timeout: '超时',
        },
      },
    },
  },
  render: renderFlow,
  parameters: storySource(packetFlowSource),
} satisfies Meta<PacketFlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RpcPacketFlow: Story = {};
