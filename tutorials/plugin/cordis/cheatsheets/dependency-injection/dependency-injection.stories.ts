import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import dependencyTimelineSource from './dependency-timeline.ts?raw';
import {
  createDependencyTimeline,
  type DependencyTimelineInstance,
  type DependencyTimelineSnapshot,
} from './dependency-timeline';

interface TimelineArgs {
  order: 'consumer-first' | 'provider-first';
  impl: 'alpha' | 'beta';
  providerAlive: boolean;
}

const renderTimeline = canvasStory({
  create: createDependencyTimeline,
  apply(instance: DependencyTimelineInstance, args: TimelineArgs) {
    instance.update(args);
  },
  readout(snapshot: DependencyTimelineSnapshot) {
    return [
      ['注册顺序', snapshot.orderLabel],
      ['消费者状态', snapshot.consumerState],
      ['registry.has(consumer)', snapshot.hasConsumer],
      ['probe 响应', snapshot.probes],
      ['读到的 clock', snapshot.serviceVersion],
    ];
  },
  captions: ['切换「注册顺序 / 服务实现 / 提供者在场」→ 观察时间线', '点击画布 → 消费者存活时响应一次 probe'],
});

const meta = {
  id: 'dependency-injection',
  title: '核心概念/依赖注入',
  tags: ['!dev'],
  args: {
    order: 'consumer-first',
    impl: 'alpha',
    providerAlive: true,
  },
  argTypes: {
    order: {
      name: '注册顺序',
      description:
        'ctx.plugin() 的调用先后；无论谁先注册，消费者都等依赖就绪后才激活。切换时销毁全部实例按新顺序重建。',
      control: {
        type: 'radio',
        labels: {
          'consumer-first': '消费者先',
          'provider-first': '提供者先',
        },
      },
    },
    impl: {
      name: '服务实现',
      description:
        'clock 服务的提供者实现（alpha / beta 是两个不同的插件函数）；切换即替换实现，消费者回滚后用新实现重载。',
      control: {
        type: 'radio',
        labels: {
          alpha: 'alpha',
          beta: 'beta',
        },
      },
    },
    providerAlive: {
      name: '提供者在场',
      description:
        'false 时销毁提供者实例；消费者随之回滚到 PENDING 等待（不是销毁），重新开启后自动重载。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderTimeline,
  parameters: storySource(dependencyTimelineSource),
} satisfies Meta<TimelineArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Timeline: Story = {};
