import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createAwarenessModel,
  type AwarenessModelInstance,
  type AwarenessModelSnapshot,
  type LeaveMode,
} from './awareness-model';
import awarenessModelSource from './awareness-model.ts?raw';

interface CourseArgs {
  displayName: string;
  editing: boolean;
  leaveMode: LeaveMode;
}

function rowsToString(rows: AwarenessModelSnapshot['viewA']): string {
  if (rows.length === 0) {
    return '（空）';
  }
  return rows
    .map((row) => `${row.name} #${String(row.clientId).slice(-4)}`)
    .join('、');
}

function presenceReadout(snapshot: AwarenessModelSnapshot): Array<[string, string]> {
  return [
    ['A 端在线', rowsToString(snapshot.viewA)],
    ['B 端在线', rowsToString(snapshot.viewB)],
    ['两端列表', snapshot.listsMatch ? '一致' : '不一致'],
    ['awarenessChange', `${snapshot.changeCount} 次`],
    ['awarenessUpdate', `${snapshot.updateCount} 次（含保活重播）`],
    ['服务器钩子', `onAwarenessUpdate ×${snapshot.hookCount} · 最近 ${snapshot.hookLastOrigin}`],
  ];
}

function expiryReadout(snapshot: AwarenessModelSnapshot): Array<[string, string]> {
  const leaveLabels: Record<LeaveMode, string> = {
    connected: '连接中',
    crashed: '异常失联（上行断开）',
    left: '正常下线（广播 null）',
  };
  return [
    ['服务器房间在线', rowsToString(snapshot.viewRoom)],
    ['B 端在线', rowsToString(snapshot.viewB)],
    [
      'A 在服务器最后活跃',
      snapshot.idleASeconds === null ? '—（已不在列表）' : `${snapshot.idleASeconds.toFixed(1)} 秒前`,
    ],
    ['A 的连接', leaveLabels[snapshot.leaveMode]],
    ['服务器钩子', `onAwarenessUpdate ×${snapshot.hookCount} · 最近 ${snapshot.hookLastOrigin}`],
  ];
}

const renderPresence = canvasStory({
  create: createAwarenessModel,
  apply(instance: AwarenessModelInstance, args: CourseArgs) {
    // 在线列表实例保持连接，聚焦写入、监听与保活重播的观察。
    instance.update({
      scenario: 'presence',
      displayName: args.displayName,
      editing: args.editing,
      leaveMode: 'connected',
    });
  },
  readout: presenceReadout,
});

const renderLeaveAndExpiry = canvasStory({
  create: createAwarenessModel,
  apply(instance: AwarenessModelInstance, args: CourseArgs) {
    instance.update({
      scenario: 'expiry',
      displayName: args.displayName,
      editing: args.editing,
      leaveMode: args.leaveMode,
    });
  },
  readout: expiryReadout,
});

const meta = {
  id: 'awareness',
  title: '客户端 Provider/Awareness 在线状态',
  tags: ['!dev'],
  args: {
    displayName: '小明',
    editing: false,
    leaveMode: 'connected' as LeaveMode,
  },
  argTypes: {
    displayName: {
      name: '客户端 A 昵称',
      description: '写入客户端 A 的 user.name 字段，观察两端在线列表与事件计数。',
      control: { type: 'text' },
    },
    editing: {
      name: 'A 正在编辑',
      description: '切换客户端 A 的 editing 字段，观察字段级合并与列表徽标。',
      control: { type: 'boolean' },
    },
    leaveMode: {
      name: 'A 的连接',
      description: '切换 A 的离开方式，对比立即广播移除与约 30 秒的过期移除。',
      control: { type: 'select' },
      options: {
        连接中: 'connected',
        '异常失联（停止上行）': 'crashed',
        '正常下线（广播 null）': 'left',
      },
    },
  },
  parameters: storySource(awarenessModelSource),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PresenceBoard: Story = {
  name: '在线列表',
  render: renderPresence,
  args: {
    displayName: '小明',
    editing: false,
  },
  argTypes: {
    leaveMode: { table: { disable: true } },
  },
};

export const LeaveAndExpiry: Story = {
  name: '过期与离开路径',
  render: renderLeaveAndExpiry,
  args: {
    leaveMode: 'connected',
  },
  argTypes: {
    displayName: { table: { disable: true } },
    editing: { table: { disable: true } },
  },
};
