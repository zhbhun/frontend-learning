import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import survivalSource from './survival.ts?raw';
import propagationSource from './propagation.ts?raw';
import {
  createSurvivalExample,
  type LifeMoment,
  type StorageLocation,
  type SurvivalInstance,
  type SurvivalSnapshot,
} from './survival';
import {
  createPropagationExample,
  type PropagationInstance,
  type PropagationSnapshot,
  type Writer,
  type WriteAction,
} from './propagation';

interface SurvivalArgs {
  location: string;
  moment: string;
}

interface PropagationArgs {
  writer: string;
  action: string;
}

const LOCATION_BY_LABEL: Record<string, StorageLocation> = {
  全局变量: 'global',
  'storage.session': 'session',
  'storage.local': 'local',
  'storage.sync': 'sync',
};

const MOMENT_BY_LABEL: Record<string, LifeMoment> = {
  写入后: 'written',
  'SW 空闲终止': 'terminated',
  事件唤醒: 'awakened',
  重启浏览器: 'restart',
};

const WRITER_BY_LABEL: Record<string, Writer> = {
  'service worker': 'sw',
  popup: 'popup',
};

const ACTION_BY_LABEL: Record<string, WriteAction> = {
  'set count = 43': 'set-one',
  'set 两个键': 'set-two',
  "remove('count')": 'remove',
};

const renderSurvival = canvasStory({
  create: createSurvivalExample,
  apply(instance: SurvivalInstance, args: SurvivalArgs) {
    instance.update({
      location: LOCATION_BY_LABEL[args.location],
      moment: MOMENT_BY_LABEL[args.moment],
    });
  },
  readout(snapshot: SurvivalSnapshot) {
    return [
      ['写入位置', snapshot.locationLabel],
      ['观察时刻', snapshot.momentLabel],
      ['读到的值', snapshot.readback],
    ];
  },
  captions: ['状态存活地图（模拟）', '演示值 42；全局变量初始值 0'],
});

const renderPropagation = canvasStory({
  create: createPropagationExample,
  apply(instance: PropagationInstance, args: PropagationArgs) {
    instance.update({
      writer: WRITER_BY_LABEL[args.writer],
      action: ACTION_BY_LABEL[args.action],
    });
  },
  readout(snapshot: PropagationSnapshot) {
    return [
      ['onChanged 触发', snapshot.onChangedCount],
      ['changes 条目', snapshot.changeEntries],
      ['写入方也收到', snapshot.writerNotified],
    ];
  },
  captions: ['onChanged 跨上下文传播（模拟）', '区域 storage.local，前置状态 count = 42'],
});

const meta = {
  id: 'storage',
  title: '核心机制/存储',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Survival: StoryObj<SurvivalArgs> = {
  args: {
    location: 'storage.session',
    moment: 'SW 空闲终止',
  },
  argTypes: {
    location: {
      name: '写入位置',
      description: '把演示值 42 写入哪个位置。',
      control: { type: 'select' },
      options: ['全局变量', 'storage.session', 'storage.local', 'storage.sync'],
    },
    moment: {
      name: '观察时刻',
      description: '推进到哪个生命周期时刻再读一次。',
      control: { type: 'select' },
      options: ['写入后', 'SW 空闲终止', '事件唤醒', '重启浏览器'],
    },
  },
  render: renderSurvival,
  parameters: storySource(survivalSource),
};

export const OnChanged: StoryObj<PropagationArgs> = {
  args: {
    writer: 'popup',
    action: 'set count = 43',
  },
  argTypes: {
    writer: {
      name: '写入方',
      description: '由哪个上下文执行写入。',
      control: { type: 'select' },
      options: ['service worker', 'popup'],
    },
    action: {
      name: '写入操作',
      description: '对 storage.local 执行哪种写操作。',
      control: { type: 'select' },
      options: ['set count = 43', 'set 两个键', "remove('count')"],
    },
  },
  render: renderPropagation,
  parameters: storySource(propagationSource),
};
