import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import eventsSource from './events.ts?raw';
import eventFlowSource from './event-flow.ts?raw';
import hitAreaSource from './hit-area.ts?raw';
import {
  createEventModeDemo,
  type EventModeInstance,
  type EventModeSnapshot,
  type EventModeValue,
} from './events';
import {
  createEventFlowDemo,
  type EventFlowInstance,
  type EventFlowSnapshot,
} from './event-flow';
import {
  createHitAreaDemo,
  type HitAreaInstance,
  type HitAreaSnapshot,
  type HitAreaMode,
} from './hit-area';

interface EventModeArgs {
  eventMode: EventModeValue;
}

interface EventFlowArgs {
  stopPropagation: boolean;
  interactiveChildren: boolean;
}

interface HitAreaArgs {
  mode: HitAreaMode;
}

const meta = {
  id: 'events',
  title: '交互/事件系统',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const EventMode: Story = {
  args: {
    eventMode: 'static',
  },
  argTypes: {
    eventMode: {
      name: '目标 eventMode',
      description:
        'v8 的事件开关。static / dynamic 自身可命中并发出事件；passive / auto / none 不在此目标上发事件。',
      options: ['none', 'passive', 'auto', 'static', 'dynamic'],
      control: { type: 'radio' },
    },
  },
  render: canvasStory({
    create: createEventModeDemo,
    apply(instance: EventModeInstance, args: EventModeArgs) {
      instance.update(args);
    },
    readout(snapshot: EventModeSnapshot) {
      return [
        ['上次按下命中', snapshot.lastHit],
        ['目标 eventMode', snapshot.eventMode],
      ];
    },
  }),
  parameters: storySource(eventsSource),
};

export const EventFlow: Story = {
  args: {
    stopPropagation: false,
    interactiveChildren: true,
  },
  argTypes: {
    stopPropagation: {
      name: '子节点 stopPropagation',
      description: '开启后子节点在 pointerdown 里调用 e.stopPropagation()，事件不再冒泡到父容器。',
      control: { type: 'boolean' },
    },
    interactiveChildren: {
      name: '父容器 interactiveChildren',
      description: '关闭后命中测试跳过父容器的全部子节点，指针落在子节点上也只命中父容器。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createEventFlowDemo,
    apply(instance: EventFlowInstance, args: EventFlowArgs) {
      instance.update(args);
    },
    readout(snapshot: EventFlowSnapshot) {
      return [
        ['谁收到事件', snapshot.received],
        ['指针坐标 global', snapshot.pointer],
      ];
    },
  }),
  parameters: storySource(eventFlowSource),
};

export const HitArea: Story = {
  args: {
    mode: 'circle',
  },
  argTypes: {
    mode: {
      name: '命中区 hitArea',
      description:
        'bounds 用默认包围盒；circle / rectangle / polygon 各自指定不同形状的命中区域。',
      options: ['bounds', 'circle', 'rectangle', 'polygon'],
      control: { type: 'radio' },
      labels: {
        bounds: 'bounds（包围盒）',
        circle: 'circle（圆）',
        rectangle: 'rectangle（矩形）',
        polygon: 'polygon（精确星形）',
      },
    },
  },
  render: canvasStory({
    create: createHitAreaDemo,
    apply(instance: HitAreaInstance, args: HitAreaArgs) {
      instance.update(args);
    },
    readout(snapshot: HitAreaSnapshot) {
      return [
        ['命中区模式', snapshot.mode],
        ['指针在命中区域内', snapshot.inRegion],
      ];
    },
  }),
  parameters: storySource(hitAreaSource),
};
