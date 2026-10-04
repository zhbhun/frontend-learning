import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import groupsSource from './shortcut-groups.ts?raw';
import tableSource from './shortcut-table.ts?raw';
import { SHORTCUT_GROUPS } from './shortcut-groups';
import {
  createShortcutTable,
  type ShortcutTableInstance,
  type ShortcutTableSnapshot,
} from './shortcut-table';

interface ShortcutArgs {
  groups: string[];
}

const GROUP_NAMES = SHORTCUT_GROUPS.map((group) => group.name);

const renderShortcuts = canvasStory({
  create: createShortcutTable,
  apply(instance: ShortcutTableInstance, args: ShortcutArgs) {
    instance.update({ groups: args.groups });
  },
  readout(snapshot: ShortcutTableSnapshot) {
    const groupText =
      snapshot.visibleGroups === 0
        ? '未选择'
        : snapshot.visibleGroups === snapshot.totalGroups
          ? '全部'
          : `${snapshot.visibleGroups} / ${snapshot.totalGroups} 组`;
    return [
      ['过滤分组', groupText],
      ['可见快捷键', `${snapshot.visibleItems} 条`],
    ];
  },
  captions: ['本页即练习场：按 Cmd+Opt+I 或 F12 / Ctrl+Shift+I 打开 DevTools，对照下表操作'],
});

const meta = {
  id: 'shortcuts',
  title: '上手与界面/高效操作',
  tags: ['!dev'],
  args: {
    groups: [...GROUP_NAMES],
  },
  argTypes: {
    groups: {
      name: '分组过滤',
      description: '勾选要回查的快捷键分组，画布与读数立即更新。',
      control: {
        type: 'multi-select',
      },
      options: GROUP_NAMES,
    },
  },
  render: renderShortcuts,
  // Show code 从同一真源投影：数据文件（主题输入）+ 渲染器（核心实现）。
  parameters: storySource(`${groupsSource}\n\n${tableSource}`),
} satisfies Meta<ShortcutArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
