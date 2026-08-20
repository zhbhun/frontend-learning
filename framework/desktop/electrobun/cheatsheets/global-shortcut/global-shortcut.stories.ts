import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import schematicSource from './shortcut-registry-flow.ts?raw';
import {
  createShortcutRegistryFlowSchematic,
  type ShortcutRegistryFlowInstance,
  type ShortcutRegistryFlowSnapshot,
  type SystemState,
} from './shortcut-registry-flow';

interface ShortcutRegistryFlowArgs {
  systemState: SystemState;
}

const renderSchematic = canvasStory({
  create: createShortcutRegistryFlowSchematic,
  apply(instance: ShortcutRegistryFlowInstance, args: ShortcutRegistryFlowArgs) {
    instance.update(args);
  },
  readout(snapshot: ShortcutRegistryFlowSnapshot) {
    return [
      ['register 返回', snapshot.registerResult],
      ['isRegistered', snapshot.probe],
      ['处理表条目数', snapshot.handlerCount],
    ];
  },
});

const meta = {
  id: 'global-shortcut',
  title: '系统集成/桌面能力/全局快捷键',
  tags: ['!dev'],
  args: {
    systemState: 'free',
  },
  argTypes: {
    systemState: {
      name: 'systemState',
      description: '系统侧状态：决定 register 走到原生层后的结果。',
      options: ['free', 'other-app', 'no-native'],
      control: {
        type: 'inline-radio',
        labels: {
          'free': 'free（组合空闲）',
          'other-app': 'other-app（被其他应用占用）',
          'no-native': 'no-native（无原生环境）',
        },
      },
    },
  },
  render: renderSchematic,
  parameters: storySource(schematicSource),
} satisfies Meta<ShortcutRegistryFlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShortcutRegistryFlowSchematic: Story = {};
