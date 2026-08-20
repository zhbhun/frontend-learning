import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import schematicSource from './menu-click-flow.ts?raw';
import {
  createMenuClickFlowSchematic,
  type MenuClickFlowInstance,
  type MenuClickFlowSnapshot,
  type MenuPreset,
} from './menu-click-flow';

interface MenuClickFlowArgs {
  menuPreset: MenuPreset;
}

const renderSchematic = canvasStory({
  create: createMenuClickFlowSchematic,
  apply(instance: MenuClickFlowInstance, args: MenuClickFlowArgs) {
    instance.update(args);
  },
  readout(snapshot: MenuClickFlowSnapshot) {
    return [
      ['点击项', snapshot.clicked],
      ['判定路径', snapshot.dispatch],
      ['e.data', snapshot.payload],
    ];
  },
});

const meta = {
  id: 'application-menu',
  title: '系统集成/菜单与托盘/应用菜单',
  tags: ['!dev'],
  args: {
    menuPreset: 'edit-roles',
  },
  argTypes: {
    menuPreset: {
      name: '菜单形态',
      description: '菜单形态：角色菜单（系统行为走 role）或自定义项菜单（命令走 action）。',
      options: ['edit-roles', 'custom-actions'],
      control: {
        type: 'inline-radio',
        labels: {
          'edit-roles': 'edit-roles（角色菜单）',
          'custom-actions': 'custom-actions（自定义项）',
        },
      },
    },
  },
  render: renderSchematic,
  parameters: storySource(schematicSource),
} satisfies Meta<MenuClickFlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MenuClickFlowSchematic: Story = {};
