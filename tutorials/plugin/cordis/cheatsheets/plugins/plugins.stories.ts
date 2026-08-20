import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import pluginRegistrySource from './plugin-registry.ts?raw';
import {
  createPluginRegistry,
  type PluginRegistryInstance,
  type PluginRegistrySnapshot,
} from './plugin-registry';

interface RegistryArgs {
  form: 'function' | 'class' | 'object';
  count: number;
}

const renderRegistry = canvasStory({
  create: createPluginRegistry,
  apply(instance: PluginRegistryInstance, args: RegistryArgs) {
    instance.update(args);
  },
  readout(snapshot: PluginRegistrySnapshot) {
    return [
      ['插件形态', snapshot.formLabel],
      ['registry.size', snapshot.registrySize],
      ['运行时名称', snapshot.runtimeName],
      ['活动实例', snapshot.instances.length],
      ['心跳总数', snapshot.ticks],
      ['已响应 knock', snapshot.knocks],
    ];
  },
  captions: ['切换「插件形态 / 实例数量」→ 观察注册表', '点击画布 → 每个实例各自响应'],
});

const meta = {
  id: 'plugins',
  title: '核心概念/插件',
  tags: ['!dev'],
  args: {
    form: 'function',
    count: 1,
  },
  argTypes: {
    form: {
      name: '插件形态',
      description:
        '同一插件体的三种等价包装；切换时销毁全部实例后按新形态重新注册。',
      control: {
        type: 'radio',
        labels: {
          function: '函数',
          class: '类',
          object: '对象',
        },
      },
    },
    count: {
      name: '实例数量',
      description:
        'ctx.plugin() 的调用次数；同一插件的每次注册都是一个新实例（新 Fiber）。',
      control: {
        type: 'range',
        min: 0,
        max: 3,
        step: 1,
      },
    },
  },
  render: renderRegistry,
  parameters: storySource(pluginRegistrySource),
} satisfies Meta<RegistryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Registry: Story = {};
