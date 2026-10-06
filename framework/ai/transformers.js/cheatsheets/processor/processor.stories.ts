import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './image-classify-chain.ts?raw';
import {
  createImageClassifyChain,
  type ChainStatus,
  type ClassifyInstance,
  type ClassifySnapshot,
} from './image-classify-chain';

interface ClassifyArgs {
  imageUrl: string;
  showPreprocessed: boolean;
}

const STATUS_LABELS: Record<ChainStatus, string> = {
  loading: '加载中（库约 1.1 MB + 模型约 6.3 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText(snapshot: ClassifySnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置三张官方文档数据集图片（可跨域访问）：键是图片 URL，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg':
    '老虎（408×612）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/butterfly.jpg':
    '蝴蝶（256×256）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/corgi.jpg':
    '柯基（410×614）',
};

const renderInteractive = canvasStory({
  create: createImageClassifyChain,
  apply(instance: ClassifyInstance, args: ClassifyArgs) {
    instance.update(args);
  },
  readout(snapshot: ClassifySnapshot) {
    return [
      ['状态', statusText(snapshot)],
      [
        'pixel_values',
        snapshot.dims ? `[${snapshot.dims.join(', ')}]` : '—',
      ],
      ['尺寸变化', snapshot.sizeChange ?? '—'],
      ['预处理 / 前向', snapshot.timing ?? '—'],
      ['top-1 预测', snapshot.top1 ?? '—'],
    ];
  },
});

const meta = {
  id: 'processor',
  title: '核心 API/组件化推理/processor 与多模态输入',
  tags: ['!dev'],
  args: {
    imageUrl:
      'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg',
    showPreprocessed: false,
  },
  argTypes: {
    imageUrl: {
      name: '示例图片',
      description:
        '预置三张官方文档数据集图片；切换后重新执行 预处理 → 前向，观察概率条与预测的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    showPreprocessed: {
      name: '显示预处理输入',
      description:
        '开启后画布左侧改为展示 processor 预处理后的 256×256 模型输入（最短边 resize 到 288 再中心裁剪），对照原图理解预处理做了什么。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ClassifyArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
