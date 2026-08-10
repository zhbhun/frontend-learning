import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createEvents,
  type EventsInstance,
  type EventsSnapshot,
} from './example';

interface EventsArgs {
  /** 目标形状是否阻止冒泡。 */
  cancelBubble: boolean;
  /** Circle 是否参与命中检测。 */
  circleListening: boolean;
}

const renderInteractive = canvasStory({
  create: createEvents,
  apply(instance: EventsInstance, args: EventsArgs) {
    instance.update(args);
  },
  readout(snapshot: EventsSnapshot) {
    return [
      ['目标 target', snapshot.target || '—'],
      ['冒泡路径', snapshot.chain.join(' → ') || '—'],
      ['触发数', snapshot.count],
    ];
  },
});

const meta = {
  id: 'events',
  title: '事件与交互/事件系统',
  tags: ['!dev'],
  args: {
    cancelBubble: false,
    circleListening: true,
  },
  argTypes: {
    cancelBubble: {
      name: '取消冒泡',
      description:
        '开启后，目标形状的处理器会设置 evt.cancelBubble = true，阻止事件继续向父节点传播。',
      control: { type: 'boolean' },
    },
    circleListening: {
      name: 'Circle 监听',
      description:
        '关闭后 Circle 不再参与命中检测（listening=false），点击 Circle 区域会穿透到 Stage。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EventsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
