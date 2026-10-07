import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './wake-sim.ts?raw';
import {
  createWakeSim,
  type WakeSimInstance,
  type WakeSimOptions,
  type WakeSimSnapshot,
} from './wake-sim';

const renderInteractive = canvasStory({
  create: createWakeSim,
  apply(instance: WakeSimInstance, args: WakeSimOptions) {
    instance.update(args);
  },
  readout(snapshot: WakeSimSnapshot) {
    return [
      ['唤起场景', snapshot.stateText],
      ['深链去向', snapshot.target],
      ['你的代码收到 URL', snapshot.received],
      ['窗口结果', snapshot.windowResult],
    ];
  },
});

const meta = {
  id: 'deep-links',
  title: '进阶主题/深链与单实例',
  tags: ['!dev'],
  args: {
    platform: 'macOS',
    packaged: true,
    entryArg: false,
    instanceRunning: true,
  },
  argTypes: {
    platform: {
      name: '平台',
      description: '深链被点开时所在的操作系统；URL 的送达机制按平台分化。',
      control: {
        type: 'radio',
        options: ['macOS', 'Windows', 'Linux'],
      },
    },
    packaged: {
      name: '打包应用',
      description:
        '运行的是打包安装后的应用，还是开发模式（electron .）——注册是否生效的第一分界。',
      control: {
        type: 'boolean',
      },
    },
    entryArg: {
      name: '注册带入口参数',
      description:
        '开发模式下是否按教程把入口脚本一起登记（setAsDefaultProtocolClient 的第三参）；打包后走默认注册，本项不参与结果。',
      control: {
        type: 'boolean',
      },
    },
    instanceRunning: {
      name: '已有实例持有单实例锁',
      description:
        '点击深链时是否已有一个持有 requestSingleInstanceLock 锁的实例在运行。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<WakeSimOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
