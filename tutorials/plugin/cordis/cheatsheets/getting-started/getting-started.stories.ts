import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import coreSource from './minimal-app.ts?raw';
import { createAppStage } from './app-stage';
import type { AppStageInstance } from './app-stage';
import type { MinimalAppArgs, MinimalAppSnapshot } from './minimal-app';

const renderMinimalApp = canvasStory({
  create: createAppStage,
  apply(instance: AppStageInstance, args: MinimalAppArgs) {
    instance.update(args);
  },
  readout(snapshot: MinimalAppSnapshot) {
    return [
      ['插件状态', snapshot.state],
      ['registry.size', snapshot.registry],
      ['心跳计数', snapshot.ticks],
    ];
  },
});

const meta = {
  id: 'getting-started',
  title: '上手/安装与运行',
  tags: ['!dev'],
  args: {
    loaded: true,
    message: '你好，cordis',
    interval: 600,
  },
  argTypes: {
    loaded: {
      name: '加载插件',
      description:
        '关闭即卸载插件：框架逆序运行 disposer，撤销全部副作用后 registry.size 归 0。',
      control: {
        type: 'boolean',
      },
    },
    message: {
      name: '问候语',
      description: '写入插件 config.message，加载时传入插件函数。',
      control: {
        type: 'text',
      },
    },
    interval: {
      name: '心跳间隔（毫秒）',
      description: '写入 config.interval；已加载时修改会经 fiber.update 重启插件。',
      control: {
        type: 'range',
        min: 200,
        max: 2000,
        step: 100,
      },
    },
  },
  render: renderMinimalApp,
  parameters: storySource(coreSource),
} satisfies Meta<MinimalAppArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
