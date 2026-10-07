import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './tray-click-sim.ts?raw';
import {
  createTrayClickSim,
  type TrayClickSimInstance,
  type TrayClickSimSnapshot,
  type TrayPlatform,
} from './tray-click-sim';

interface TrayClickArgs {
  platform: TrayPlatform;
  hasMenu: boolean;
}

const renderInteractive = canvasStory({
  create: createTrayClickSim,
  apply(instance: TrayClickSimInstance, args: TrayClickArgs) {
    instance.update(args);
  },
  readout(snapshot: TrayClickSimSnapshot) {
    return [
      ['托盘形态', snapshot.formText],
      ['最近一次点击', snapshot.lastClick],
    ];
  },
});

const meta = {
  id: 'tray',
  title: '原生能力/托盘',
  tags: ['!dev'],
  args: {
    platform: 'macOS',
    hasMenu: true,
  },
  argTypes: {
    platform: {
      name: '平台',
      description: '托盘点按行为按平台分化；切换后重新点击画布中的图标对照。',
      control: {
        type: 'radio',
        options: ['macOS', 'Windows', 'Linux'],
      },
    },
    hasMenu: {
      name: 'setContextMenu 已设置',
      description:
        '是否调用 tray.setContextMenu(menu) 给托盘挂菜单——它是点按行为分化的开关。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<TrayClickArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Click: Story = {};
