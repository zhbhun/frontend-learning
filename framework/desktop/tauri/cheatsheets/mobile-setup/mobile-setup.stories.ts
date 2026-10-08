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
      ['环境状态', snapshot.envStatus],
      ['缺失项', snapshot.missing],
      ['流水线', snapshot.pipeline],
      ['下一步', snapshot.next],
    ];
  },
  captions: ['环境检查(模拟)', 'init → dev 流水线(模拟)'],
});

const meta = {
  id: 'mobile-setup',
  title: '移动端/移动端起步',
  tags: ['!dev'],
  args: {
    platform: 'iOS',
    installed: ['Xcode', 'Cocoapods', 'iOS Rust targets'],
  },
  argTypes: {
    platform: {
      name: '目标平台',
      description:
        '切换 iOS / Android,观察环境检查清单与 init → dev 流水线如何整体变化。',
      control: {
        type: 'radio',
      },
      options: ['iOS', 'Android'],
    },
    installed: {
      name: '本机已装项',
      description:
        '勾选当前平台已安装的工具链、环境变量与 Rust targets,观察缺失项、修复命令与被阻断的流水线步骤。',
      control: {
        type: 'inline-check',
      },
      options: [
        'Xcode',
        'Cocoapods',
        'iOS Rust targets',
        'Android Studio',
        'SDK 与 NDK 组件',
        'JAVA_HOME',
        'ANDROID_HOME / NDK_HOME',
        'Android Rust targets',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
