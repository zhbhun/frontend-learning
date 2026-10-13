import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import meshingDemoSource from './meshing-demo.ts?raw';
import {
  createMeshingDemo,
  type MeshingDemoInstance,
  type MeshingDemoSnapshot,
} from './meshing-demo';

interface MeshingProvidersArgs {
  text?: string;
  ws?: boolean;
  rtc?: boolean;
}

const renderMeshingDemo = canvasStory({
  create: createMeshingDemo,
  apply(instance: MeshingDemoInstance, args: MeshingProvidersArgs) {
    instance.update({
      text: args.text ?? '同一文档，三条通道',
      ws: args.ws ?? true,
      rtc: args.rtc ?? true,
    });
  },
  readout(snapshot: MeshingDemoSnapshot) {
    return [
      ['WebSocket 通道', `${snapshot.wsStatus} / synced=${snapshot.wsSynced}`],
      [
        'WebRTC 通道',
        snapshot.rtcOn ? `已接入 · 同伴 ${snapshot.rtcPeers}` : '未连接',
      ],
      [
        'IndexedDB 持久化',
        snapshot.idbSynced ? `已恢复 · 落库 ${snapshot.idbStored} 条` : '恢复中…',
      ],
      ['A 本地 update', `${snapshot.localUpdatesA} 条`],
      ['B 经服务器收到', `${snapshot.receivedB} 条`],
      ['A 经 WebRTC 收到', `${snapshot.rtcReceivedA} 条`],
      ['在线成员 A / B 视角', `${snapshot.onlineA} / ${snapshot.onlineB}`],
      ['最近事件', snapshot.lastEvent],
    ];
  },
  captions: [
    '文档 A：IndexedDB + WebSocket + WebRTC',
    '文档 B：仅 WebSocket（对照）',
  ],
});

const meta = {
  id: 'meshing-providers',
  title: '同步与持久化/Provider 组合',
  tags: ['!dev'],
} satisfies Meta<MeshingProvidersArgs>;

export default meta;

type Story = StoryObj<MeshingProvidersArgs>;

export const MeshingDemo: Story = {
  name: '三通道叠加',
  args: {
    text: '同一文档，三条通道',
    ws: true,
    rtc: true,
  },
  argTypes: {
    text: {
      name: '文档 A 内容',
      description:
        '写入文档 A 的 Y.Text。首次加载不覆盖 IndexedDB 恢复的历史，修改后才写入。',
      control: {
        type: 'text',
      },
    },
    ws: {
      name: 'WebSocket 通道',
      description:
        '勾选调用 connect()，取消调用 disconnect()；断开期间的编辑在重连握手后自动追平。',
      control: {
        type: 'boolean',
      },
    },
    rtc: {
      name: 'WebRTC 通道',
      description:
        '对应 WebrtcProvider 的 connect() / disconnect()；接入后经默认信令与 BroadcastChannel 发现同伴。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderMeshingDemo,
  parameters: storySource(meshingDemoSource),
};
