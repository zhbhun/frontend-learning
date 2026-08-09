import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import lifecycleSource from './lifecycle.ts?raw';
import {
  createLifecycle,
  type LifecycleInstance,
  type LifecycleSnapshot,
} from './lifecycle';

interface LifecycleArgs {
  children: boolean;
}

const renderInteractive = canvasStory({
  create: createLifecycle,
  apply(instance: LifecycleInstance, args: LifecycleArgs) {
    instance.update(args);
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['children 选项', snapshot.childrenOption],
      ['子级已销毁', `${snapshot.childrenDestroyed} / ${snapshot.totalChildren}`],
      ['孤儿子级', snapshot.orphans],
    ];
  },
});

const meta = {
  id: 'lifecycle',
  title: '工程与性能/内存与生命周期',
  tags: ['!dev'],
  args: {
    children: true,
  },
  argTypes: {
    children: {
      name: '递归销毁子级',
      description:
        '对应 Container.destroy 的 children 选项；true 递归销毁子级，false（默认）仅销毁容器自身、子级脱离树但保留。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(lifecycleSource),
} satisfies Meta<LifecycleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
