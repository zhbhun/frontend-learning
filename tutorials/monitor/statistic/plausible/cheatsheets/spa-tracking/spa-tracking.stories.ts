import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSpaTracking,
  type SpaTrackingInstance,
  type SpaTrackingSnapshot,
} from './example';

interface SpaTrackingArgs {
  scriptFile: string;
}

const renderInteractive = canvasStory({
  create: createSpaTracking,
  apply(instance: SpaTrackingInstance, args: SpaTrackingArgs) {
    instance.update(args);
  },
  readout(snapshot: SpaTrackingSnapshot) {
    return [
      ['脚本状态', snapshot.scriptStatus],
      ['当前虚拟路由', snapshot.route],
      ['已上报 pageview', snapshot.pageviewCount],
      ['最近载荷', snapshot.lastPayload],
      ['本页已装入挂钩', snapshot.armedHooks],
    ];
  },
  captions: ['沙箱页面（当前 Docs 页）', '本地实例 localhost:8000'],
});

const meta = {
  id: 'spa-tracking',
  title: '数据采集/采集方式/SPA 路由',
  tags: ['!dev'],
  args: {
    scriptFile: 'script.local.js',
  },
  argTypes: {
    scriptFile: {
      name: '脚本模式',
      description:
        '注入沙箱页面的脚本变体。自动模式挂钩 history.pushState 并监听 popstate；' +
        'hash 模式改听 hashchange；手动模式不装任何挂钩，只认 window.plausible 调用。' +
        '本页运行在 localhost，三个变体都带 .local 才会真正上报。' +
        '已装入的挂钩不随模式切换移除，重载页面复位。',
      control: {
        type: 'select',
        labels: {
          'script.local.js': 'script.local.js（自动：pushState + popstate）',
          'script.hash.local.js': 'script.hash.local.js（hash：hashchange）',
          'script.manual.local.js':
            'script.manual.local.js（手动：无自动监听）',
        },
      },
      options: [
        'script.local.js',
        'script.hash.local.js',
        'script.manual.local.js',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SpaTrackingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
