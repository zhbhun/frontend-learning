import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCustomProperties,
  type CustomPropertiesInstance,
  type CustomPropertiesSnapshot,
} from './example';

interface CustomPropertiesArgs {
  plan: string;
}

const renderInteractive = canvasStory({
  create: createCustomProperties,
  apply(instance: CustomPropertiesInstance, args: CustomPropertiesArgs) {
    instance.update(args);
  },
  readout(snapshot: CustomPropertiesSnapshot) {
    return [
      ['脚本状态', snapshot.scriptStatus],
      ['已上报 Download', snapshot.downloadCount],
      ['最近事件名', snapshot.lastEvent],
      ['最近 props', snapshot.lastProps],
      ['最近上报结果', snapshot.lastResult],
    ];
  },
  captions: ['沙箱页面（当前 Docs 页）', '本地实例 localhost:8000'],
});

const meta = {
  id: 'custom-properties',
  title: '数据采集/事件与目标/自定义属性',
  tags: ['!dev'],
  args: {
    plan: 'premium',
  },
  argTypes: {
    plan: {
      name: 'plan 属性值',
      description:
        '附加到每次 Download 事件上的 plan 属性，两个按钮共用；' +
        '清空后事件只携带 file，看板按 plan 细分时计入 (none)。',
      control: { type: 'text' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CustomPropertiesArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
