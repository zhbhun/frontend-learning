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
      ['尝试调用', snapshot.attempt],
      ['判定', snapshot.verdict],
      ['依据', snapshot.basis],
    ];
  },
});

const meta = {
  id: 'capabilities',
  title: '插件与权限/权限与能力',
  tags: ['!dev'],
  args: {
    windows: '["main"]',
    grants: ['core:default', 'fs:default', 'dialog:default'],
    attemptWindow: 'main',
    attemptCommand: 'plugin:fs|read_text_file',
  },
  argTypes: {
    windows: {
      name: 'windows 字段',
      description:
        'capability 覆盖哪些窗口标签;["*"] 是匹配全部窗口的 glob,JSON 里同步更新。',
      control: {
        type: 'select',
      },
      options: ['["main"]', '["settings"]', '["main", "settings"]', '["*"]'],
    },
    grants: {
      name: 'permissions 数组',
      description:
        '勾选 capability 声明的权限条目;fs:deny-read-text-file 是显式拒绝,deny 优先于 allow。',
      control: {
        type: 'inline-check',
      },
      options: [
        'core:default',
        'fs:default',
        'dialog:default',
        'fs:deny-read-text-file',
      ],
    },
    attemptWindow: {
      name: '发起调用的窗口',
      description: '演示应用有 main 与 settings 两个窗口,按标签匹配。',
      control: {
        type: 'select',
      },
      options: ['main', 'settings'],
    },
    attemptCommand: {
      name: '尝试的命令',
      description:
        '插件与 core 命令带命名空间、默认拒绝;greet 是应用自建命令,不走 ACL。',
      control: {
        type: 'select',
      },
      options: [
        'plugin:fs|read_text_file',
        'plugin:dialog|open',
        'plugin:event|emit',
        'greet',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
