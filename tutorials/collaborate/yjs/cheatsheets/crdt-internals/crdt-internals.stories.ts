import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import yataOrderingSource from './yata-ordering.ts?raw';
import tombstoneGcSource from './tombstone-gc.ts?raw';
import {
  createYataOrdering,
  type YataOrderingInstance,
  type YataOrderingSnapshot,
} from './yata-ordering';
import {
  createTombstoneGc,
  type TombstoneGcInstance,
  type TombstoneGcSnapshot,
} from './tombstone-gc';

/** 全部范例的控件集合;每个 story 只取自己需要的字段。 */
interface CrdtInternalsArgs {
  insertA?: string;
  insertB?: string;
  swapIds?: boolean;
  baseText?: string;
  deleteCount?: number;
  gc?: boolean;
}

const renderYataOrdering = canvasStory({
  create: createYataOrdering,
  apply(instance: YataOrderingInstance, args: CrdtInternalsArgs) {
    instance.update({
      insertA: args.insertA ?? 'X',
      insertB: args.insertB ?? 'Y',
      swapIds: args.swapIds ?? false,
    });
  },
  readout(snapshot: YataOrderingSnapshot) {
    return [
      ['clientID(A / B)', `${snapshot.idA} / ${snapshot.idB}`],
      ['合并后文本(A 视角)', snapshot.textA],
      ['合并后文本(B 视角)', snapshot.textB],
      ['两副本', snapshot.converged],
      ['定序决胜', snapshot.verdict],
    ];
  },
});

const renderTombstoneGc = canvasStory({
  create: createTombstoneGc,
  apply(instance: TombstoneGcInstance, args: CrdtInternalsArgs) {
    instance.update({
      baseText: args.baseText ?? 'hello world',
      deleteCount: args.deleteCount ?? 5,
      gc: args.gc ?? true,
    });
  },
  readout(snapshot: TombstoneGcSnapshot) {
    return [
      ['剩余文本', snapshot.remaining],
      ['被删除内容', snapshot.deletedText],
      ['tombstone 数量', `${snapshot.tombstones} 条`],
      ['tombstone 内容', snapshot.tombstoneState],
      ['update 编码体积(gc 开 / 关)', `${snapshot.bytesGcOn} B / ${snapshot.bytesGcOff} B`],
    ];
  },
});

const meta = {
  id: 'crdt-internals',
  title: '进阶与原理/CRDT 与 YATA 原理',
  tags: ['!dev'],
} satisfies Meta<CrdtInternalsArgs>;

export default meta;

type Story = StoryObj<CrdtInternalsArgs>;

export const YataOrdering: Story = {
  name: '并发插入定序推演',
  args: {
    insertA: 'X',
    insertB: 'Y',
    swapIds: false,
  },
  argTypes: {
    insertA: {
      name: '客户端 A 插入',
      description: 'A 在基线 a|b 之间并发插入的文本;与 B 的插入互不知情。',
      control: { type: 'text' },
    },
    insertB: {
      name: '客户端 B 插入',
      description: 'B 在同一位置并发插入的文本;锚点与 A 完全相同。',
      control: { type: 'text' },
    },
    swapIds: {
      name: '交换 clientID',
      description: '对调两端的固定 clientID,观察同锚点并发的定序随之反转。',
      control: { type: 'boolean' },
    },
  },
  render: renderYataOrdering,
  parameters: storySource(yataOrderingSource),
};

export const TombstoneGc: Story = {
  name: 'tombstone 与垃圾回收',
  args: {
    baseText: 'hello world',
    deleteCount: 5,
    gc: true,
  },
  argTypes: {
    baseText: {
      name: '初始文本',
      description: '先整体插入的文本;删除发生在它的开头。',
      control: { type: 'text' },
    },
    deleteCount: {
      name: '从开头删除',
      description: '删除的字符数;删除不会移除 item,只会产生 tombstone。',
      control: { type: 'range', min: 0, max: 12, step: 1 },
    },
    gc: {
      name: '开启垃圾回收(gc)',
      description: '开启时已删 item 的内容被换成只剩长度;关闭时内容留在内存。',
      control: { type: 'boolean' },
    },
  },
  render: renderTombstoneGc,
  parameters: storySource(tombstoneGcSource),
};
