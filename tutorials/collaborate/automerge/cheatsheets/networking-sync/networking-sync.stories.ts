import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import peerSyncSource from './peer-sync-lab.ts?raw';
import syncProtocolSource from './sync-protocol-lab.ts?raw';
import {
  PEER_SYNC_ACTIONS,
  createPeerSyncLab,
  type PeerSyncLabArgs,
  type PeerSyncLabInstance,
  type PeerSyncLabSnapshot,
} from './peer-sync-lab';
import {
  SYNC_SCENARIOS,
  createSyncProtocolLab,
  type SyncProtocolLabArgs,
  type SyncProtocolLabInstance,
  type SyncProtocolLabSnapshot,
} from './sync-protocol-lab';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。操作切换通过 args 重新驱动实例执行。
 */
const renderPeerSyncLab = canvasStory({
  create: createPeerSyncLab,
  apply(instance: PeerSyncLabInstance, args: PeerSyncLabArgs) {
    instance.update(args);
  },
  readout(snapshot: PeerSyncLabSnapshot) {
    return snapshot.rows;
  },
});

const renderSyncProtocolLab = canvasStory({
  create: createSyncProtocolLab,
  apply(instance: SyncProtocolLabInstance, args: SyncProtocolLabArgs) {
    instance.update(args);
  },
  readout(snapshot: SyncProtocolLabSnapshot) {
    return snapshot.rows;
  },
});

interface CourseArgs extends PeerSyncLabArgs, SyncProtocolLabArgs {}

const meta = {
  id: 'networking-sync',
  title: 'Repo 同步层/网络同步',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const PeerSyncLab: Story = {
  name: '同页双副本',
  args: {
    action: 'connect',
  } satisfies PeerSyncLabArgs,
  argTypes: {
    action: {
      name: '下一步操作',
      description:
        'connect：建立 MessageChannel 连接；create-a：left 创建文档并自动推送给 right；edit-a / edit-b：修改对应副本，观察另一侧收敛。',
      control: { type: 'radio' },
      options: PEER_SYNC_ACTIONS,
      labels: {
        connect: 'connect · 建立连接',
        'create-a': 'create-a · left 创建文档',
        'edit-a': 'edit-a · 修改 left 副本',
        'edit-b': 'edit-b · 修改 right 副本',
      },
    },
  },
  render: renderPeerSyncLab,
  parameters: storySource(peerSyncSource),
};

export const SyncProtocolLab: Story = {
  name: '同步协议',
  args: {
    scenario: 'first-sync',
  } satisfies SyncProtocolLabArgs,
  argTypes: {
    scenario: {
      name: '同步场景',
      description:
        'first-sync：单侧修改后同步；concurrent：双方并发修改后同步；resync：已收敛后再同步一轮，验证协议幂等。',
      control: { type: 'radio' },
      options: SYNC_SCENARIOS,
      labels: {
        'first-sync': '单侧修改后同步',
        concurrent: '双方并发修改后同步',
        resync: '收敛后空转一轮',
      },
    },
  },
  render: renderSyncProtocolLab,
  parameters: storySource(syncProtocolSource),
};
