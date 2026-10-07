import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './theme-sim.ts?raw';
import {
  createThemeSim,
  type ThemeSimInstance,
  type ThemeSimOptions,
  type ThemeSimSnapshot,
} from './theme-sim';

const renderInteractive = canvasStory({
  create: createThemeSim,
  apply(instance: ThemeSimInstance, args: ThemeSimOptions) {
    instance.update(args);
  },
  readout(snapshot: ThemeSimSnapshot) {
    return [
      ['shouldUseDarkColors', snapshot.shouldUseDarkText],
      ['页面 prefers-color-scheme', snapshot.cssQueryText],
      ['原生 UI 外观', snapshot.nativeUiText],
      ["'updated' 事件", snapshot.updatedText],
    ];
  },
});

const meta = {
  id: 'dark-mode',
  title: '进阶主题/深色模式',
  tags: ['!dev'],
  args: {
    systemTheme: 'light',
    themeSource: 'system',
  },
  argTypes: {
    systemTheme: {
      name: '系统主题',
      description:
        '操作系统当前的深浅外观；themeSource 为 system 时，生效值跟随它。',
      control: {
        type: 'radio',
        options: ['light', 'dark'],
      },
    },
    themeSource: {
      name: 'themeSource 色源',
      description:
        'nativeTheme.themeSource 的三个合法值：system 撤销覆盖、跟随系统；light / dark 显式覆盖系统选择。',
      control: {
        type: 'radio',
        options: ['system', 'light', 'dark'],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<ThemeSimOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
