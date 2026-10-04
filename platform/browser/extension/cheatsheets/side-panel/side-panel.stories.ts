import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import openBehaviorSource from './open-behavior.ts?raw';
import sitePanelSource from './site-panel.ts?raw';
import {
  createOpenBehaviorExample,
  type GestureSource,
  type OpenBehaviorInstance,
  type OpenBehaviorOptions,
  type OpenBehaviorSnapshot,
  type OpenTarget,
} from './open-behavior';
import {
  createSitePanelExample,
  type SitePanelInstance,
  type SitePanelOptions,
  type SitePanelSnapshot,
  type TabSite,
} from './site-panel';

interface OpenBehaviorArgs {
  openPanelOnActionClick: boolean;
  gesture: string;
  openTarget: string;
}

interface SitePanelArgs {
  tabUrl: string;
  hasPermission: boolean;
}

const GESTURE_BY_LABEL: Record<string, GestureSource> = {
  'action.onClicked 回调': 'action',
  'commands.onCommand 回调': 'command',
  'contextMenus.onClicked 回调': 'contextMenu',
  '扩展页面按钮点击': 'pageClick',
  'setInterval 定时回调': 'timer',
};

const OPEN_TARGET_BY_LABEL: Record<string, OpenTarget> = {
  'windowId: 1': 'window',
  'tabId: 42': 'tab',
  都不传: 'none',
};

const TAB_URL_BY_LABEL: Record<string, TabSite> = {
  'https://www.google.com/search': 'google',
  'https://www.example.com/': 'example',
};

const renderOpenBehavior = canvasStory({
  create: createOpenBehaviorExample,
  apply(instance: OpenBehaviorInstance, args: OpenBehaviorArgs) {
    const options: OpenBehaviorOptions = {
      openPanelOnActionClick: args.openPanelOnActionClick,
      gesture: GESTURE_BY_LABEL[args.gesture],
      openTarget: OPEN_TARGET_BY_LABEL[args.openTarget],
    };
    instance.update(options);
  },
  readout(snapshot: OpenBehaviorSnapshot) {
    return [
      ['点击工具栏图标', snapshot.iconClick],
      ['open()', snapshot.openCall],
      ['面板最终状态', snapshot.panelState],
    ];
  },
  captions: ['打开方式演算：初始面板为关闭', 'chrome.sidePanel 全局面板'],
});

const renderSitePanel = canvasStory({
  create: createSitePanelExample,
  apply(instance: SitePanelInstance, args: SitePanelArgs) {
    const options: SitePanelOptions = {
      tabUrl: TAB_URL_BY_LABEL[args.tabUrl],
      hasPermission: args.hasPermission,
    };
    instance.update(options);
  },
  readout(snapshot: SitePanelSnapshot) {
    return [
      ['tab.url', snapshot.urlLabel],
      ['权限状态', snapshot.permissionLabel],
      ['setOptions 调用', snapshot.callText],
      ['面板', snapshot.panelVisible],
      ['侧边栏下拉', snapshot.menuVisible],
    ];
  },
  captions: ['站点级面板演算：监听 tabs.onUpdated', '目标站点 google.com，tabId 42'],
});

const meta = {
  id: 'side-panel',
  title: '浏览器界面/侧边栏',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const OpenBehavior: StoryObj<OpenBehaviorArgs> = {
  args: {
    openPanelOnActionClick: true,
    gesture: 'contextMenus.onClicked 回调',
    openTarget: 'windowId: 1',
  },
  argTypes: {
    openPanelOnActionClick: {
      name: 'openPanelOnActionClick',
      description:
        'setPanelBehavior 的写入值：点击工具栏图标是否开合侧边栏，默认 false。',
      control: { type: 'boolean' },
    },
    gesture: {
      name: 'open() 调用位置',
      description:
        'open() 在哪个回调里被调用；只有响应用户操作的调用会成功。',
      control: { type: 'select' },
      options: [
        'action.onClicked 回调',
        'commands.onCommand 回调',
        'contextMenus.onClicked 回调',
        '扩展页面按钮点击',
        'setInterval 定时回调',
      ],
    },
    openTarget: {
      name: 'open() 目标参数',
      description: '传给 open() 的 OpenOptions，至少要带 windowId 或 tabId。',
      control: { type: 'select' },
      options: ['windowId: 1', 'tabId: 42', '都不传'],
    },
  },
  render: renderOpenBehavior,
  parameters: storySource(openBehaviorSource),
};

export const SitePanel: StoryObj<SitePanelArgs> = {
  args: {
    tabUrl: 'https://www.google.com/search',
    hasPermission: true,
  },
  argTypes: {
    tabUrl: {
      name: '标签页 URL',
      description: 'tabs.onUpdated 当前处理的标签页地址。',
      control: { type: 'select' },
      options: ['https://www.google.com/search', 'https://www.example.com/'],
    },
    hasPermission: {
      name: '已声明 tabs/host 权限',
      description: '没有该权限时 tab.url 为 undefined，判断落入 else 分支。',
      control: { type: 'boolean' },
    },
  },
  render: renderSitePanel,
  parameters: storySource(sitePanelSource),
};
