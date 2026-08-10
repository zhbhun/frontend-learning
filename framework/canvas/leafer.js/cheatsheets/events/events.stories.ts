import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createEvents,
  type EventInstance,
  type EventSnapshot,
  type EventShapeType,
} from './example';

interface EventArgs {
  shape: EventShapeType;
  hitBox: boolean;
  capture: boolean;
}

const renderInteractive = canvasStory({
  create: createEvents,
  apply(instance: EventInstance, args: EventArgs) {
    instance.update(args);
  },
  readout(snapshot: EventSnapshot) {
    return [
      ['事件', snapshot.type],
      ['目标 target', snapshot.target],
      ['当前 current', snapshot.current],
      ['阶段 phase', snapshot.phase],
      ['坐标', snapshot.point],
      ['按键', snapshot.keys],
    ];
  },
});

const meta = {
  id: 'events',
  title: '交互与事件/事件系统',
  tags: ['!dev'],
  args: {
    shape: 'star',
    hitBox: false,
    capture: false,
  },
  argTypes: {
    shape: {
      name: '图形类型',
      description:
        '命中的目标图形。星形有明显的透明拐角，最适合对比 hitBox 开关带来的命中差异。',
      control: {
        type: 'select',
      },
      options: ['rect', 'ellipse', 'star'],
    },
    hitBox: {
      name: '包围盒命中 hitBox',
      description:
        '关闭（默认）按实际路径命中：点击星形透明拐角会穿透到 Group；开启后按包围盒命中，拐角处也算命中图形。',
      control: {
        type: 'boolean',
      },
    },
    capture: {
      name: '捕获阶段 capture',
      description:
        'Group 的点击类监听挂在哪个阶段。关闭=冒泡阶段（点击图形时 phase=3）；开启=捕获阶段（phase=1）。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EventArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
