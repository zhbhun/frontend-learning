import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createProviderSim,
  type DestroyChoice,
  type ProviderSimInstance,
  type ProviderSimSnapshot,
} from './status-machine';
import providerSimSource from './status-machine.ts?raw';

interface StatusMachineArgs {
  serverOnline: boolean;
}

interface DestroyTimingArgs {
  destroyWhen: DestroyChoice;
}

function statusReadout(snapshot: ProviderSimSnapshot): Array<[string, string]> {
  return [
    ['status', snapshot.status],
    ['synced', String(snapshot.synced)],
    ['unsyncedChanges', String(snapshot.unsyncedChanges)],
    ['重连尝试', `${snapshot.reconnects} 次`],
    ['awareness', snapshot.awareness],
    ['服务器', snapshot.serverOnline ? '在线' : '离线'],
  ];
}

function destroyReadout(snapshot: ProviderSimSnapshot): Array<[string, string]> {
  return [
    ['destroy 时机', snapshot.destroyWhen === 'immediately' ? '连接进行中' : 'synced 之后'],
    ['status', snapshot.status],
    ['synced', String(snapshot.synced)],
    ['destroy 后 status 事件', snapshot.statusEventsAfterDestroy === null ? '—（未销毁）' : `${snapshot.statusEventsAfterDestroy} 条`],
  ];
}

const renderStatusMachine = canvasStory({
  create: createProviderSim,
  apply(instance: ProviderSimInstance, args: StatusMachineArgs) {
    instance.update({
      scenario: 'lifecycle',
      serverOnline: args.serverOnline,
      destroyWhen: 'immediately',
    });
  },
  readout: statusReadout,
});

const renderDestroyTiming = canvasStory({
  create: createProviderSim,
  apply(instance: ProviderSimInstance, args: DestroyTimingArgs) {
    instance.update({
      scenario: 'destroy-timing',
      serverOnline: true,
      destroyWhen: args.destroyWhen,
    });
  },
  readout: destroyReadout,
});

const meta = {
  id: 'provider',
  title: '客户端 Provider/HocuspocusProvider',
  tags: ['!dev'],
  args: {
    serverOnline: true,
    destroyWhen: 'immediately' as DestroyChoice,
  },
  argTypes: {
    serverOnline: {
      name: '服务器可达',
      description: '切换服务器的可达性，观察 status 流转、退避重连与重新 synced。',
      control: { type: 'boolean' },
    },
    destroyWhen: {
      name: 'destroy 时机',
      description: '选择 destroy 发生的时机，对比 synced 是否触发、销毁后是否还有事件。',
      control: { type: 'select' },
      options: {
        '连接进行中（立即）': 'immediately',
        'synced 之后': 'after-synced',
      },
    },
  },
  parameters: storySource(providerSimSource),
} satisfies Meta<StatusMachineArgs & DestroyTimingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StatusMachine: Story = {
  name: '连接状态机',
  render: renderStatusMachine,
  args: {
    serverOnline: true,
  },
  argTypes: {
    destroyWhen: { table: { disable: true } },
  },
};

export const DestroyTiming: Story = {
  name: 'destroy 的时机',
  render: renderDestroyTiming,
  args: {
    destroyWhen: 'immediately',
  },
  argTypes: {
    serverOnline: { table: { disable: true } },
  },
};
