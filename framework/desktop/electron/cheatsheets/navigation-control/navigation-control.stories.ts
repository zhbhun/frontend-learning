import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './navigation-sim.ts?raw';
import {
  createNavigationSim,
  type NavActionLabel,
  type NavigationSimInstance,
  type NavigationSimOptions,
  type NavigationSimSnapshot,
} from './navigation-sim';

interface NavigationSimArgs extends NavigationSimOptions {}

const ACTION_OPTIONS: NavActionLabel[] = [
  'window.open() 开新窗',
  '链接 target="_blank"',
  '普通链接跳转',
  '锚点 / hash 跳转',
  '302 重定向',
  '申请摄像头权限',
];

const toneLabel: Record<NavigationSimSnapshot['tone'], string> = {
  ok: '防线生效',
  warn: '口子已拦',
  blocked: '默认放行',
  neutral: '白名单放行',
};

const renderInteractive = canvasStory({
  create: createNavigationSim,
  apply(instance: NavigationSimInstance, args: NavigationSimArgs) {
    instance.update(args);
  },
  readout(snapshot: NavigationSimSnapshot) {
    return [
      ['页面动作', snapshot.action],
      [
        '口子',
        `${snapshot.gate}${snapshot.mounted === null ? '' : snapshot.mounted ? '（已挂载）' : '（未挂载）'}`,
      ],
      ['挂载位置', snapshot.gateHost],
      ['判定', `${toneLabel[snapshot.tone]}——${snapshot.verdict}`],
    ];
  },
});

const meta = {
  id: 'navigation-control',
  title: '安全/导航与弹窗控制',
  tags: ['!dev'],
  args: {
    action: 'window.open() 开新窗',
    windowOpenHandler: false,
    navigateHandler: false,
    permissionHandler: false,
    allowlisted: false,
  },
  argTypes: {
    action: {
      name: '页面动作',
      description: '页面发起的越界动作：不同动作走不同口子。',
      control: {
        type: 'select',
        options: ACTION_OPTIONS,
      },
    },
    windowOpenHandler: {
      name: '挂 setWindowOpenHandler',
      description: '是否已通过 setWindowOpenHandler（或 web-contents-created 全局兜底）拦截新窗口。',
      control: {
        type: 'boolean',
      },
    },
    navigateHandler: {
      name: '挂 will-navigate / will-redirect',
      description: '是否已在 webContents 上监听导航事件并按白名单 preventDefault。',
      control: {
        type: 'boolean',
      },
    },
    permissionHandler: {
      name: '挂权限 handler',
      description: '是否已在目标会话上设置 setPermissionRequestHandler。',
      control: {
        type: 'boolean',
      },
    },
    allowlisted: {
      name: '目标 URL 在白名单内',
      description: '本次动作的目标 URL 是否命中主进程白名单（重定向场景判定的是重定向目标）。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<NavigationSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
