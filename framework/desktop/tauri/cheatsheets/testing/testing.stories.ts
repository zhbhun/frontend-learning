import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['会话结果', snapshot.sessionResult],
      ['驱动链路', snapshot.chain],
      ['macOS 支持', snapshot.macosSupport],
      ['应用内插件', snapshot.appPlugins],
    ];
  },
});

const meta = {
  id: 'testing',
  title: '质量与发布/调试与测试/自动化测试',
  tags: ['!dev'],
  args: {
    approach: 'tauri-service',
    platform: 'macos',
  },
  argTypes: {
    approach: {
      name: '测试方案',
      description:
        '选择官方的哪条端到端路线,观察驱动层链路、安装要求与应用内插件的变化。',
      control: {
        type: 'radio',
      },
      options: ['tauri-service', 'manual-wdio', 'selenium'],
    },
    platform: {
      name: '运行平台',
      description: '切换测试运行的平台,观察原生驱动与系统 WebView 的配对关系。',
      control: {
        type: 'radio',
      },
      options: ['macos', 'windows', 'linux'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
