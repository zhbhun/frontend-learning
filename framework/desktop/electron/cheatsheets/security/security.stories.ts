import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './security-sim.ts?raw';
import {
  createSecuritySim,
  type PageWorldState,
  type RiskLevel,
  type SecuritySimInstance,
  type SecuritySimSnapshot,
} from './security-sim';

interface SecuritySimArgs {
  isolation: boolean;
  sandbox: boolean;
  nodeIntegration: boolean;
}

const pageWorldLabels: Record<PageWorldState, string> = {
  clean: '无 require，Node 不可达',
  shared: '与预加载同世界，Node 原语可被触及',
  full: 'require 直接可用（完整 Node）',
  process: '进程持有完整 Node（官方对远程内容是 paramount 禁令）',
};

const riskLabels: Record<RiskLevel, string> = {
  baseline: '安全基线（默认值）',
  weakened: '防线削弱',
  dangerous: '高危配置',
};

const renderInteractive = canvasStory({
  create: createSecuritySim,
  apply(instance: SecuritySimInstance, args: SecuritySimArgs) {
    instance.update(args);
  },
  readout(snapshot: SecuritySimSnapshot) {
    return [
      [
        '进程沙箱',
        snapshot.effectiveSandbox
          ? '生效'
          : `失效${snapshot.forcedOff ? '（被牵连关闭）' : ''}`,
      ],
      ['页面主世界', pageWorldLabels[snapshot.pageWorld]],
      [
        '预加载可用 Node',
        snapshot.preloadNode === 'subset'
          ? '子集（electron 渲染端 + events/timers/url）'
          : '完整 Node',
      ],
      ['判定', riskLabels[snapshot.risk]],
    ];
  },
});

const meta = {
  id: 'security',
  title: '安全/安全清单',
  tags: ['!dev'],
  args: {
    isolation: true,
    sandbox: true,
    nodeIntegration: false,
  },
  argTypes: {
    isolation: {
      name: '上下文隔离',
      description: '对应 webPreferences.contextIsolation，Electron 12 起默认开启。',
      control: {
        type: 'boolean',
      },
    },
    sandbox: {
      name: '进程沙箱',
      description: '对应 webPreferences.sandbox，Electron 20 起默认开启。',
      control: {
        type: 'boolean',
      },
    },
    nodeIntegration: {
      name: 'Node 集成',
      description: '对应 webPreferences.nodeIntegration，默认关闭。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<SecuritySimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
