import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import partitionSource from './partition-isolation.ts?raw';
import {
  createPartitionIsolation,
  type IsolationPhase,
  type PartitionIsolationInstance,
  type PartitionIsolationSnapshot,
  type ViewBPartition,
} from './partition-isolation';

interface IsolationArgs {
  viewBPartition: ViewBPartition;
  phase: IsolationPhase;
}

const renderIsolation = canvasStory({
  create: createPartitionIsolation,
  apply(instance: PartitionIsolationInstance, args: IsolationArgs) {
    instance.update(args);
  },
  readout(snapshot: PartitionIsolationSnapshot) {
    return [
      ['视图 A 分区', snapshot.viewA],
      ['视图 B 分区', snapshot.viewB],
      ['是否共享存储', snapshot.sharing],
      ['重启后 B 的 Cookie', snapshot.afterRestart],
    ];
  },
});

const meta = {
  id: 'session-storage',
  title: '窗口与视图/视图/会话与存储',
  tags: ['!dev'],
  args: {
    viewBPartition: 'persist:default',
    phase: 'running',
  },
  argTypes: {
    viewBPartition: {
      name: '视图 B 的 partition',
      description:
        '视图 B 的分区字符串；与视图 A 相同则共享存储，persist: 前缀才会持久化。',
      options: ['persist:default', 'persist:account2', 'account2'],
      control: {
        type: 'inline-radio',
        labels: {
          'persist:default': 'persist:default',
          'persist:account2': 'persist:account2',
          account2: 'account2（裸名字）',
        },
      },
    },
    phase: {
      name: '观察时机',
      description: '应用运行中看共享关系；重启应用后看临时分区清空、持久化分区保留。',
      options: ['running', 'restarted'],
      control: {
        type: 'inline-radio',
        labels: {
          running: '应用运行中',
          restarted: '重启应用后',
        },
      },
    },
  },
  render: renderIsolation,
  parameters: storySource(partitionSource),
} satisfies Meta<IsolationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PartitionIsolation: Story = {};
