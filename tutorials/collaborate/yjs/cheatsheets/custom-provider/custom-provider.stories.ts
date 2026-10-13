import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import providerLabSource from './broadcast-channel-provider.ts?raw';
import {
  createProviderLab,
  type ProviderLabInstance,
  type ProviderLabOptions,
  type ProviderLabSnapshot,
} from './broadcast-channel-provider';

const renderProviderLab = canvasStory({
  create: createProviderLab,
  apply(instance: ProviderLabInstance, args: ProviderLabOptions) {
    instance.update(args);
  },
  readout(snapshot: ProviderLabSnapshot) {
    return [
      [
        'B 通道',
        snapshot.connectedB
          ? `已接入 · synced=${snapshot.syncedB}`
          : '已断开',
      ],
      ['协议消息总数', `${snapshot.totalMessages} 条`],
      [
        'sync / awareness 帧',
        `${snapshot.syncMessages} / ${snapshot.presenceMessages}`,
      ],
      ['最近一条', snapshot.lastMessage],
      ['两端一致', snapshot.consistent ? '是' : '否'],
      ['A 端在线列表', snapshot.onlineInA],
      ['BC 通道名', snapshot.channel],
    ];
  },
  captions: ['文档 A(可编辑)', '文档 B(经自定义 Provider 同步)'],
});

const meta = {
  id: 'custom-provider',
  title: '同步与持久化/自定义 Provider',
  tags: ['!dev'],
  args: {
    textA: '你好,手写 Provider!',
    connectedB: true,
    filterEcho: true,
    nameB: '小舟',
  },
  argTypes: {
    textA: {
      name: '文档 A 内容',
      description:
        '写入文档 A 的 Y.Text;A 端 Provider 把变更编码为 Update 帧广播到通道。',
      control: {
        type: 'text',
      },
    },
    connectedB: {
      name: 'B 接入通道',
      description:
        '勾选调用 provider.connect(),取消调用 disconnect();重连时可在消息流水中看到完整握手与差量追平。',
      control: {
        type: 'boolean',
      },
    },
    filterEcho: {
      name: '回声过滤',
      description:
        'Provider 的 origin 过滤;关闭后每条编辑会多出一条对端发回的回声帧(幂等兜底,内容仍一致)。',
      control: {
        type: 'boolean',
      },
    },
    nameB: {
      name: 'B 的用户名',
      description:
        '写入 B 端 awareness 状态的 user.name 字段;观察 Awareness 帧与两端面板的在线列表。',
      control: {
        type: 'text',
      },
    },
  },
  render: renderProviderLab,
  parameters: storySource(providerLabSource),
} satisfies Meta<ProviderLabOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProtocolTraffic: Story = {
  name: '协议消息逐帧观察',
};
