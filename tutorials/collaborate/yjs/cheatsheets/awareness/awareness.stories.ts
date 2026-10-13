import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import presenceSource from './presence-sync.ts?raw';
import heartbeatSource from './heartbeat-timeout.ts?raw';
import {
  createPresenceSync,
  type PresenceSyncInstance,
  type PresenceSyncSnapshot,
} from './presence-sync';
import {
  createHeartbeatTimeout,
  type HeartbeatTimeoutInstance,
  type HeartbeatTimeoutSnapshot,
} from './heartbeat-timeout';

/** 两个范例的控件集合;每个 story 只取自己需要的字段。 */
interface AwarenessArgs {
  name?: string;
  color?: string;
  cursorX?: number;
  online?: boolean;
  relay?: boolean;
  silenceA?: number;
  silenceB?: number;
}

const renderPresence = canvasStory({
  create: createPresenceSync,
  apply(instance: PresenceSyncInstance, args: AwarenessArgs) {
    instance.update({
      name: args.name ?? '小柏',
      color: args.color ?? '#e25c5c',
      cursorX: args.cursorX ?? 50,
      online: args.online ?? true,
    });
  },
  readout(snapshot: PresenceSyncSnapshot) {
    return [
      ['A 眼中在线人数', snapshot.onlineInA],
      ['A 端 states 键', snapshot.statesInA],
      ['A 端 update / change', `${snapshot.updatesA} / ${snapshot.changesA}`],
      ['A 端最近事件', snapshot.lastEvent],
    ];
  },
  captions: ['客户端 A 的视图', '客户端 B 的视图'],
});

const renderHeartbeat = canvasStory({
  create: createHeartbeatTimeout,
  apply(instance: HeartbeatTimeoutInstance, args: AwarenessArgs) {
    instance.update({
      relay: args.relay ?? true,
      silenceA: args.silenceA ?? 0,
      silenceB: args.silenceB ?? 0,
    });
  },
  readout(snapshot: HeartbeatTimeoutSnapshot) {
    return [
      ['A 眼中 B 在线', snapshot.aSeesB],
      ['B 已发心跳', snapshot.heartbeats],
      ['A 端超时移除', snapshot.timeoutsA],
      ['A 端 update / change', snapshot.updatesChangesA],
      ['B 距下次自动心跳', snapshot.nextHeartbeat],
      ['A 端最近事件', snapshot.lastEventA],
    ];
  },
  captions: ['客户端 B(被观察)', '客户端 A(观察 B)'],
});

const meta = {
  id: 'awareness',
  title: '核心机制/Awareness 与在线状态',
  tags: ['!dev'],
} satisfies Meta<AwarenessArgs>;

export default meta;

type Story = StoryObj<AwarenessArgs>;

export const Presence: Story = {
  name: '在线状态双端同步',
  args: {
    name: '小柏',
    color: '#e25c5c',
    cursorX: 50,
    online: true,
  },
  argTypes: {
    name: {
      name: 'B 的用户名',
      description: '写入 B 本地状态的 user.name 字段。',
      control: { type: 'text' },
    },
    color: {
      name: 'B 的主题色',
      description: '写入 B 本地状态的 user.color 字段,用于渲染列表圆点与远程光标。',
      control: { type: 'color' },
    },
    cursorX: {
      name: 'B 的光标位置',
      description: '写入 B 本地状态的 cursor.x 字段(0–100,映射到编辑区横向位置)。',
      control: { type: 'range', min: 0, max: 100, step: 5 },
    },
    online: {
      name: 'B 在线',
      description:
        '关闭时 B 执行 setLocalState(null) 标记离线;重新开启时经 setLocalState 全量恢复。',
      control: { type: 'boolean' },
    },
  },
  render: renderPresence,
  parameters: storySource(presenceSource),
};

export const Heartbeat: Story = {
  name: '心跳与超时移除',
  args: {
    relay: true,
    silenceA: 0,
    silenceB: 0,
  },
  argTypes: {
    relay: {
      name: '中继连接',
      description: '关闭时模拟 B 断网:B 的心跳照发,但消息不再送达 A。',
      control: { type: 'boolean' },
    },
    silenceA: {
      name: 'A 未收到 B 消息(秒)',
      description:
        '拨回 A 端记录的 B.lastUpdated;累计 ≥30 后,A 的检查循环(每 3 秒一轮)按 origin timeout 移除 B。',
      control: { type: 'range', min: 0, max: 45, step: 1 },
    },
    silenceB: {
      name: 'B 距上次心跳(秒)',
      description:
        '拨回 B 本地的 lastUpdated;≥15 后,B 的检查循环自动续期并广播心跳(内容不变,只触发 update)。',
      control: { type: 'range', min: 0, max: 20, step: 1 },
    },
  },
  render: renderHeartbeat,
  parameters: storySource(heartbeatSource),
};
