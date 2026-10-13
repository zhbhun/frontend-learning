import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import handshakeSource from './sync-handshake.ts?raw';
import offlineMergeSource from './offline-merge.ts?raw';
import {
  createSyncHandshake,
  type SyncHandshakeInstance,
  type SyncHandshakeOptions,
  type SyncHandshakeSnapshot,
} from './sync-handshake';
import {
  createOfflineMerge,
  type OfflineMergeInstance,
  type OfflineMergeOptions,
  type OfflineMergeSnapshot,
} from './offline-merge';

const renderHandshake = canvasStory({
  create: createSyncHandshake,
  apply(instance: SyncHandshakeInstance, args: SyncHandshakeOptions) {
    instance.update(args);
  },
  readout(snapshot: SyncHandshakeSnapshot) {
    return [
      ['state vector A / B', `${snapshot.svA} B / ${snapshot.svB} B`],
      ['差量 A→B / B→A', `${snapshot.diffAB} B / ${snapshot.diffBA} B`],
      ['差量方案合计(含 sv)', `${snapshot.diffTotal} B`],
      ['互发全量对照', `${snapshot.fullTotal} B`],
      ['两端一致', snapshot.consistent ? '是' : '否'],
    ];
  },
  captions: ['文档 A', '文档 B'],
});

const renderOfflineMerge = canvasStory({
  create: createOfflineMerge,
  apply(instance: OfflineMergeInstance, args: OfflineMergeOptions) {
    instance.update(args);
  },
  readout(snapshot: OfflineMergeSnapshot) {
    return [
      ['投递 update 总数', `${snapshot.delivered} 条`],
      ['update 事件触发', `${snapshot.events} 次`],
      ['重复被忽略', `${snapshot.ignored} 条`],
      ['文档 A / B 字符数', `${snapshot.lenA} / ${snapshot.lenB}`],
      ['两端一致', snapshot.consistent ? '是' : '否'],
    ];
  },
  captions: ['文档 A', '文档 B'],
});

const meta = {
  id: 'document-updates',
  title: '核心机制/文档更新与同步协议',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Handshake: StoryObj<SyncHandshakeOptions> = {
  args: {
    history: 20,
    editsA: 3,
    editsB: 2,
    phase: 'converged',
  },
  argTypes: {
    history: {
      name: '共享历史编辑次数',
      description: '两端分叉前共同同步过的编辑次数;越大,「互发全量」对照越亏。',
      control: {
        type: 'range',
        min: 0,
        max: 50,
        step: 5,
      },
    },
    editsA: {
      name: 'A 离线编辑次数',
      description: '文档 A 在离线期间追加的编辑次数,决定差量 A→B 的字节数。',
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 1,
      },
    },
    editsB: {
      name: 'B 离线编辑次数',
      description: '文档 B 在离线期间追加的编辑次数,决定差量 B→A 的字节数。',
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 1,
      },
    },
    phase: {
      name: '同步阶段',
      description:
        '三步握手的进度:分叉中 → 互换 state vector → 互发差量 update → 收敛完成。',
      control: { type: 'select' },
      options: ['diverged', 'exchange-sv', 'exchange-diff', 'converged'],
      labels: {
        diverged: '离线分叉中',
        'exchange-sv': '① 互换 state vector',
        'exchange-diff': '② 互发差量 update',
        converged: '收敛完成',
      },
    },
  },
  render: renderHandshake,
  parameters: storySource(handshakeSource),
};

export const OfflineMerge: StoryObj<OfflineMergeOptions> = {
  args: {
    editsA: 3,
    editsB: 2,
    delivery: 'duplicated',
  },
  argTypes: {
    editsA: {
      name: 'A 离线编辑次数',
      description: '文档 A 在离线期间累积的增量 update 条数。',
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 1,
      },
    },
    editsB: {
      name: 'B 离线编辑次数',
      description: '文档 B 在离线期间累积的增量 update 条数。',
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 1,
      },
    },
    delivery: {
      name: '投递模式',
      description:
        '重连时把离线累积的 update 投递到对端的方式;乱序与重复投递都应收敛到同一状态。',
      control: { type: 'select' },
      options: ['in-order', 'reversed', 'duplicated'],
      labels: {
        'in-order': '正常顺序',
        reversed: '完全逆序',
        duplicated: '每条重复投递 3 次',
      },
    },
  },
  render: renderOfflineMerge,
  parameters: storySource(offlineMergeSource),
};
