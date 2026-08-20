import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './verify-boot.ts?raw';
import {
  createVerifyBoot,
  type BootInstance,
  type BootSnapshot,
} from './verify-boot';

// 安装验证没有可调输入,apply 只负责把实例接进渲染循环契约
const renderVerifyBoot = canvasStory<Record<string, never>, BootSnapshot, BootInstance>({
  create: createVerifyBoot,
  apply() {
    /* 无输入:实例在 create 时完成引导,读数来自 scene create 的快照 */
  },
  readout(snapshot: BootSnapshot) {
    return [
      ['引擎版本', snapshot.version],
      ['渲染器', snapshot.renderer],
    ];
  },
  captions: ['最小 Phaser.Game 引导'],
});

const meta = {
  id: 'installation',
  title: '上手/安装',
  tags: ['!dev'],
  render: renderVerifyBoot,
  parameters: storySource(exampleSource),
} satisfies Meta<Record<string, never>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VerifyBoot: Story = {};
