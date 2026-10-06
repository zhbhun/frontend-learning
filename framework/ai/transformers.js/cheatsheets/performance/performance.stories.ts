import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './inference-benchmark.ts?raw';
import {
  createInferenceBenchmark,
  type BenchInstance,
  type BenchSnapshot,
  type BenchStatus,
} from './inference-benchmark';

interface BenchArgs {
  runs: number;
}

const STATUS_LABELS: Record<BenchStatus, string> = {
  loading: '加载中（首次需下载模型）',
  benchmarking: '基准进行中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：补上轮次，让「首轮含冷启动、后续全为热身」可对照 */
function statusText(snapshot: BenchSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.round > 0 ? `${label}（第 ${snapshot.round} 轮）` : label;
}

/* 耗时读数统一为一位小数的毫秒 */
function ms(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(1)} ms`;
}

const renderInteractive = canvasStory({
  create: createInferenceBenchmark,
  apply(instance: BenchInstance, args: BenchArgs) {
    instance.update(args);
  },
  readout(snapshot: BenchSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['推理输出', snapshot.label == null ? '—' : `${snapshot.label}（${snapshot.score?.toFixed(4)}）`],
      ['首推理（冷启动）', ms(snapshot.firstColdMs)],
      ['本轮中位数（热身）', ms(snapshot.medianMs)],
      ['本轮最快', ms(snapshot.minMs)],
    ];
  },
});

const meta = {
  id: 'performance',
  title: '工程化/性能调优',
  tags: ['!dev'],
  args: {
    runs: 6,
  },
  argTypes: {
    runs: {
      name: '推理次数',
      description:
        '每轮对同一句连续推理的次数（2~12）：第 1 轮的第 1 次是冷启动，单独高亮且不进统计；调整后自动跑新一轮，可观察到本轮不再出现冷启动尖峰。',
      control: {
        type: 'range',
        min: 2,
        max: 12,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<BenchArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
