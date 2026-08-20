import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import dispatchSource from './event-dispatch.ts?raw';
import {
  createEventDispatch,
  type DispatchEventName,
  type EventDispatchInstance,
  type EventDispatchSnapshot,
} from './event-dispatch';

interface DispatchArgs {
  eventName: DispatchEventName;
  winId: number;
  perWindow: boolean;
  globalSub: boolean;
}

const renderDispatch = canvasStory({
  create: createEventDispatch,
  apply(instance: EventDispatchInstance, args: DispatchArgs) {
    instance.update(args);
  },
  readout(snapshot: EventDispatchSnapshot) {
    return [
      ['分发顺序', snapshot.order],
      ['通道名', snapshot.channels],
      ['event.data', snapshot.payload],
      ['close 附加', snapshot.closeNote],
    ];
  },
});

const meta = {
  id: 'window-events',
  title: '窗口与视图/窗口/窗口事件',
  tags: ['!dev'],
  args: {
    eventName: 'resize',
    winId: 1,
    perWindow: true,
    globalSub: true,
  },
  argTypes: {
    eventName: {
      name: '事件名',
      description: '要观察分发的窗口事件；close 的顺序与其余事件不同。',
      options: ['close', 'resize', 'focus'],
      control: {
        type: 'inline-radio',
        labels: {
          close: 'close',
          resize: 'resize',
          focus: 'focus',
        },
      },
    },
    winId: {
      name: '窗口 id',
      description: 'win.id，拼接进窗口级通道名后缀，也出现在 event.data.id。',
      control: { type: 'number', min: 0, max: 99, step: 1 },
    },
    perWindow: {
      name: '已用 win.on 订阅',
      description: '是否通过 win.on(name, handler) 订阅窗口级通道 name-id。',
      control: { type: 'boolean' },
    },
    globalSub: {
      name: '已用 Electrobun.events.on 订阅',
      description: '是否通过 Electrobun.events.on(name, handler) 订阅全局通道 name。',
      control: { type: 'boolean' },
    },
  },
  render: renderDispatch,
  parameters: storySource(dispatchSource),
} satisfies Meta<DispatchArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EventDispatch: Story = {};
