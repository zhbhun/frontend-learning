import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCustomEvents,
  type CustomEventsInstance,
  type CustomEventsSnapshot,
} from './example';

interface CustomEventsArgs {
  scriptFile: string;
  purchaseEvent: string;
}

const renderInteractive = canvasStory({
  create: createCustomEvents,
  apply(instance: CustomEventsInstance, args: CustomEventsArgs) {
    instance.update(args);
  },
  readout(snapshot: CustomEventsSnapshot) {
    return [
      ['脚本状态', snapshot.scriptStatus],
      ['已触发事件', snapshot.eventsSummary],
      ['最近事件', snapshot.lastEvent],
      ['最近载荷', snapshot.lastPayload],
      ['发送结果', snapshot.lastResult],
    ];
  },
  captions: ['沙箱页面（当前 Docs 页）', '本地实例 localhost:8000'],
});

const meta = {
  id: 'custom-events',
  title: '数据采集/事件与目标/自定义事件',
  tags: ['!dev'],
  args: {
    scriptFile: 'script.manual.local.js',
    purchaseEvent: 'Purchase',
  },
  argTypes: {
    scriptFile: {
      name: '脚本文件',
      description:
        '注入沙箱页面的脚本变体。manual 变体由按钮调用 window.plausible 上报；' +
        'tagged-events 变体改由按钮上的 plausible-event-name= 类自动捕获点击；' +
        '本页运行在 localhost，只有带 .local 的变体才会真正上报。',
      control: {
        type: 'select',
        labels: {
          'script.manual.local.js': 'script.manual.local.js（JS 上报）',
          'script.tagged-events.local.js':
            'script.tagged-events.local.js（tagged events）',
          'script.manual.js': 'script.manual.js（JS 上报，localhost 被忽略）',
        },
      },
      options: [
        'script.manual.local.js',
        'script.tagged-events.local.js',
        'script.manual.js',
      ],
    },
    purchaseEvent: {
      name: '购买按钮事件名',
      description:
        '「购买」按钮触发的事件名（默认 Purchase）。事件名即看板中的 Goal 名，' +
        '需与站点设置中添加的 Goal 逐字符一致（含大小写）。',
      control: { type: 'text' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CustomEventsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
