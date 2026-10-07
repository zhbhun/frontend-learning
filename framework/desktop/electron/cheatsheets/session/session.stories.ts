import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './partition-sim.ts?raw';
import {
  createPartitionSim,
  type PartitionChoice,
  type PartitionInstance,
  type PartitionOptions,
  type PartitionSnapshot,
} from './partition-sim';

type PartitionArgs = PartitionOptions;

const PARTITION_CHOICES: PartitionChoice[] = [
  '默认会话',
  'persist:work',
  'persist:play',
  'temp',
];

const renderInteractive = canvasStory({
  create: createPartitionSim,
  apply(instance: PartitionInstance, args: PartitionArgs) {
    instance.update(args);
  },
  readout(snapshot: PartitionSnapshot) {
    return [
      ['窗口 A 分区', snapshot.partitionALabel],
      ['A 的会话', snapshot.sessionALabel],
      ['A 的数据落盘', snapshot.aPersistLabel],
      ['窗口 B 分区', snapshot.partitionBLabel],
      ['B 的会话', snapshot.sessionBLabel],
      ['A 与 B 共享 cookie 罐', snapshot.sharedLabel],
    ];
  },
});

const meta = {
  id: 'session',
  title: 'Web 内容/session 与存储',
  tags: ['!dev'],
  args: {
    partitionA: 'persist:work',
    partitionB: 'temp',
  },
  argTypes: {
    partitionA: {
      name: '窗口 A 分区',
      description:
        '窗口 A 的 webPreferences.partition 取值，观察它进入哪个会话、数据是否落盘。',
      control: {
        type: 'select',
        options: PARTITION_CHOICES,
      },
    },
    partitionB: {
      name: '窗口 B 分区',
      description:
        '窗口 B 的 webPreferences.partition 取值，与窗口 A 对照观察共享与隔离。',
      control: {
        type: 'select',
        options: PARTITION_CHOICES,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<PartitionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
