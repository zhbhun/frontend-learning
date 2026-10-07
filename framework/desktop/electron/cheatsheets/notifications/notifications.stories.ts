import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import badgeSimSource from './badge-sim.ts?raw';
import notificationSimSource from './notification-sim.ts?raw';
import {
  createBadgeSim,
  type BadgeSimInstance,
  type BadgeSimOptions,
  type BounceMode,
  type ProgressMode,
} from './badge-sim';
import {
  createNotificationSim,
  type NotificationSimInstance,
  type NotificationSimOptions,
} from './notification-sim';

interface NotificationSimArgs {
  silent: boolean;
  focusOnClick: boolean;
}

interface BadgeSimArgs {
  badgeCount: number;
  bounce: BounceMode;
  progress: ProgressMode;
  overlay: boolean;
}

const renderNotificationSim = canvasStory({
  create: createNotificationSim,
  apply(instance: NotificationSimInstance, args: NotificationSimArgs) {
    instance.update(args);
  },
  readout(snapshot: NotificationSimSnapshot) {
    return [
      ['事件日志', snapshot.eventsText],
      ['窗口状态', snapshot.windowState],
      ['通知横幅', snapshot.bannerState],
    ];
  },
});

const renderBadgeSim = canvasStory({
  create: createBadgeSim,
  apply(instance: BadgeSimInstance, args: BadgeSimArgs) {
    instance.update(args);
  },
  readout(snapshot: BadgeSimSnapshot) {
    return [
      ['macOS 调用', snapshot.macosApiText],
      ['Windows 调用', snapshot.windowsApiText],
    ];
  },
});

const meta = {
  id: 'notifications',
  title: '原生能力/通知与角标',
  tags: ['!dev'],
} satisfies Meta<NotificationSimArgs>;

export default meta;

type NotificationStory = StoryObj<Meta<NotificationSimArgs>>;
type BadgeStory = StoryObj<Meta<BadgeSimArgs>>;

export const Interactive: NotificationStory = {
  args: {
    silent: false,
    focusOnClick: true,
  },
  argTypes: {
    silent: {
      name: 'silent',
      description: '构造选项 silent：true 时不发系统提示音。',
      control: {
        type: 'boolean',
      },
    },
    focusOnClick: {
      name: 'click 里调 win.show()',
      description:
        '决定 click 回调里是否调用 win.show()：勾选时点击横幅窗口到前台，不勾选时窗口留在后台。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderNotificationSim,
  parameters: storySource(notificationSimSource),
};

export const Badges: BadgeStory = {
  args: {
    badgeCount: 3,
    bounce: '不弹跳',
    progress: '无',
    overlay: false,
  },
  argTypes: {
    badgeCount: {
      name: 'badgeCount',
      description: 'app.setBadgeCount 的参数：macOS Dock 红点数字，0 隐藏。',
      control: {
        type: 'range',
        min: 0,
        max: 9,
        step: 1,
      },
    },
    bounce: {
      name: 'dock.bounce type',
      description:
        'app.dock.bounce 的弹跳类型：informational 弹约 1 秒；critical 持续弹到应用激活或取消。',
      control: {
        type: 'radio',
        options: ['不弹跳', 'informational', 'critical'],
      },
    },
    progress: {
      name: '进度',
      description:
        'win.setProgressBar 的进度值：\'0.6\' 对应 setProgressBar(0.6)；\'indeterminate\' 对应传入 > 1 的值进入不确定态。',
      control: {
        type: 'radio',
        options: ['无', '0.6', 'indeterminate'],
      },
    },
    overlay: {
      name: 'overlay',
      description:
        'win.setOverlayIcon：true 时任务栏按钮右下角叠 16×16 覆盖图标，false 对应传 null 清除。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderBadgeSim,
  parameters: storySource(badgeSimSource),
};
