import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createEvents,
  type EventsInstance,
  type EventsOptions,
  type EventsSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createEvents,
  apply(instance: EventsInstance, args: EventsOptions) {
    instance.update(args);
  },
  readout(snapshot: EventsSnapshot) {
    return [
      ['最近事件', snapshot.lastEvent],
      ['target 类型', snapshot.targetType],
      ['subTargets', snapshot.subTargets],
      ['scenePoint', snapshot.scenePoint],
      ['viewportPoint', snapshot.viewportPoint],
    ];
  },
  captions: ['画布可交互：点选 · 拖动 · 悬停 · 滚轮 · 双击 · 右键'],
});

const meta = {
  id: 'events',
  title: '交互与编辑/事件系统',
  tags: ['!dev'],
  args: {
    targetFindTolerance: 0,
    perPixelTargetFind: false,
    skipTargetFind: false,
    subTargetCheck: true,
    fireRightClick: true,
    logMove: true,
    logObjectEvents: true,
  },
  argTypes: {
    targetFindTolerance: {
      name: '目标发现容差（px）',
      description:
        'targetFindTolerance（默认 0）：仅在「逐像素命中」开启时扩大像素采样半径；不影响包围盒命中。',
      control: {
        type: 'range',
        min: 0,
        max: 20,
        step: 1,
      },
    },
    perPixelTargetFind: {
      name: '逐像素命中',
      description:
        'perPixelTargetFind（默认 false）：true 时命中判定从包围盒改为实际像素——圆的四角不再命中。',
      control: { type: 'boolean' },
    },
    skipTargetFind: {
      name: '跳过目标发现',
      description:
        'skipTargetFind（默认 false）：true 时不查找 target，事件照发但 target 恒为空；已选对象在首次点击时被清除。',
      control: { type: 'boolean' },
    },
    subTargetCheck: {
      name: '分组子目标检查',
      description:
        'Group 的 subTargetCheck（fabric 默认 false，范例默认开启）：命中分组时收集内层对象到 subTargets，并向内层派发对象级事件。',
      control: { type: 'boolean' },
    },
    fireRightClick: {
      name: '触发右键事件',
      description:
        'fireRightClick（v7 默认 true，v8 将移除开关）：false 时右键不再派发 mouse:down/up；contextmenu 不受影响。',
      control: { type: 'boolean' },
    },
    logMove: {
      name: '记录 mouse:move',
      description: '事件记录面板的过滤器：mouse:move 频率高，可关闭以减少面板刷动。',
      control: { type: 'boolean' },
    },
    logObjectEvents: {
      name: '记录对象级事件',
      description: '事件记录面板的过滤器：关闭后只保留画布级条目。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EventsOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
