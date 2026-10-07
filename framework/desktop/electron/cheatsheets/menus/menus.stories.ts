import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './menu-template-sim.ts?raw';
import {
  createMenuTemplateSim,
  type MenuPlatform,
  type MenuTemplateSimInstance,
  type MenuTemplateSimSnapshot,
} from './menu-template-sim';

interface MenuTemplateArgs {
  platform: MenuPlatform;
  separatorInRadio: boolean;
}

const renderInteractive = canvasStory({
  create: createMenuTemplateSim,
  apply(instance: MenuTemplateSimInstance, args: MenuTemplateArgs) {
    instance.update(args);
  },
  readout(snapshot: MenuTemplateSimSnapshot) {
    return [
      ['平台（CommandOrControl）', snapshot.platformText],
      ['最近一次点击', snapshot.lastEvent],
    ];
  },
});

const meta = {
  id: 'menus',
  title: '原生能力/菜单',
  tags: ['!dev'],
  args: {
    platform: 'macOS',
    separatorInRadio: false,
  },
  argTypes: {
    platform: {
      name: '平台',
      description: 'CommandOrControl 在两平台的解析结果，role 项显示的快捷键随之变化。',
      control: {
        type: 'radio',
        options: ['macOS', 'Windows'],
      },
    },
    separatorInRadio: {
      name: 'radio 组插分隔线',
      description: "在「中字号」与「大字号」之间插入 { type: 'separator' }，radio 的互斥范围随之断组。",
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<MenuTemplateArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
