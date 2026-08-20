import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import routingSource from './event-routing.ts?raw';
import {
  createEventRouting,
  type RoutingEventName,
  type EventRoutingInstance,
  type EventRoutingSnapshot,
} from './event-routing';

interface RoutingArgs {
  eventName: RoutingEventName;
  childId: number;
  hostOn: boolean;
  bunOn: boolean;
  sandbox: boolean;
}

const renderRouting = canvasStory({
  create: createEventRouting,
  apply(instance: EventRoutingInstance, args: RoutingArgs) {
    instance.update(args);
  },
  readout(snapshot: EventRoutingSnapshot) {
    return [
      ['宿主 event.detail', snapshot.hostDetail],
      ['主进程 event.data.detail', snapshot.bunDetail],
      ['主进程通道', snapshot.channels],
      ['sandbox', snapshot.sandboxNote],
    ];
  },
});

const meta = {
  id: 'webview-tag',
  title: '窗口与视图/视图/webview 标签',
  tags: ['!dev'],
  args: {
    eventName: 'did-navigate',
    childId: 3,
    hostOn: true,
    bunOn: true,
    sandbox: false,
  },
  argTypes: {
    eventName: {
      name: '事件名',
      description:
        '子 webview 发生的事件；did-navigate 的 detail 是字符串，后两者是对象。',
      options: ['did-navigate', 'host-message', 'new-window-open'],
      control: {
        type: 'inline-radio',
        labels: {
          'did-navigate': 'did-navigate',
          'host-message': 'host-message',
          'new-window-open': 'new-window-open',
        },
      },
    },
    childId: {
      name: '子 webview id',
      description:
        '标签初始化后拿到的 webviewId，决定注入宿主的元素 id 与主进程视图级通道名后缀。',
      control: { type: 'number', min: 1, max: 99, step: 1 },
    },
    hostOn: {
      name: '宿主已用 tag.on 订阅',
      description: '是否在宿主页面用 tag.on(name, handler) 接收转发事件。',
      control: { type: 'boolean' },
    },
    bunOn: {
      name: '主进程已订阅',
      description:
        '是否在主进程用 Electrobun.events.on(name, handler) 订阅全局通道。',
      control: { type: 'boolean' },
    },
    sandbox: {
      name: 'sandbox',
      description: '标签是否带 sandbox：只影响子 webview 的 RPC，不影响事件通道。',
      control: { type: 'boolean' },
    },
  },
  render: renderRouting,
  parameters: storySource(routingSource),
} satisfies Meta<RoutingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EventRouting: Story = {};
