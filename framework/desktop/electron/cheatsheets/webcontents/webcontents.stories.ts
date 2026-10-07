import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './load-sim.ts?raw';
import {
  createLoadSim,
  type LoadSimInstance,
  type LoadSimOptions,
  type LoadSimSnapshot,
} from './load-sim';

interface LoadSimArgs {
  scenario: LoadSimOptions['scenario'];
}

const renderInteractive = canvasStory({
  create: createLoadSim,
  apply(instance: LoadSimInstance, args: LoadSimArgs) {
    instance.update(args);
  },
  readout(snapshot: LoadSimSnapshot) {
    return [
      ['加载场景', snapshot.scenario],
      ['收场', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'webcontents',
  title: 'Web 内容/webContents',
  tags: ['!dev'],
  args: {
    scenario: '本地页面加载成功',
  },
  argTypes: {
    scenario: {
      name: '加载场景',
      description: '选择一次页面加载或导航的场景，观察事件时间线与收场。',
      control: {
        type: 'radio',
        options: [
          '本地页面加载成功',
          '远程地址加载失败',
          '加载中调用 stop()',
          '点击外链：放行',
          '点击外链：拦截',
        ],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<LoadSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
