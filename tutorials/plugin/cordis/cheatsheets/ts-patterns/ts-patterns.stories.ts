import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import heraldSource from './herald-plugin.ts?raw';
import { createHeraldStage } from './herald-stage';
import type { HeraldStageInstance } from './herald-stage';
import type { HeraldDemoArgs, HeraldDemoSnapshot } from './herald-plugin';

const renderHeraldDemo = canvasStory({
  create: createHeraldStage,
  apply(instance: HeraldStageInstance, args: HeraldDemoArgs) {
    instance.update(args);
  },
  readout(snapshot: HeraldDemoSnapshot) {
    return [
      ['事件收到', snapshot.receivedPitch ?? '—'],
      ['announce 返回', snapshot.announceResult ?? '服务不可用'],
      ['服务调用次数', snapshot.calls],
      ['提供者状态', snapshot.providerState],
    ];
  },
});

const meta = {
  id: 'ts-patterns',
  title: '进阶/TypeScript 模式',
  tags: ['!dev'],
  args: {
    pitch: 3,
    topic: 'cordis',
    decorate: true,
    provider: true,
  },
  argTypes: {
    pitch: {
      name: '事件音高',
      description:
        "root.emit('herald/chime', pitch) 的参数；类型来自 Events 合并里的 number，运行时原样到达监听器。",
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
    topic: {
      name: 'announce 主题',
      description: '点击画布时传给 root.herald.announce(topic) 的参数。',
      control: {
        type: 'text',
      },
    },
    decorate: {
      name: 'Config decorate',
      description:
        '插件配置（HeraldConfig 的字段）：切换时按新配置重载提供者，announce 的返回形态随之变化。',
      control: {
        type: 'boolean',
      },
    },
    provider: {
      name: '提供者在线',
      description:
        '关闭即卸载 HeraldService：herald 槽位清空、announce 不可用；事件链路（消费者监听器）不受影响。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderHeraldDemo,
  parameters: storySource(heraldSource),
} satisfies Meta<HeraldDemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
