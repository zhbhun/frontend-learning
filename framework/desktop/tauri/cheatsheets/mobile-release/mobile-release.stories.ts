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
      ['目标产物', snapshot.artifact],
      ['签名', snapshot.signing],
      ['商店提交', snapshot.submit],
      ['缺失凭据', snapshot.missing],
    ];
  },
  captions: ['发布凭据(模拟)', 'build → 签名 → 提交流水线(模拟)'],
});

const meta = {
  id: 'mobile-release',
  title: '移动端/移动端发布',
  tags: ['!dev'],
  args: {
    platform: 'iOS',
    prepared: [
      'Apple Developer 计划',
      'Xcode 账号(自动签名)',
      '手动签名三件套',
      'App Store Connect API key',
    ],
  },
  argTypes: {
    platform: {
      name: '目标平台',
      description:
        '切换 iOS / Android,凭据清单与 build → 签名 → 提交流水线整体切换。',
      control: {
        type: 'radio',
      },
      options: ['iOS', 'Android'],
    },
    prepared: {
      name: '已备好的凭据',
      description:
        '勾选当前平台已备好的签名与提交凭据,观察流水线在哪一步执行、跳过或中断;读数给出目标产物、签名路线与缺失清单。',
      control: {
        type: 'inline-check',
      },
      options: [
        'Apple Developer 计划',
        'Xcode 账号(自动签名)',
        '手动签名三件套',
        'App Store Connect API key',
        'upload keystore(jks)',
        'keystore.properties',
        'signingConfig 接线',
        'Play Console 账号',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
