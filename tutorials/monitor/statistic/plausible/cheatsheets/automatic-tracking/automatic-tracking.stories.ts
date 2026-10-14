import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAutomaticTracking,
  type AutomaticTrackingInstance,
  type AutomaticTrackingSnapshot,
} from './example';

interface AutomaticTrackingArgs {
  scriptFile: string;
}

const renderInteractive = canvasStory({
  create: createAutomaticTracking,
  apply(instance: AutomaticTrackingInstance, args: AutomaticTrackingArgs) {
    instance.update(args);
  },
  readout(snapshot: AutomaticTrackingSnapshot) {
    return [
      ['脚本状态', snapshot.scriptStatus],
      ['已触发事件', snapshot.eventsSummary],
      ['最近事件', snapshot.lastEvent],
      ['事件载荷', snapshot.lastPayload],
      ['发送结果', snapshot.lastResult],
    ];
  },
  captions: ['沙箱页面（当前 Docs 页）', '本地实例 localhost:8000'],
});

const meta = {
  id: 'automatic-tracking',
  title: '数据采集/采集方式/自动追踪',
  tags: ['!dev'],
  args: {
    scriptFile: 'script.local.js',
  },
  argTypes: {
    scriptFile: {
      name: '脚本文件',
      description:
        '注入沙箱页面的脚本变体。默认是不带扩展的对照组；扩展组合在文件名中按字母序' +
        '加入 file-downloads 与 outbound-links。本页运行在 localhost，两种变体都需要' +
        '带 .local 才会真正上报。扩展在 document 上注册的监听无法摘除，切回对照组后' +
        '链接点击仍可能上报，重新加载本页可复位。',
      control: {
        type: 'select',
        labels: {
          'script.local.js': 'script.local.js（对照：无扩展）',
          'script.file-downloads.local.outbound-links.js':
            'script.file-downloads.local.outbound-links.js（扩展组合）',
        },
      },
      options: [
        'script.local.js',
        'script.file-downloads.local.outbound-links.js',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AutomaticTrackingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
