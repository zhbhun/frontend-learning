import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import clientSource from './sentiment-worker-client.ts?raw';
import workerSource from './sentiment-worker.ts?raw';
import {
  createWorkerDemo,
  type LoadStatus,
  type WorkerDemoInstance,
  type WorkerDemoSnapshot,
  type WorkerTarget,
} from './sentiment-worker-client';

/* Show code：本课的输入 → 输出链横跨主线程与 worker 两个文件，
   这里按线程顺序组合同一路 ?raw 真源投影，不手工维护第二份副本 */
const exampleSource = [
  '// ═══════ sentiment-worker-client.ts（主线程侧）═══════',
  clientSource.trimEnd(),
  '',
  '// ═══════ sentiment-worker.ts（Web Worker 线程侧）═══════',
  workerSource.trimEnd(),
].join('\n');

interface DemoArgs {
  text: string;
  target: WorkerTarget;
}

const STATUS_LABELS: Record<LoadStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：补上所属线程与加载进度 / 用时 */
function statusText(snapshot: WorkerDemoSnapshot): string {
  const where = snapshot.target === 'worker' ? 'Web Worker' : '主线程';
  const label = STATUS_LABELS[snapshot.status];
  const suffix =
    snapshot.status === 'ready' && snapshot.loadSeconds != null
      ? `（加载用时 ${snapshot.loadSeconds.toFixed(1)} 秒）`
      : snapshot.status === 'loading'
        ? `（${Math.round(snapshot.progress)}%）`
        : '';
  return `${label} · ${where}${suffix}`;
}

/* 预置五句中英文文本：键是文本值，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'I love transformers!': '英文好评',
  'This movie was a complete waste of time.': '英文差评',
  'The movie was okay, I guess.': '英文中性',
  '这家餐厅服务周到，菜品也很惊艳。': '中文好评',
  '服务态度糟糕，再也不来了。': '中文差评',
};

/* 推理位置控件：同一模型在两条线程上对比 */
const TARGET_LABELS: Record<string, string> = {
  worker: 'Web Worker（推荐）',
  main: '主线程（对照）',
};

const renderInteractive = canvasStory({
  create: createWorkerDemo,
  apply(instance: WorkerDemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: WorkerDemoSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['label', snapshot.label ?? '—'],
      ['score', snapshot.score == null ? '—' : snapshot.score.toFixed(4)],
      ['推理用时', snapshot.inferMs == null ? '—' : `${snapshot.inferMs} ms`],
      ['帧率（最近 1 秒）', `${snapshot.fps} fps`],
      ['最大帧间隔（自上次推理开始）', `${Math.round(snapshot.maxGapMs)} ms`],
    ];
  },
});

const meta = {
  id: 'web-worker',
  title: '工程化/Web Worker 加载',
  tags: ['!dev'],
  args: {
    text: 'I love transformers!',
    target: 'worker',
  },
  argTypes: {
    text: {
      name: '示例文本',
      description: '预置五句中英文文本；切换后向当前推理位置发起一次推理。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    target: {
      name: '推理位置',
      description:
        '同一模型在两条线程上对比：主线程推理期间帧时间线出现空洞、最大帧间隔飙高；Web Worker 模式下主线程保持满帧。',
      control: {
        type: 'select',
        labels: TARGET_LABELS,
      },
      options: Object.keys(TARGET_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
