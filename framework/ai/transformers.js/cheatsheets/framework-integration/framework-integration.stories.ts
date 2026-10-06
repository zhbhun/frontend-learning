import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './singleton-vs-rebuild.ts?raw';
import {
  createSingletonLab,
  type HoldMode,
  type LabInstance,
  type LabSnapshot,
} from './singleton-vs-rebuild';

interface LabArgs {
  mode: HoldMode;
  remount: boolean;
}

const STATUS_LABELS: Record<LabSnapshot['status'], string> = {
  loading: '加载中（首次需下载模型）',
  ready: '就绪',
  error: '出错',
};

/* 持有方式控件：与正文持有方式对照表的两行一一对应 */
const MODE_LABELS: Record<HoldMode, string> = {
  singleton: '模块级单例',
  rebuild: '每次挂载重建',
};

/* 最近一次挂载读数：用时后标注来源，与画布记录表的「来源」列一致 */
function lastMountText(snapshot: LabSnapshot): string {
  if (snapshot.last === null) {
    return '—';
  }
  return `${snapshot.last.seconds.toFixed(1)} 秒（${snapshot.last.source}）`;
}

/* 两次挂载的用时对照：单例模式第二次应接近 0，重建模式仍有会话初始化成本 */
function comparisonText(snapshot: LabSnapshot): string {
  const history = snapshot.history;
  if (history.length < 2) {
    return '—';
  }
  const previous = history[history.length - 2];
  const current = history[history.length - 1];
  return `${previous.seconds.toFixed(1)} 秒 → ${current.seconds.toFixed(1)} 秒（#${previous.index} → #${current.index}）`;
}

const renderInteractive = canvasStory({
  create: createSingletonLab,
  apply(instance: LabInstance, args: LabArgs) {
    instance.update(args);
  },
  readout(snapshot: LabSnapshot) {
    return [
      [
        '状态',
        snapshot.status === 'loading'
          ? `${STATUS_LABELS.loading}（${Math.round(snapshot.progress)}%）`
          : STATUS_LABELS[snapshot.status],
      ],
      ['持有方式', MODE_LABELS[snapshot.mode]],
      ['挂载次数', `${snapshot.mountCount} 次`],
      ['最近一次挂载用时', lastMountText(snapshot)],
      ['最近两次挂载用时对照', comparisonText(snapshot)],
      ['已创建 pipeline 实例', `${snapshot.instanceCount} 个`],
    ];
  },
});

const meta = {
  id: 'framework-integration',
  title: '进阶/框架集成',
  tags: ['!dev'],
  args: {
    mode: 'singleton',
    remount: false,
  } as LabArgs,
  argTypes: {
    mode: {
      name: '持有方式',
      description:
        '模块级单例：实例常驻模拟的模块作用域，跨挂载复用；每次挂载重建：组件自持实例，卸载即丢弃、挂载即重新 from_pretrained。',
      control: {
        type: 'select',
        labels: MODE_LABELS,
      },
      options: Object.keys(MODE_LABELS),
    },
    remount: {
      name: '模拟卸载并重新挂载',
      description:
        '任意切换一次开关，执行一次「卸载 → 重新挂载」：单例模式第二次挂载约 0 秒（复用单例）；重建模式命中缓存但仍需重新初始化会话（新建实例）。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<LabArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
