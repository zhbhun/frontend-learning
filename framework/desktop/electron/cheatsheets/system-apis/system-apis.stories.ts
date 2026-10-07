import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './clipboard-sim.ts?raw';
import {
  createClipboardSim,
  type ClipboardSimInstance,
  type ClipboardSimSnapshot,
} from './clipboard-sim';

const renderInteractive = canvasStory({
  create: createClipboardSim,
  apply(instance: ClipboardSimInstance) {
    instance.update();
  },
  readout(snapshot: ClipboardSimSnapshot) {
    return [
      ['availableFormats()', snapshot.formats],
      ['readText()', snapshot.textResult],
      ['readHTML()', snapshot.htmlResult],
      ['最近一次操作', snapshot.lastAction],
    ];
  },
  captions: [
    '写入：write 系列整体替换剪贴板',
    '读取：read 系列按格式取用，缺格式返回空',
  ],
});

const meta = {
  id: 'system-apis',
  title: '原生能力/系统信息与剪贴板',
  tags: ['!dev'],
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
