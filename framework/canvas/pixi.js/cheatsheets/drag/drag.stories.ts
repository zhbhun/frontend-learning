import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import dragSource from './drag.ts?raw';
import patternsSource from './patterns.ts?raw';
import {
  createDragDemo,
  type DragDemoInstance,
  type DragDemoSnapshot,
} from './drag';
import {
  createPatternsDemo,
  type PatternsDemoInstance,
  type PatternsDemoSnapshot,
} from './patterns';

interface DragDemoArgs {
  moveEvent: 'global' | 'local';
}

interface PatternsDemoArgs {
  constrain: boolean;
  snap: boolean;
  bringToFront: boolean;
}

const meta = {
  id: 'drag',
  title: '交互/拖拽与手势',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DragDemo: Story = {
  args: {
    moveEvent: 'global',
  },
  argTypes: {
    moveEvent: {
      name: '移动事件',
      description:
        '全局用 globalpointermove（指针离开对象也持续触发，拖拽标准做法）；局部用 pointermove（只在对象上方触发，快速拖动会丢指针）。',
      options: ['global', 'local'],
      control: { type: 'radio' },
      labels: {
        global: '全局 globalpointermove',
        local: '局部 pointermove',
      },
    },
  },
  render: canvasStory({
    create: createDragDemo,
    apply(instance: DragDemoInstance, args: DragDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: DragDemoSnapshot) {
      return [
        ['移动事件', snapshot.moveEvent],
        ['拖拽中', snapshot.dragging],
        ['指针坐标', snapshot.pointer],
        ['卡片坐标', snapshot.card],
      ];
    },
  }),
  parameters: storySource(dragSource),
};

export const PatternsDemo: Story = {
  args: {
    constrain: true,
    snap: false,
    bringToFront: true,
  },
  argTypes: {
    constrain: {
      name: '约束边界',
      description: '把卡片中心坐标 clamp 到画布内，拖不出画布。',
      control: { type: 'boolean' },
    },
    snap: {
      name: '对齐网格',
      description: '抬手时把坐标 round 到最近的 40px 网格点。',
      control: { type: 'boolean' },
    },
    bringToFront: {
      name: '拾取置顶',
      description: '按下时把被拾卡片移到 stage 末尾（渲染为顶层）。',
      control: { type: 'boolean' },
    },
  },
  render: canvasStory({
    create: createPatternsDemo,
    apply(instance: PatternsDemoInstance, args: PatternsDemoArgs) {
      instance.update(args);
    },
    readout(snapshot: PatternsDemoSnapshot) {
      return [
        ['约束边界', snapshot.constrain],
        ['对齐网格', snapshot.snap],
        ['拾取置顶', snapshot.bringToFront],
        ['顶层卡片', snapshot.top],
      ];
    },
  }),
  parameters: storySource(patternsSource),
};
