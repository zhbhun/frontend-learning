import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import registrySource from './socket-registry.ts?raw';
import {
  createSocketRegistry,
  type RegistryStage,
  type SocketRegistryInstance,
  type SocketRegistrySnapshot,
} from './socket-registry';

interface RegistryArgs {
  stage: RegistryStage;
}

const renderRegistry = canvasStory({
  create: createSocketRegistry,
  apply(instance: SocketRegistryInstance, args: RegistryArgs) {
    instance.update(args);
  },
  readout(snapshot: SocketRegistrySnapshot) {
    return [
      ['登记表条目', snapshot.entry],
      ['bun → 视图', snapshot.bunToView],
      ['视图 → bun', snapshot.viewToBun],
      ['视图状态', snapshot.viewState],
    ];
  },
});

const meta = {
  id: 'socket',
  title: '进阶/Socket',
  tags: ['!dev'],
  args: {
    stage: 'open',
  },
  argTypes: {
    stage: {
      name: '生命周期阶段',
      description:
        'socketMap 条目跟着连接走：open 才登记、close 只置空、重载覆盖、remove 删除。',
      options: ['created', 'open', 'closed', 'reloaded', 'removed'],
      control: {
        type: 'inline-radio',
        labels: {
          created: '视图已创建，未连接',
          open: '已连接（OPEN）',
          closed: '断开（条目保留）',
          reloaded: '重载后的新连接',
          removed: '视图已移除',
        },
      },
    },
  },
  render: renderRegistry,
  parameters: storySource(registrySource),
} satisfies Meta<RegistryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SocketRegistry: Story = {};
