import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import pluginLifecycleSource from './plugin-lifecycle.ts?raw';
import {
  createPluginLifecycle,
  type LifecycleInstance,
  type LifecycleSnapshot,
} from './plugin-lifecycle';

interface LifecycleArgs {
  enabled: boolean;
}

const renderLifecycle = canvasStory({
  create: createPluginLifecycle,
  apply(instance: LifecycleInstance, args: LifecycleArgs) {
    instance.update(args);
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['插件状态', snapshot.state],
      ['活动副作用', snapshot.effects],
      ['心跳次数', snapshot.ticks],
      ['已响应 ping', snapshot.pings],
    ];
  },
  captions: ['点击画布 → 触发一次 ping 事件', '关闭「注册插件」→ 观察副作用归零'],
});

const meta = {
  id: 'intro',
  title: '上手/认识 cordis',
  tags: ['!dev'],
  args: {
    enabled: true,
  },
  argTypes: {
    enabled: {
      name: '注册插件',
      description: '开启时在根上下文上注册演示插件，关闭时销毁其 Fiber。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderLifecycle,
  parameters: storySource(pluginLifecycleSource),
} satisfies Meta<LifecycleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PluginLifecycle: Story = {};
