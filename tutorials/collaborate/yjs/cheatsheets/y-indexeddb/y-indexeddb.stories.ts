import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import indexeddbPersistenceSource from './indexeddb-persistence.ts?raw';
import offlineReconnectSource from './offline-reconnect.ts?raw';
import {
  createIndexeddbPersistenceDemo,
  DEFAULT_TEXT,
  type IndexeddbPersistenceInstance,
  type IndexeddbPersistenceSnapshot,
  type PersistenceAction,
} from './indexeddb-persistence';
import {
  createOfflineReconnect,
  type OfflineReconnectInstance,
  type OfflineReconnectSnapshot,
} from './offline-reconnect';

/** 两个范例的控件集合;每个 story 只取自己需要的字段。 */
interface YIndexeddbArgs {
  text?: string;
  action?: PersistenceAction;
  textB?: string;
  connected?: boolean;
}

const renderPersistence = canvasStory({
  create: createIndexeddbPersistenceDemo,
  apply(instance: IndexeddbPersistenceInstance, args: YIndexeddbArgs) {
    instance.update({
      text: args.text ?? DEFAULT_TEXT,
      action: args.action ?? 'none',
    });
  },
  readout(snapshot: IndexeddbPersistenceSnapshot) {
    return [
      ['本地库', snapshot.dbName],
      ['whenSynced', snapshot.synced ? '已 resolve' : '等待中…'],
      ['updates 条目数', `${snapshot.entries} 条`],
      ['updates 总字节', `${snapshot.bytes} B`],
      ['内存文档字符数', snapshot.docLen],
      ['最近事件', snapshot.lastEvent],
    ];
  },
  captions: ['内存文档(Y.Doc)', 'IndexedDB · updates store(块宽 ∝ 字节数)'],
});

const renderOfflineReconnect = canvasStory({
  create: createOfflineReconnect,
  apply(instance: OfflineReconnectInstance, args: YIndexeddbArgs) {
    instance.update({
      text: args.text ?? '离线编辑,重连合并',
      textB: args.textB ?? '',
      connected: args.connected ?? true,
    });
  },
  readout(snapshot: OfflineReconnectSnapshot) {
    return [
      ['relay 状态', snapshot.connected ? '已连接' : '已断开(离线)'],
      ['A 本地 update', `${snapshot.localUpdatesA} 条`],
      ['A 落盘条目 / 字节', `${snapshot.entries} 条 / ${snapshot.bytes} B`],
      ['自 relay 合入 A(同样落盘)', `${snapshot.mergedFromRelay} 条`],
      ['B 已接收 update', `${snapshot.receivedB} 条`],
      [
        '本次重连握手字节',
        snapshot.handshakeBytes > 0 ? `${snapshot.handshakeBytes} B` : '—',
      ],
      ['两端一致', snapshot.consistent ? '是' : '否'],
    ];
  },
  captions: ['文档 A(本地 + 落盘)', '文档 B(relay 远端)'],
});

const meta = {
  id: 'y-indexeddb',
  title: '同步与持久化/y-indexeddb 离线',
  tags: ['!dev'],
} satisfies Meta<YIndexeddbArgs>;

export default meta;

type Story = StoryObj<YIndexeddbArgs>;

export const PersistAndReload: Story = {
  name: '落盘、重放与压缩',
  args: {
    text: DEFAULT_TEXT,
    action: 'none',
  },
  argTypes: {
    text: {
      name: '文档内容',
      description:
        '修改即作为一个事务写入文档并立即落盘;保持初始文案时不覆盖库中恢复的内容——写入后直接刷新浏览器页面即可验证持久化。',
      control: {
        type: 'text',
      },
    },
    action: {
      name: '操作',
      description:
        '模拟刷新 = 销毁并重建 doc + persistence,从本地库重放;执行过一次后请先切回「无」再触发下一次。',
      control: { type: 'select' },
      options: ['none', 'reload', 'bulk', 'clear'],
      labels: {
        none: '无',
        reload: '模拟刷新(重建文档)',
        bulk: '写入 520 次小编辑(触发压缩)',
        clear: '清空本地库',
      },
    },
  },
  render: renderPersistence,
  parameters: storySource(indexeddbPersistenceSource),
};

export const OfflineReconnect: Story = {
  name: '离线编辑与重连合并',
  args: {
    text: '离线编辑,重连合并',
    textB: '',
    connected: true,
  },
  argTypes: {
    text: {
      name: '文档 A 内容',
      description: '写入文档 A;离线期间每次修改照常落盘,重连握手后差量到达 B。',
      control: {
        type: 'text',
      },
    },
    textB: {
      name: '远端 B 内容',
      description:
        '写入文档 B(留空视为未动过);重连握手后差量合入 A,且这条远端 update 同样落盘。',
      control: {
        type: 'text',
      },
    },
    connected: {
      name: '连接 relay',
      description:
        '勾选 = relay 在线,两端逐条互转增量;取消 = 离线,重开时执行 state vector + 差量握手。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderOfflineReconnect,
  parameters: storySource(offlineReconnectSource),
};
