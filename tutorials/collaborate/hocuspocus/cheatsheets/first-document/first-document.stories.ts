import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createSyncModel,
  type RoomChoice,
  type SyncModelInstance,
  type SyncModelSnapshot,
} from './sync-model';
import syncModelSource from './sync-model.ts?raw';

interface CourseArgs {
  textA: string;
  roomB: RoomChoice;
}

function shorten(text: string): string {
  const chars = Array.from(text);
  return chars.length > 16 ? `${chars.slice(0, 16).join('')}…` : text;
}

function readout(snapshot: SyncModelSnapshot): Array<[string, string]> {
  return [
    ['客户端 A', shorten(snapshot.textA)],
    ['客户端 B', shorten(snapshot.textB)],
    ['初始同步', `${snapshot.initialSyncs} 次`],
    ['增量 update', `${snapshot.updatesRelayed} 条`],
    ['两端内容', snapshot.converged ? '一致' : '隔离'],
  ];
}

const renderSyncFlow = canvasStory({
  create: createSyncModel,
  apply(instance: SyncModelInstance, args: CourseArgs) {
    // 同步过程实例固定同名房间，聚焦初始同步与增量转发的观察。
    instance.update({ text: args.textA, roomB: 'same' });
  },
  readout,
});

const renderRoomIsolation = canvasStory({
  create: createSyncModel,
  apply(instance: SyncModelInstance, args: CourseArgs) {
    instance.update({ text: args.textA, roomB: args.roomB });
  },
  readout,
});

const meta = {
  id: 'first-document',
  title: '快速上手/第一个协同文档',
  tags: ['!dev'],
  args: {
    textA: 'hello 协同',
    roomB: 'same',
  },
  argTypes: {
    textA: {
      name: '客户端 A 输入',
      description: '写入客户端 A 的文本，经增量 update 同步到同房间的客户端 B。',
      control: { type: 'text' },
    },
    roomB: {
      name: '客户端 B 文档名',
      description: '切换客户端 B 加入的房间，观察同名汇聚、异名隔离。',
      control: { type: 'select' },
      options: {
        '同名 demo-doc': 'same',
        '异名 other-doc': 'other',
      },
    },
  },
  parameters: storySource(syncModelSource),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SyncFlow: Story = {
  name: '同步过程模型',
  render: renderSyncFlow,
  args: {
    textA: 'hello 协同',
    roomB: 'same',
  },
  argTypes: {
    roomB: { table: { disable: true } },
  },
};

export const RoomIsolation: Story = {
  name: '文档名房间',
  render: renderRoomIsolation,
  args: {
    textA: 'hello 协同',
    roomB: 'same',
  },
};
