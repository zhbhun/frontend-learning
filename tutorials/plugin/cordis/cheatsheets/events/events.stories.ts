import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import stationSource from './event-station.ts?raw';
import {
  createEventStation,
  type StationInstance,
  type StationSnapshot,
} from './event-station';

interface StationArgs {
  strength: number;
  mode: 'broadcast' | 'directed';
  stationA: boolean;
  manualOff: boolean;
  bThrows: boolean;
}

const renderStation = canvasStory({
  create: createEventStation,
  apply(instance: StationInstance, args: StationArgs) {
    instance.update(args);
  },
  readout(snapshot: StationSnapshot) {
    return [
      ['spark 触发次数', snapshot.dispatches],
      ['最近调用顺序', snapshot.lastOrder],
      ['internal/dispatch 观察', snapshot.tap],
      ['a-manual 监听器', snapshot.manual],
    ];
  },
  captions: [
    '点击画布 → 按当前「触发方式」分发一次 spark（带信号强度参数）',
    '广播到达全树监听器；定向只到站 A 与 global 监听器',
  ],
});

const meta = {
  id: 'events',
  title: '副作用与事件/事件',
  tags: ['!dev'],
  args: {
    strength: 3,
    mode: 'broadcast',
    stationA: true,
    manualOff: false,
    bThrows: false,
  },
  argTypes: {
    strength: {
      name: '信号强度',
      description: 'spark 事件的负载参数，触发时原样传给每个监听器。',
      control: {
        type: 'range',
        min: 1,
        max: 9,
        step: 1,
      },
    },
    mode: {
      name: '触发方式',
      description:
        '广播：root.emit(\'spark\', …) 不带 thisArg；定向：root.emit(carrier, \'spark\', …) 按 Context.filter 过滤。',
      options: ['broadcast', 'directed'],
      control: {
        type: 'inline-radio',
        labels: {
          broadcast: '全树广播',
          directed: '定向到站 A',
        },
      },
    },
    stationA: {
      name: '站 A 在线',
      description: '关闭时销毁站 A 插件的 Fiber，其全部监听器随作用域自动撤销。',
      control: {
        type: 'boolean',
      },
    },
    manualOff: {
      name: '撤销 a-manual',
      description: '单独调用 ctx.on 返回的 off 函数，只移除 a-manual 这一个监听器。',
      control: {
        type: 'boolean',
      },
    },
    bThrows: {
      name: 'b-error 抛错',
      description: '开启后 b-error 监听器在分发时抛错：同步分发在此中断，后续监听器不再执行。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderStation,
  parameters: storySource(stationSource),
} satisfies Meta<StationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Station: Story = {};
