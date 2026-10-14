import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createStatelessRouting,
  type RespondWith,
  type RoutingInstance,
  type RoutingSnapshot,
  type SendBy,
} from './stateless-routing';
import routingSource from './stateless-routing.ts?raw';

interface RoutingArgs {
  sendBy: SendBy;
  respondWith: RespondWith;
}

const RESPOND_LABELS: Record<RespondWith, string> = {
  broadcast: 'document.broadcastStateless',
  'broadcast-filter': 'broadcastStateless + filter',
  unicast: 'connection.sendStateless',
  none: '不回应',
};

function routingReadout(snapshot: RoutingSnapshot): Array<[string, string]> {
  return [
    ['发送者', snapshot.sendBy.toUpperCase()],
    ['回应方式', RESPOND_LABELS[snapshot.respondWith]],
    ['A 收到', `${snapshot.receivedA} 条`],
    ['B 收到', `${snapshot.receivedB} 条`],
  ];
}

const renderRouting = canvasStory({
  create: createStatelessRouting,
  apply(instance: RoutingInstance, args: RoutingArgs) {
    instance.update(args);
  },
  readout: routingReadout,
});

const meta = {
  id: 'stateless',
  title: '客户端 Provider/Stateless 消息',
  tags: ['!dev'],
  args: {
    sendBy: 'a' as SendBy,
    respondWith: 'broadcast' as RespondWith,
  },
  argTypes: {
    sendBy: {
      name: '发送者',
      description: '选择哪个客户端调用 provider.sendStateless 上行消息。',
      control: { type: 'select' },
      options: {
        '客户端 A': 'a',
        '客户端 B': 'b',
      },
    },
    respondWith: {
      name: '服务器的回应',
      description: '选择 onStateless 钩子里的下发写法，观察谁会收到消息。',
      control: { type: 'select' },
      options: {
        'document.broadcastStateless（广播，含发送者）': 'broadcast',
        'broadcastStateless + filter 排除发送者': 'broadcast-filter',
        'connection.sendStateless（单播发送者）': 'unicast',
        '不回应': 'none',
      },
    },
  },
  render: renderRouting,
  parameters: storySource(routingSource),
} satisfies Meta<RoutingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Routing: Story = {
  name: '消息路由',
};
