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
      ['能力点', snapshot.point],
      ['目标平台', snapshot.target],
      ['移动端判定', snapshot.verdict],
      ['迁移对策', snapshot.strategy],
    ];
  },
});

const meta = {
  id: 'mobile-adaptation',
  title: '移动端/移动端差异',
  tags: ['!dev'],
  args: {
    point: 'core:tray',
    target: 'iOS',
  },
  argTypes: {
    point: {
      name: '能力点',
      description:
        '桌面版在用的核心 API 或插件;左栏色点随目标平台标注支持级别,右栏给出判定与对策。',
      control: {
        type: 'select',
      },
      options: [
        'api:multi-window',
        'core:menu',
        'core:tray',
        'plugin:global-shortcut',
        'plugin:window-state',
        'plugin:single-instance',
        'plugin:updater',
        'plugin:fs|read_text_file',
        'plugin:clipboard-manager|write_text',
        'plugin:dialog|open',
        'plugin:opener|open_url',
        'plugin:deep-link',
        'plugin:notification',
        'plugin:nfc|scan',
      ],
    },
    target: {
      name: '目标平台',
      description:
        '要迁移到的移动平台;同一能力点在 Android 与 iOS 上的备注可能不同(如 NFC 的 Info.plist 声明)。',
      control: {
        type: 'select',
      },
      options: ['Android', 'iOS'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
