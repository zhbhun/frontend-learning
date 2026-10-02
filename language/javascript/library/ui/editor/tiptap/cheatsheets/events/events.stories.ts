import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createEventObservatory,
  type ObservatoryInstance,
  type ObservatorySnapshot,
} from './event-observatory';
import eventObservatorySource from './event-observatory.ts?raw';
import {
  createReadLatestState,
  type ReadStateInstance,
  type ReadStateSnapshot,
} from './read-latest-state';
import readLatestStateSource from './read-latest-state.ts?raw';
import {
  createTransactionMeta,
  type MetaInstance,
  type MetaSnapshot,
} from './transaction-meta';
import transactionMetaSource from './transaction-meta.ts?raw';

const observatoryRender = canvasStory({
  create: createEventObservatory,
  apply(instance: ObservatoryInstance) {
    instance.update();
  },
  readout(snapshot: ObservatorySnapshot) {
    return [
      ['最近事件', snapshot.lastEvent],
      ['事件总数', `${snapshot.total} 个`],
      ['update 次数', `${snapshot.updates} 次`],
    ];
  },
});

const readStateRender = canvasStory({
  create: createReadLatestState,
  apply(instance: ReadStateInstance) {
    instance.update();
  },
  readout(snapshot: ReadStateSnapshot) {
    return [
      ['更新前字数（transaction.before）', snapshot.beforeLabel],
      ['更新后字数（editor.state）', snapshot.afterLabel],
      ['isEmpty', String(snapshot.isEmpty)],
      ['段落数', `${snapshot.paragraphs} 个`],
    ];
  },
});

const metaRender = canvasStory({
  create: createTransactionMeta,
  apply(instance: MetaInstance) {
    instance.update();
  },
  readout(snapshot: MetaSnapshot) {
    return [
      ['文档实际变化', `${snapshot.docChanges} 次`],
      ['update 次数', `${snapshot.updates} 次`],
      ['最近 meta', snapshot.lastMeta],
    ];
  },
});

const meta = {
  id: 'events',
  title: '内容与命令/事件',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Observatory = {
  name: '事件观测台',
  render: observatoryRender,
  parameters: storySource(eventObservatorySource),
} satisfies StoryObj;

export const ReadLatestState = {
  name: '读取最新状态',
  render: readStateRender,
  parameters: storySource(readLatestStateSource),
} satisfies StoryObj;

export const TransactionMeta = {
  name: '静默更新与事务标记',
  render: metaRender,
  parameters: storySource(transactionMetaSource),
} satisfies StoryObj;
