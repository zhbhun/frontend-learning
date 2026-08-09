import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import tickerSource from './ticker.ts?raw';
import {
  createTicker,
  type TickerInstance,
  type TickerSnapshot,
} from './ticker';

interface TickerArgs {
  maxFPS: number;
  speed: number;
  paused: boolean;
}

const renderInteractive = canvasStory({
  create: createTicker,
  apply(instance: TickerInstance, args: TickerArgs) {
    instance.update(args);
  },
  readout(snapshot: TickerSnapshot) {
    return [
      ['实测 FPS', snapshot.fps],
      ['deltaTime', snapshot.deltaTime],
      ['deltaMS', snapshot.deltaMS],
    ];
  },
});

const meta = {
  id: 'ticker',
  title: '入门/渲染循环',
  tags: ['!dev'],
  args: {
    maxFPS: 60,
    speed: 1,
    paused: false,
  },
  argTypes: {
    maxFPS: {
      name: '帧率上限',
      description:
        '对应 app.ticker.maxFPS。调低后帧数减少：原始指针每帧推进次数变少会变慢，delta 缩放指针因每帧 deltaTime 变大而保持速度不变。',
      control: {
        type: 'range',
        min: 15,
        max: 60,
        step: 5,
      },
    },
    speed: {
      name: '时间倍率',
      description:
        '对应 app.ticker.speed。缩放 deltaTime / deltaMS，因此只影响「乘 delta」的指针；原始路径不读 deltaTime，不受影响。',
      control: {
        type: 'range',
        min: 0.25,
        max: 2,
        step: 0.25,
      },
    },
    paused: {
      name: '暂停 ticker',
      description:
        '对应 app.ticker.stop() / start()。停止的是整个渲染循环（含渲染），两个指针都冻结。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(tickerSource),
} satisfies Meta<TickerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
