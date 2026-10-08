import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import contextSource from './context-menu.ts?raw';
import exampleSource from './example.ts?raw';
import shortcutsSource from './shortcuts.ts?raw';
import {
  createContextMenu,
  type ContextArgs,
  type ContextInstance,
  type ContextSnapshot,
} from './context-menu';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';
import {
  createShortcuts,
  type ShortcutArgs,
  type ShortcutInstance,
  type ShortcutSnapshot,
} from './shortcuts';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['菜单事件', snapshot.menuEvent],
      ['action 回调(JS)', snapshot.action],
      ['on_menu_event(Rust)', snapshot.rustHandler],
      ['勾选 / 系统行为', snapshot.special],
    ];
  },
});

const renderContextPopup = canvasStory({
  create: createContextMenu,
  apply(instance: ContextInstance, args: ContextArgs) {
    instance.update(args);
  },
  readout(snapshot: ContextSnapshot) {
    return [
      ['DOM 事件', snapshot.domEvent],
      ['preventDefault', snapshot.preventDefault],
      ['menu.popup()', snapshot.popupCall],
      ['当前弹出', snapshot.shown],
      ['菜单点击', snapshot.itemClick],
    ];
  },
});

const renderGlobalShortcuts = canvasStory({
  create: createShortcuts,
  apply(instance: ShortcutInstance, args: ShortcutArgs) {
    instance.update(args);
  },
  readout(snapshot: ShortcutSnapshot) {
    return [
      ['菜单加速键', snapshot.accelerator],
      ['全局快捷键', snapshot.global],
      ['当前按键', snapshot.keyLine],
    ];
  },
});

const meta = {
  id: 'menus-shortcuts',
  title: '桌面进阶/菜单与快捷键',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs & ContextArgs & ShortcutArgs>;

export const Interactive: StoryObj<ExampleArgs> = {
  args: {
    topLevel: 'submenus',
  },
  argTypes: {
    topLevel: {
      name: '顶层结构',
      description:
        'submenus:菜单项分组为「文件 / 编辑」子菜单,macOS 唯一合法形态;flat:把「打开…」「自动保存」平铺在 Menu 顶层——macOS 忽略顶层普通项,点击不产生任何事件。',
      control: { type: 'radio' },
      options: ['submenus', 'flat'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
};

export const ContextPopup: StoryObj<ContextArgs> = {
  args: {
    intercept: true,
    popup: true,
  },
  argTypes: {
    intercept: {
      name: '拦截 contextmenu',
      description:
        '在 document 上绑定 contextmenu 监听并调用 preventDefault()。关掉后 WebView 默认右键菜单照常弹出(示例用模拟菜单示意),menu.popup() 永远不会执行。',
      control: { type: 'boolean' },
    },
    popup: {
      name: '调用 menu.popup()',
      description:
        '在监听回调里对自定义 Menu 调用 popup():省略位置参数时贴着鼠标弹出,promise 在菜单显示时立即 resolve,点击响应走菜单项的 action。只拦截不弹出时,右键没有任何反应。',
      control: { type: 'boolean' },
    },
  },
  render: renderContextPopup,
  parameters: storySource(contextSource),
};

export const GlobalShortcuts: StoryObj<ShortcutArgs> = {
  args: {
    appFocused: true,
    globalState: 'registered',
  },
  argTypes: {
    appFocused: {
      name: '应用聚焦',
      description:
        'tauri-app 是否在前台。菜单加速键(菜单项的 accelerator)只在应用聚焦时被菜单系统处理;全局快捷键不看焦点。',
      control: { type: 'boolean' },
    },
    globalState: {
      name: '全局快捷键',
      description:
        'unregistered:还没向系统注册,无事件;registered:已用 register() 注册,任何前台下触发并带 state;taken:组合已被其他应用占用,handler 不会触发(isRegistered 只反映本应用)。',
      control: { type: 'select' },
      options: ['unregistered', 'registered', 'taken'],
    },
  },
  render: renderGlobalShortcuts,
  parameters: storySource(shortcutsSource),
};

export default meta;
