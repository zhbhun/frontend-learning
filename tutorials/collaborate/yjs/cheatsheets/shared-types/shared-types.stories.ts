import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import mapKeyConflictSource from './map-key-conflict.ts?raw';
import arrayConcurrentInsertSource from './array-concurrent-insert.ts?raw';
import textConcurrentEditSource from './text-concurrent-edit.ts?raw';
import nestedObserveDeepSource from './nested-observe-deep.ts?raw';
import transactionBatchSource from './transaction-batch.ts?raw';
import xmlTreeEventsSource from './xml-tree-events.ts?raw';
import {
  createMapKeyConflict,
  type MapKeyConflictInstance,
  type MapKeyConflictSnapshot,
} from './map-key-conflict';
import {
  createArrayConcurrentInsert,
  type ArrayConcurrentInsertInstance,
  type ArrayConcurrentInsertSnapshot,
} from './array-concurrent-insert';
import {
  createTextConcurrentEdit,
  type TextConcurrentEditInstance,
  type TextConcurrentEditSnapshot,
} from './text-concurrent-edit';
import {
  createNestedObserveDeep,
  type NestedObserveDeepInstance,
  type NestedObserveDeepSnapshot,
} from './nested-observe-deep';
import {
  createTransactionBatch,
  type TransactionBatchInstance,
  type TransactionBatchSnapshot,
} from './transaction-batch';
import {
  createXmlTreeEvents,
  type XmlTreeEventsInstance,
  type XmlTreeEventsSnapshot,
} from './xml-tree-events';

/** 全部范例的控件集合；每个 story 只取自己需要的字段。 */
interface SharedTypesArgs {
  valueA?: string;
  valueB?: string;
  swapIds?: boolean;
  itemsA?: string;
  itemsB?: string;
  base?: string;
  insertA?: string;
  insertB?: string;
  nestedAction?: 'insert-card' | 'rename-card';
  title?: string;
  useTransact?: boolean;
  edits?: number;
  xmlAction?: 'set-attr' | 'append-node' | 'edit-text';
  attrValue?: string;
}

const renderMapKeyConflict = canvasStory({
  create: createMapKeyConflict,
  apply(instance: MapKeyConflictInstance, args: SharedTypesArgs) {
    instance.update({
      valueA: args.valueA ?? '披萨',
      valueB: args.valueB ?? '面条',
      swapIds: args.swapIds ?? false,
    });
  },
  readout(snapshot: MapKeyConflictSnapshot) {
    return [
      ['合并后 A 的值', snapshot.mergedA],
      ['合并后 B 的值', snapshot.mergedB],
      ['两副本', snapshot.converged],
      ['胜者', snapshot.winner],
      ['A 侧合并事件', snapshot.eventA],
      ['B 侧合并事件', snapshot.eventB],
    ];
  },
});

const renderArrayConcurrentInsert = canvasStory({
  create: createArrayConcurrentInsert,
  apply(instance: ArrayConcurrentInsertInstance, args: SharedTypesArgs) {
    instance.update({
      itemsA: args.itemsA ?? 'A1, A2',
      itemsB: args.itemsB ?? 'B1, B2',
      swapIds: args.swapIds ?? false,
    });
  },
  readout(snapshot: ArrayConcurrentInsertSnapshot) {
    return [
      ['合并后数组', snapshot.merged],
      ['两副本', snapshot.converged],
      ['块间顺序', snapshot.firstBlock],
      ['A 侧合并 delta', snapshot.deltaA],
    ];
  },
});

const renderTextConcurrentEdit = canvasStory({
  create: createTextConcurrentEdit,
  apply(instance: TextConcurrentEditInstance, args: SharedTypesArgs) {
    instance.update({
      base: args.base ?? '世界',
      insertA: args.insertA ?? '你好，',
      insertB: args.insertB ?? '！',
    });
  },
  readout(snapshot: TextConcurrentEditSnapshot) {
    return [
      ['合并后文本（A）', snapshot.mergedA],
      ['合并后文本（B）', snapshot.mergedB],
      ['两副本', snapshot.converged],
      ['长度（UTF-16）', snapshot.length],
      ['A 侧合并 delta', snapshot.deltaA],
    ];
  },
});

const renderNestedObserveDeep = canvasStory({
  create: createNestedObserveDeep,
  apply(instance: NestedObserveDeepInstance, args: SharedTypesArgs) {
    instance.update({
      action: args.nestedAction ?? 'rename-card',
      title: args.title ?? '设计稿 v2',
    });
  },
  readout(snapshot: NestedObserveDeepSnapshot) {
    return [
      ['board.observe 次数', snapshot.shallowCount],
      ['board.observeDeep 次数', snapshot.deepCount],
      ['事件来源', snapshot.source],
      ['path', snapshot.path],
      ['board.toJSON()', snapshot.json],
    ];
  },
});

const renderTransactionBatch = canvasStory({
  create: createTransactionBatch,
  apply(instance: TransactionBatchInstance, args: SharedTypesArgs) {
    instance.update({
      useTransact: args.useTransact ?? true,
      edits: args.edits ?? 3,
    });
  },
  readout(snapshot: TransactionBatchSnapshot) {
    return [
      ['写入方式', snapshot.batched],
      ['写入次数', snapshot.edits],
      ['observe 回调次数', snapshot.callbacks],
      ['update 消息条数', snapshot.updates],
      ['事件载荷', snapshot.keysSummary],
    ];
  },
});

const renderXmlTreeEvents = canvasStory({
  create: createXmlTreeEvents,
  apply(instance: XmlTreeEventsInstance, args: SharedTypesArgs) {
    instance.update({
      action: args.xmlAction ?? 'set-attr',
      attrValue: args.attrValue ?? 'primary',
    });
  },
  readout(snapshot: XmlTreeEventsSnapshot) {
    return [
      ['XML 序列化', snapshot.xml],
      ['事件目标', snapshot.event],
      ['path', snapshot.path],
      ['attributesChanged', snapshot.attrsChanged],
      ['childListChanged', snapshot.childChanged],
    ];
  },
});

const meta = {
  id: 'shared-types',
  title: '快速上手/共享类型',
  tags: ['!dev'],
} satisfies Meta<SharedTypesArgs>;

export default meta;

type Story = StoryObj<SharedTypesArgs>;

export const MapKeyConflict: Story = {
  name: 'Y.Map 键冲突合并',
  args: {
    valueA: '披萨',
    valueB: '面条',
    swapIds: false,
  },
  argTypes: {
    valueA: { name: '客户端 A 写入', control: { type: 'text' } },
    valueB: { name: '客户端 B 写入', control: { type: 'text' } },
    swapIds: {
      name: '交换 clientID',
      description: '对调两个副本固定的 clientID，观察胜负随之反转。',
      control: { type: 'boolean' },
    },
  },
  render: renderMapKeyConflict,
  parameters: storySource(mapKeyConflictSource),
};

export const ArrayConcurrentInsert: Story = {
  name: 'Y.Array 并发插入顺序',
  args: {
    itemsA: 'A1, A2',
    itemsB: 'B1, B2',
    swapIds: false,
  },
  argTypes: {
    itemsA: {
      name: '客户端 A 插入',
      description: '逗号分隔，作为一段条目插入索引 0。',
      control: { type: 'text' },
    },
    itemsB: {
      name: '客户端 B 插入',
      description: '逗号分隔，作为一段条目插入索引 0。',
      control: { type: 'text' },
    },
    swapIds: {
      name: '交换 clientID',
      description: '对调两个副本固定的 clientID，观察块间顺序随之反转。',
      control: { type: 'boolean' },
    },
  },
  render: renderArrayConcurrentInsert,
  parameters: storySource(arrayConcurrentInsertSource),
};

export const TextConcurrentEdit: Story = {
  name: 'Y.Text 并发编辑合并',
  args: {
    base: '世界',
    insertA: '你好，',
    insertB: '！',
  },
  argTypes: {
    base: { name: '初始文本', control: { type: 'text' } },
    insertA: { name: 'A 在开头插入', control: { type: 'text' } },
    insertB: { name: 'B 在结尾插入', control: { type: 'text' } },
  },
  render: renderTextConcurrentEdit,
  parameters: storySource(textConcurrentEditSource),
};

export const NestedObserveDeep: Story = {
  name: '嵌套与 observeDeep',
  args: {
    nestedAction: 'rename-card',
    title: '设计稿 v2',
  },
  argTypes: {
    nestedAction: {
      name: '操作',
      description: '顶层变更与嵌套变更惊动的观察者不同。',
      control: {
        type: 'select',
        labels: {
          'insert-card': '顶层插入卡片',
          'rename-card': '改嵌套卡片标题',
        },
      },
      options: ['insert-card', 'rename-card'],
    },
    title: {
      name: '新标题',
      control: { type: 'text' },
      if: { arg: 'nestedAction', eq: 'rename-card' },
    },
  },
  render: renderNestedObserveDeep,
  parameters: storySource(nestedObserveDeepSource),
};

export const TransactionBatch: Story = {
  name: '事务合并通知',
  args: {
    useTransact: true,
    edits: 3,
  },
  argTypes: {
    useTransact: {
      name: '包在一个事务里',
      description: 'doc.transact 把多次写入合并为一次回调与一条更新消息。',
      control: { type: 'boolean' },
    },
    edits: {
      name: '修改次数',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
  },
  render: renderTransactionBatch,
  parameters: storySource(transactionBatchSource),
};

export const XmlTreeEvents: Story = {
  name: 'Y.Xml 文档树事件',
  args: {
    xmlAction: 'set-attr',
    attrValue: 'primary',
  },
  argTypes: {
    xmlAction: {
      name: '操作',
      description: '不同操作落在事件的不同字段上。',
      control: {
        type: 'select',
        labels: {
          'set-attr': '给 div 设属性',
          'append-node': '追加 span 子节点',
          'edit-text': '修改树内文本',
        },
      },
      options: ['set-attr', 'append-node', 'edit-text'],
    },
    attrValue: {
      name: '属性值',
      control: { type: 'text' },
      if: { arg: 'xmlAction', eq: 'set-attr' },
    },
  },
  render: renderXmlTreeEvents,
  parameters: storySource(xmlTreeEventsSource),
};
