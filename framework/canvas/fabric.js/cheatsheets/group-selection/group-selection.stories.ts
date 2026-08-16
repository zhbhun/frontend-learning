import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGroupSelectionLab,
  createLayoutStrategyLab,
  type GroupSelectionInstance,
  type GroupSelectionOptions,
  type GroupSelectionSnapshot,
  type LayoutStrategyInstance,
  type LayoutStrategyOptions,
  type LayoutStrategySnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface GroupSelectionArgs
  extends GroupSelectionOptions,
    LayoutStrategyOptions {}

const renderGroupSelectionLab = canvasStory({
  create: createGroupSelectionLab,
  apply(instance: GroupSelectionInstance, args: GroupSelectionArgs) {
    instance.update({
      sceneMode: args.sceneMode,
      containerScaleX: args.containerScaleX,
      subTargetCheck: args.subTargetCheck,
      skipCanvasRemove: args.skipCanvasRemove,
    });
  },
  readout(snapshot: GroupSelectionSnapshot) {
    return [
      ['画布顶层', snapshot.canvasObjectsLabel],
      ['活动对象', snapshot.activeLabel],
      ['getActiveObjects', snapshot.activeCountLabel],
      ['红块坐标', snapshot.trackedCoordsLabel],
      ['红块缩放', snapshot.trackedScaleLabel],
      ['红块中心', snapshot.trackedCenterLabel],
      ['容器尺寸', snapshot.containerSizeLabel],
      ['子对象 oCoords', snapshot.childCoordsLabel],
      ['序列化顶层', snapshot.serializedLabel],
    ];
  },
});

const renderLayoutStrategyLab = canvasStory({
  create: createLayoutStrategyLab,
  apply(instance: LayoutStrategyInstance, args: GroupSelectionArgs) {
    instance.update({
      strategy: args.strategy,
      distantBlock: args.distantBlock,
    });
  },
  readout(snapshot: LayoutStrategySnapshot) {
    return [
      ['布局策略', snapshot.strategyLabel],
      ['组尺寸', snapshot.groupSizeLabel],
      ['组 left/top', snapshot.groupPosLabel],
      ['组内对象', snapshot.objectCountLabel],
      ['裁剪窗口', snapshot.clipWindowLabel],
      ['序列化 layoutManager', snapshot.serializedLabel],
    ];
  },
});

const meta = {
  id: 'group-selection',
  title: '变换与组织/分组与多选',
  tags: ['!dev'],
  render: renderGroupSelectionLab,
  parameters: storySource(exampleSource),
} satisfies Meta<GroupSelectionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GroupSelectionLab: Story = {
  args: {
    sceneMode: 'scatter',
    containerScaleX: 1,
    subTargetCheck: false,
    skipCanvasRemove: false,
  },
  argTypes: {
    sceneMode: {
      name: '场景状态',
      description:
        '三种容器状态的切换配方：散件（重置三个对象）/ 多选（ActiveSelection 运行时容器，对象仍留在画布列表）/ 成组（new Group 吸收子对象坐标，画布顶层只剩 group）。',
      control: {
        type: 'inline-radio',
        labels: {
          scatter: '散件（重置）',
          multi: '多选 ActiveSelection',
          group: '成组 Group',
        },
      },
      options: ['scatter', 'multi', 'group'],
    },
    containerScaleX: {
      name: '容器 scaleX',
      description:
        '作用于当前活动容器（Group 或 ActiveSelection）：子对象自身 scaleX 不被改写，读数「红块缩放」里自身恒 1、总缩放（getTotalObjectScaling）随容器变化。',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
    },
    subTargetCheck: {
      name: '组内命中 subTargetCheck',
      description:
        '仅对 Group 生效：true 时 Group#setCoords 级联子对象（读数「子对象 oCoords」由陈旧转已更新）；点选组内对象还需 interactive: true（已标记 deprecated）。',
      control: { type: 'boolean' },
    },
    skipCanvasRemove: {
      name: '省略 canvas.remove（复现残留）',
      description:
        '成组时跳过 canvas.remove(...items)——官方 managing-selection demo 的最简写法：子对象残留在画布列表，v7 默认 preserveObjectStacking: true 下拖动组出现残影，序列化顶层与组内双写（看读数「画布顶层」「序列化顶层」）。',
      control: { type: 'boolean' },
    },
  },
};

export const LayoutStrategyLab: Story = {
  render: renderLayoutStrategyLab,
  args: {
    strategy: 'fit-content',
    distantBlock: false,
  },
  argTypes: {
    strategy: {
      name: '布局策略',
      description:
        '同一内容按不同策略建组：fit-content 所有触发都重排（默认）；fixed 冻结初始化尺寸、add/remove 不重排；clip-path 组尺寸恒等于裁剪框、内容超出部分被裁掉。',
      control: {
        type: 'inline-radio',
        labels: {
          'fit-content': 'fit-content（默认）',
          fixed: 'fixed（冻结）',
          'clip-path': 'clip-path（裁剪框）',
        },
      },
      options: ['fit-content', 'fixed', 'clip-path'],
    },
    distantBlock: {
      name: '远处加一块',
      description:
        'group.add 一个远离内容的矩形，触发 added 布局：fit-content 组尺寸跟着变大；fixed 保持 320×240；clip-path 尺寸仍是 200×140 且远处块被裁掉。',
      control: { type: 'boolean' },
    },
  },
};
