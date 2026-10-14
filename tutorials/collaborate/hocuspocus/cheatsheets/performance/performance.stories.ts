import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import fanoutModelSource from './fanout-model.ts?raw';
import {
  createFanoutModel,
  GRANULARITY_LABELS,
  type FanoutInstance,
  type FanoutOptions,
  type FanoutSnapshot,
  type Granularity,
} from './fanout-model';

function shorten(text: string): string {
  const chars = Array.from(text);
  return chars.length > 14 ? `${chars.slice(0, 14).join('')}…` : text;
}

function fanoutReadout(snapshot: FanoutSnapshot): Array<[string, string]> {
  const firstStore =
    snapshot.storeTimes.length > 0
      ? `（首次 t=${(snapshot.storeTimes[0] / 1000).toFixed(1)}s）`
      : '';
  return [
    ['编辑文本', shorten(snapshot.text) || '（空）'],
    ['客户端连接数', String(snapshot.clients)],
    ['编辑粒度', GRANULARITY_LABELS[snapshot.granularity]],
    [
      '客户端 → 服务器',
      `${snapshot.updates} 条 update / ${snapshot.updateBytes} 字节`,
    ],
    [
      '广播 send',
      `${snapshot.sends} 次（update 条数 × 连接数，含发送者回声）`,
    ],
    ['防抖落库', `${snapshot.stores} 次${firstStore}`],
    ['快照大小', `${snapshot.snapshotBytes} 字节（encodeStateAsUpdate 全量）`],
    ['恢复核对', snapshot.restored === snapshot.text ? '与原文一致' : '与原文不一致'],
  ];
}

const renderFanout = canvasStory({
  create: createFanoutModel,
  apply(instance: FanoutInstance, args: FanoutOptions) {
    instance.update(args);
  },
  readout: fanoutReadout,
});

const meta = {
  id: 'performance',
  title: '部署与扩展/性能与内存',
  tags: ['!dev'],
  args: {
    text: '一次编辑的成本花在这里',
    clients: 4,
    granularity: 'per-char' as Granularity,
  },
  argTypes: {
    text: {
      name: '编辑文本',
      description: '本次演示写入的内容；逐字符粒度下每个字符产生一条 update。',
      control: { type: 'text' },
    },
    clients: {
      name: '客户端连接数',
      description: '同一房间的连接数，广播 send 次数按此倍增。',
      control: { type: 'range', min: 1, max: 8, step: 1 },
    },
    granularity: {
      name: '编辑粒度',
      description: '客户端事务的合并粒度：逐字符一个事务，还是整段合并进一个事务。',
      control: { type: 'select' },
      options: {
        '逐字符事务': 'per-char',
        '整段一个事务': 'batched',
      },
    },
  },
  parameters: storySource(fanoutModelSource),
} satisfies Meta<FanoutOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fanout: Story = {
  name: '编辑成本对照',
  render: renderFanout,
};
