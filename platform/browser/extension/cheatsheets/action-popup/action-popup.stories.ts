import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createButtonExample,
  type ButtonInstance,
  type ButtonOptions,
  type ButtonSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createButtonExample,
  apply(instance: ButtonInstance, args: ButtonOptions) {
    instance.update(args);
  },
  readout(snapshot: ButtonSnapshot) {
    return [
      ['全局 badge', snapshot.globalBadge || '（空）'],
      ['标签页 42 badge', snapshot.tabBadge || '（空）'],
      ['点击标签页 42', snapshot.clickResult],
    ];
  },
});

const meta = {
  id: 'action-popup',
  title: '浏览器界面/Action 与弹窗',
  tags: ['!dev'],
  args: {
    badgeText: '7',
    tabBadgeText: '!',
    hasPopup: true,
    enabled: true,
  },
  argTypes: {
    badgeText: {
      name: '全局 badge 文字',
      description: 'chrome.action.setBadgeText({ text }) 的全局设置，空字符串清空。',
      control: { type: 'text' },
    },
    tabBadgeText: {
      name: '标签页 42 badge 覆盖',
      description: 'setBadgeText({ tabId, text }) 的标签页级设置，留空回退全局值。',
      control: { type: 'text' },
    },
    hasPopup: {
      name: '设置了 popup',
      description: '是否通过 default_popup / setPopup 设置点击弹窗。',
      control: { type: 'boolean' },
    },
    enabled: {
      name: '启用状态',
      description: 'enable / disable 决定按钮可否点击。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ButtonOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
