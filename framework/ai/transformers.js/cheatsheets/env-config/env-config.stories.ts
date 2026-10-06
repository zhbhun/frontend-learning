import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './env-config-lab.ts?raw';
import {
  createEnvLab,
  type EnvLabInstance,
  type EnvLabSnapshot,
  type LabStatus,
  type LogLevelName,
} from './env-config-lab';

interface EnvLabArgs {
  useBrowserCache: boolean;
  allowLocalModels: boolean;
  reload: boolean;
  logLevel: LogLevelName;
}

const STATUS_LABELS: Record<LabStatus, string> = {
  loading: '加载中（首次需下载分词器文件）',
  ready: '就绪',
  error: '出错',
};

/* LogLevel 全集的下拉标签：取值与顺序与正文枚举表一致 */
const LOGLEVEL_LABELS: Record<LogLevelName, string> = {
  DEBUG: 'DEBUG（10 · 全部输出）',
  INFO: 'INFO（20 · 含 info）',
  WARNING: 'WARNING（30 · 默认）',
  ERROR: 'ERROR（40 · 仅 error）',
  NONE: 'NONE（50 · 静音）',
};

/* readout 面板宽度有限，超长警告文本截断展示；完整行见画布 ① 区 */
function cap(value: string, max = 58): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const renderInteractive = canvasStory({
  create: createEnvLab,
  apply(instance: EnvLabInstance, args: EnvLabArgs) {
    instance.update(args);
  },
  readout(snapshot: EnvLabSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      [
        'env.fetch 调用',
        snapshot.status === 'ready' && snapshot.fetchCount === 0
          ? '0 次（全部命中缓存）'
          : `${snapshot.fetchCount} 次`,
      ],
      ['最近请求', snapshot.lastFetch ?? '—'],
      ['当前 logLevel', snapshot.logLevelText],
      ['捕获日志行', `${snapshot.captureCount} 行`],
      ['首行', snapshot.captureFirst ? cap(snapshot.captureFirst) : '—'],
    ];
  },
});

const meta = {
  id: 'env-config',
  title: '核心 API/运行配置/env 配置',
  tags: ['!dev'],
  args: {
    useBrowserCache: true,
    allowLocalModels: false,
    reload: false,
    logLevel: 'WARNING',
  } as EnvLabArgs,
  argTypes: {
    useBrowserCache: {
      name: '浏览器缓存',
      description:
        '对应 env.useBrowserCache：关闭后重新加载，每次都走网络；开启时命中 transformers-cache 则 env.fetch 根本不被调用。',
      control: {
        type: 'boolean',
      },
    },
    allowLocalModels: {
      name: '本地模型',
      description:
        '对应 env.allowLocalModels：浏览器默认 false、Node 默认 true。开启后（缓存未命中时）每个文件先探测一次 /models/ 本地路径。',
      control: {
        type: 'boolean',
      },
    },
    reload: {
      name: '重新加载',
      description:
        '切换开关，用当前 env 设置重新跑一次 AutoTokenizer.from_pretrained：请求清单与计数随之重置。',
      control: {
        type: 'boolean',
      },
    },
    logLevel: {
      name: '日志级别',
      description:
        '对应 env.logLevel：切换后立即重放一次会触发警告的调用（max_length 不带 truncation），观察捕获到的日志行。',
      control: {
        type: 'select',
        labels: LOGLEVEL_LABELS,
      },
      options: Object.keys(LOGLEVEL_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EnvLabArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
