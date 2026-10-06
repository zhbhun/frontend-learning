import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './similarity-matrix.ts?raw';
import {
  PRESETS,
  createSimilarityMatrix,
  type MatrixStatus,
  type PoolingMode,
  type SimilarityMatrixInstance,
  type SimilarityMatrixSnapshot,
} from './similarity-matrix';

interface MatrixArgs {
  preset: string;
  pooling: PoolingMode;
}

const STATUS_LABELS: Record<MatrixStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '编码中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText(snapshot: SimilarityMatrixSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* pooling 三个档位的控件标签 */
const POOLING_LABELS: Record<PoolingMode, string> = {
  mean: 'mean（均值池化 · 句向量）',
  cls: 'cls（取 [CLS] 位）',
  none: 'none（不聚合 · 词级向量）',
};

const renderInteractive = canvasStory({
  create: createSimilarityMatrix,
  apply(instance: SimilarityMatrixInstance, args: MatrixArgs) {
    instance.update({
      sentences: PRESETS[args.preset]?.sentences ?? PRESETS.coffee.sentences,
      pooling: args.pooling,
    });
  },
  readout(snapshot: SimilarityMatrixSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['pooling', `'${snapshot.pooling}'`],
      ['输出维度', snapshot.dimsText ?? '—'],
      ['最相似句对', snapshot.bestPair ?? '—'],
    ];
  },
});

const meta = {
  id: 'embeddings',
  title: '任务实战/文本任务/embedding',
  tags: ['!dev'],
  args: {
    preset: 'coffee',
    pooling: 'mean',
  },
  argTypes: {
    preset: {
      name: '句子组',
      description:
        '每组 5 句英文：同主题 3 句 + 无关 2 句；切换后重新编码并重画矩阵。',
      control: {
        type: 'select',
        labels: Object.fromEntries(
          Object.entries(PRESETS).map(([key, value]) => [key, value.label]),
        ),
      },
      options: Object.keys(PRESETS),
    },
    pooling: {
      name: 'pooling',
      description:
        "mean 把词级向量平均成句向量；cls 取 [CLS] 位的原始隐藏状态；none 不聚合，输出保持词级 [n, seq, 384]。",
      control: {
        type: 'select',
        labels: POOLING_LABELS,
      },
      options: Object.keys(POOLING_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MatrixArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
