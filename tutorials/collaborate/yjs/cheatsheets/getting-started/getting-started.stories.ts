import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import twoDocSyncSource from './two-doc-sync.ts?raw';
import {
  createTwoDocSync,
  type TwoDocSyncInstance,
  type TwoDocSyncSnapshot,
} from './two-doc-sync';

interface TwoDocSyncArgs {
  text: string;
  relay: boolean;
}

const renderManualSync = canvasStory({
  create: createTwoDocSync,
  apply(instance: TwoDocSyncInstance, args: TwoDocSyncArgs) {
    instance.update(args);
  },
  readout(snapshot: TwoDocSyncSnapshot) {
    return [
      ['文档 A 字符数', snapshot.lenA],
      ['文档 B 字符数', snapshot.lenB],
      ['两端一致', snapshot.consistent ? '是' : '否'],
      ['已转发 update', `${snapshot.updates} 条`],
      ['最近 update 大小', `${snapshot.lastBytes} 字节`],
    ];
  },
  captions: ['文档 A（可编辑）', '文档 B（跟随同步）'],
});

const meta = {
  id: 'getting-started',
  title: '快速上手/安装与第一个协同文档',
  tags: ['!dev'],
  args: {
    text: '你好，协同！',
    relay: true,
  },
  argTypes: {
    text: {
      name: '文档 A 内容',
      description: '写入文档 A 的 Y.Text；同步中继开启时会自动同步到文档 B。',
      control: {
        type: 'text',
      },
    },
    relay: {
      name: '同步中继',
      description:
        '开启时把本地产生的 update 转发到对端（扮演 Provider）；关闭后两端各自独立，重新开启时按差量对齐。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderManualSync,
  parameters: storySource(twoDocSyncSource),
} satisfies Meta<TwoDocSyncArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ManualSync: Story = {};
