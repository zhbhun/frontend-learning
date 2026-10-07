import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './bridge-sim.ts?raw';
import {
  createBridgeSim,
  type BridgeSimInstance,
  type BridgeSimSnapshot,
} from './bridge-sim';

interface BridgeSimArgs {
  exposure: 'contextBridge' | 'window';
  isolation: boolean;
}

const renderInteractive = canvasStory({
  create: createBridgeSim,
  apply(instance: BridgeSimInstance, args: BridgeSimArgs) {
    instance.update(args);
  },
  readout(snapshot: BridgeSimSnapshot) {
    return [
      [
        'typeof window.versions',
        snapshot.versionsVisible ? "'object'" : "'undefined'",
      ],
      [
        'typeof window.debugToken',
        snapshot.tokenVisible ? "'object'" : "'undefined'",
      ],
      ['typeof process', "'undefined'"],
      ['上下文隔离', snapshot.isolation ? '开启' : '关闭'],
    ];
  },
});

const meta = {
  id: 'preload',
  title: '起步/预加载脚本',
  tags: ['!dev'],
  args: {
    exposure: 'contextBridge',
    isolation: true,
  },
  argTypes: {
    exposure: {
      name: '暴露方式',
      description: '页面需要的 API 用哪种方式从预加载脚本送出。',
      control: {
        type: 'radio',
        options: ['contextBridge', 'window'],
      },
    },
    isolation: {
      name: '上下文隔离',
      description: '对应 webPreferences.contextIsolation，Electron 12 起默认开启。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<BridgeSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
