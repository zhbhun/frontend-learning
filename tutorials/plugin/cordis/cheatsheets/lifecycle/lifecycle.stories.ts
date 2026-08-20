import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import timelineSource from './plugin-timeline.ts?raw';
import {
  createPluginTimeline,
  type TimelineInstance,
  type TimelineSnapshot,
} from './plugin-timeline';

interface TimelineArgs {
  loaded: boolean;
  interval: number;
  fail: boolean;
}

const renderTimeline = canvasStory({
  create: createPluginTimeline,
  apply(instance: TimelineInstance, args: TimelineArgs) {
    instance.update(args);
  },
  readout(snapshot: TimelineSnapshot) {
    return [
      ['当前状态', snapshot.state],
      ['fiber.uid', snapshot.uid],
      ['插件体运行', `${snapshot.bodyRuns} 次`],
      ['清理函数运行', `${snapshot.disposerRuns} 次`],
      ['心跳次数', snapshot.beats],
    ];
  },
  captions: [
    '注册 → 更新配置 → 抛错 → 销毁：每一步都进入按时间排序的日志',
    '「插件体抛错」在下一轮插件体运行时生效；FAILED 后再更新配置可复活实例',
  ],
});

const meta = {
  id: 'lifecycle',
  title: '核心概念/生命周期',
  tags: ['!dev'],
  args: {
    loaded: true,
    interval: 1000,
    fail: false,
  },
  argTypes: {
    loaded: {
      name: '加载插件',
      description:
        '开启时 root.plugin(watched) 注册插件，关闭时 await fiber.dispose() 销毁实例。',
      control: {
        type: 'boolean',
      },
    },
    interval: {
      name: '心跳间隔（config.interval）',
      description:
        '已加载时变化会调用 fiber.update()，以新配置整段重启插件（uid 不变；rc.8 对相同配置同样重启）。',
      control: {
        type: 'range',
        min: 250,
        max: 2000,
        step: 250,
      },
    },
    fail: {
      name: '插件体抛错',
      description:
        '下一轮插件体运行时抛出 Error，演示 LOADING 中抛错的失败路径；关闭该开关并更新配置可复活 FAILED 实例。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderTimeline,
  parameters: storySource(timelineSource),
} satisfies Meta<TimelineArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Timeline: Story = {};
