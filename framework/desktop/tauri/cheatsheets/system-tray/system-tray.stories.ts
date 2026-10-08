import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import residentSource from './close-resident.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';
import {
  createResident,
  type ResidentArgs,
  type ResidentInstance,
  type ResidentSnapshot,
} from './close-resident';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['TrayIconEvent', snapshot.trayEvent],
      ['托盘菜单 MenuEvent', snapshot.menuEvent],
      ['响应通道 action · on_menu_event', snapshot.handler],
    ];
  },
});

const renderResident = canvasStory({
  create: createResident,
  apply(instance: ResidentInstance, args: ResidentArgs) {
    instance.update(args);
  },
  readout(snapshot: ResidentSnapshot) {
    return [
      ['进程状态', snapshot.process],
      ['窗口状态', snapshot.window],
      ['退出 / 关闭请求', snapshot.exit],
      ['托盘动作', snapshot.tray],
    ];
  },
});

const meta = {
  id: 'system-tray',
  title: '桌面进阶/系统托盘',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs & ResidentArgs>;

export const Interactive: StoryObj<ExampleArgs> = {
  args: {
    showMenuOnLeftClick: true,
    platform: 'macos',
  },
  argTypes: {
    showMenuOnLeftClick: {
      name: '左键弹菜单',
      description:
        '对应 showMenuOnLeftClick(默认 true):左键与右键都弹出托盘菜单,同时 Click 事件照常发出;关掉后左键不弹菜单,行为交给 on_tray_icon_event,右键仍弹菜单。Linux 不支持此设置。',
      control: { type: 'boolean' },
    },
    platform: {
      name: '平台',
      description:
        'macos:悬停与点击均发出 TrayIconEvent,悬停显示 tooltip;linux:托盘事件一律不发出(悬停与点击都无事件读数),但菜单弹出由系统处理,菜单点击事件照常。',
      control: { type: 'radio' },
      options: ['macos', 'linux'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
};

export const Resident: StoryObj<ResidentArgs> = {
  args: {
    closeBehavior: 'exit-requested',
  },
  argTypes: {
    closeBehavior: {
      name: '关窗行为',
      description:
        'none:不拦截,最后一个窗口关闭后进程直接退出;exit-requested:app 级 RunEvent::ExitRequested 拦截(code = None 时 prevent_exit),窗口销毁、进程常驻;close-requested:窗口级 CloseRequested 拦截(prevent_close + hide),窗口隐藏、实例保留。',
      control: { type: 'radio' },
      options: ['exit-requested', 'close-requested', 'none'],
    },
  },
  render: renderResident,
  parameters: storySource(residentSource),
};

export default meta;
