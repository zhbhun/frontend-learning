import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import coreSource from './counter-service.ts?raw';
import { createServiceStage } from './service-stage';
import type { ServiceStageInstance } from './service-stage';
import type { ServiceDemoArgs, ServiceDemoSnapshot } from './counter-service';

const renderServiceDemo = canvasStory({
  create: createServiceStage,
  apply(instance: ServiceStageInstance, args: ServiceDemoArgs) {
    instance.update(args);
  },
  readout(snapshot: ServiceDemoSnapshot) {
    return [
      ['服务值', snapshot.count ?? '—'],
      ['调用次数', snapshot.calls],
      ['提供者状态', snapshot.state],
      ['当前实现', snapshot.impl],
    ];
  },
});

const meta = {
  id: 'services',
  title: '核心概念/服务',
  tags: ['!dev'],
  args: {
    provider: true,
    impl: 'linear',
    step: 1,
    duplicate: false,
  },
  argTypes: {
    provider: {
      name: '提供者在线',
      description:
        '关闭即卸载提供者插件：internal/service 报 undefined，ctx.counter 槽位被清空。',
      control: {
        type: 'boolean',
      },
    },
    impl: {
      name: '服务实现',
      description:
        '同名服务的两个实现；切换时先卸载旧实现再注册新实现，服务名与消费代码不变。',
      options: ['linear', 'double'],
      control: {
        type: 'radio',
      },
    },
    step: {
      name: 'bump 步长',
      description: '每次点击画布时传给 root.counter.bump(step) 的参数。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
    duplicate: {
      name: '重复注册',
      description:
        '再加载一个提供 counter 的插件：注册被拒绝，fiber 进入 FAILED，原服务不受影响。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderServiceDemo,
  parameters: storySource(coreSource),
} satisfies Meta<ServiceDemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
