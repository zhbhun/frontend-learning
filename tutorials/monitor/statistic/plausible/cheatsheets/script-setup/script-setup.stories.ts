import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createScriptSetup,
  type ScriptSetupInstance,
  type ScriptSetupSnapshot,
} from './example';

interface ScriptSetupArgs {
  scriptFile: string;
  domain: string;
}

const renderInteractive = canvasStory({
  create: createScriptSetup,
  apply(instance: ScriptSetupInstance, args: ScriptSetupArgs) {
    instance.update(args);
  },
  readout(snapshot: ScriptSetupSnapshot) {
    return [
      ['脚本状态', snapshot.scriptStatus],
      ['已上报 pageview', snapshot.pageviewCount],
      ['最近上报 URL', snapshot.lastUrl],
      ['最近上报域名', snapshot.lastDomain],
      ['最近触发结果', snapshot.lastResult],
    ];
  },
  captions: ['沙箱页面（当前 Docs 页）', '本地实例 localhost:8000'],
});

const meta = {
  id: 'script-setup',
  title: '上手/接入脚本',
  tags: ['!dev'],
  args: {
    scriptFile: 'script.local.js',
    domain: 'test.local',
  },
  argTypes: {
    scriptFile: {
      name: '脚本文件',
      description:
        '注入沙箱页面的脚本变体。manual 关闭自动 pageview；本页运行在 localhost，' +
        '只有带 .local 的变体才会真正上报。',
      control: {
        type: 'select',
        labels: {
          'script.local.js': 'script.local.js（自动 pageview）',
          'script.manual.local.js': 'script.manual.local.js（手动上报）',
          'script.manual.js': 'script.manual.js（手动，localhost 被忽略）',
        },
      },
      options: [
        'script.local.js',
        'script.manual.local.js',
        'script.manual.js',
      ],
    },
    domain: {
      name: 'data-domain',
      description:
        '脚本携带的站点域名，写入每个事件的 d 字段；需与本地实例中创建的站点一致。',
      control: { type: 'text' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ScriptSetupArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
