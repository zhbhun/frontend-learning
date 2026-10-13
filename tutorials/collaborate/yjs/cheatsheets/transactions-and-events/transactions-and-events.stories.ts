import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import payloadSource from './event-payload.ts?raw';
import batchingSource from './transaction-batching.ts?raw';
import {
  createEventPayload,
  type EventPayloadInstance,
  type EventPayloadOptions,
  type EventPayloadSnapshot,
} from './event-payload';
import {
  createTransactionBatching,
  type TransactionBatchingInstance,
  type TransactionBatchingOptions,
  type TransactionBatchingSnapshot,
} from './transaction-batching';

const renderBatching = canvasStory({
  create: createTransactionBatching,
  apply(instance: TransactionBatchingInstance, args: TransactionBatchingOptions) {
    instance.update(args);
  },
  readout(snapshot: TransactionBatchingSnapshot) {
    return [
      ['map.set 调用次数', snapshot.edits],
      ['observe 触发次数', snapshot.observeCount],
      ['update 消息条数', snapshot.updateCount],
    ];
  },
});

const renderPayload = canvasStory({
  create: createEventPayload,
  apply(instance: EventPayloadInstance, args: EventPayloadOptions) {
    instance.update(args);
  },
  readout(snapshot: EventPayloadSnapshot) {
    return [
      ['origin', snapshot.origin],
      ['事件载荷', snapshot.payload],
      ['observe 触发次数', snapshot.observeCount],
    ];
  },
  captions: ['事务后的文档状态', '最近一次事件的载荷'],
});

const meta = {
  id: 'transactions-and-events',
  title: '核心机制/事务与变更事件',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Batching: StoryObj<TransactionBatchingOptions> = {
  args: {
    edits: 3,
    batched: true,
  },
  argTypes: {
    edits: {
      name: '修改次数',
      description: '重放时对同一个 Y.Map 连续调用 map.set 的次数。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
    batched: {
      name: '合并为一个事务',
      description:
        '开启时用 doc.transact 包住全部修改;关闭时每次 set 各自成为一个事务。',
      control: { type: 'boolean' },
    },
  },
  render: renderBatching,
  parameters: storySource(batchingSource),
};

export const Payload: StoryObj<EventPayloadOptions> = {
  args: {
    action: 'update-key',
    origin: 'editor',
  },
  argTypes: {
    action: {
      name: '操作',
      description: '在一个事务里对 Y.Map / Y.Array 执行的操作。',
      control: { type: 'select' },
      options: [
        'update-key',
        'add-key',
        'delete-key',
        'set-key-twice',
        'edit-array',
      ],
      labels: {
        'update-key': '更新已有键',
        'add-key': '新增键',
        'delete-key': '删除键',
        'set-key-twice': '同事务同键写两次',
        'edit-array': '编辑数组',
      },
    },
    origin: {
      name: 'origin 标签',
      description: '作为 doc.transact 第二参传入的来源标签。',
      control: { type: 'radio' },
      options: ['none', 'editor', 'toolbar'],
      labels: {
        none: '(不传)',
        editor: "'editor'",
        toolbar: "'toolbar'",
      },
    },
  },
  render: renderPayload,
  parameters: storySource(payloadSource),
};
