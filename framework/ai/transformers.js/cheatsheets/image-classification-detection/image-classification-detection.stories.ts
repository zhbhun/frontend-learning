import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './classify-vs-detect.ts?raw';
import {
  THRESHOLD_MIN,
  createCompareInstance,
  type CompareInstance,
  type CompareSnapshot,
  type CompareStatus,
} from './classify-vs-detect';

interface CompareArgs {
  imageUrl: string;
  threshold: number;
}

const STATUS_LABELS: Record<CompareStatus, string> = {
  loading: '加载中（首次需下载两模型，合计约 16 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText(snapshot: CompareSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置三张官方文档数据集图片（可跨域访问）：键是图片 URL，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg':
    '猫咪 + 遥控器（COCO 多目标）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg':
    '老虎（ImageNet 命中，COCO 无此类）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/corgi.jpg':
    '柯基犬（分类细，检测粗）',
};

const renderInteractive = canvasStory({
  create: createCompareInstance,
  apply(instance: CompareInstance, args: CompareArgs) {
    instance.update(args);
  },
  readout(snapshot: CompareSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['分类 top-1', snapshot.top1 ?? '—'],
      [
        '检测框数',
        snapshot.detectionCount == null
          ? '—'
          : `${snapshot.detectionCount}（score ≥ ${snapshot.threshold.toFixed(2)}）`,
      ],
      ['首个 box', snapshot.firstBox ?? '—'],
    ];
  },
});

const meta = {
  id: 'image-classification-detection',
  title: '任务实战/视觉任务/图像分类与目标检测',
  tags: ['!dev'],
  args: {
    imageUrl:
      'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg',
    threshold: 0.9,
  },
  argTypes: {
    imageUrl: {
      name: '示例图片',
      description:
        '预置三张官方文档数据集图片；切换后两个任务重新推理，观察分数条与边界框的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    threshold: {
      name: '检测阈值',
      description:
        'object-detection 的 threshold（默认 0.9）：保留 score ≥ 阈值的框，拖高框减少、拖低框变多。',
      control: {
        type: 'range',
        min: THRESHOLD_MIN,
        max: 0.95,
        step: 0.05,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CompareArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
