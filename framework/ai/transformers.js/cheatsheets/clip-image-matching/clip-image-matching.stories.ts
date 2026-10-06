import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './clip-zero-shot.ts?raw';
import {
  createClipZeroShot,
  type ClipInstance,
  type ClipSnapshot,
  type ClipStatus,
} from './clip-zero-shot';

interface ClipArgs {
  imageUrl: string;
  labelsText: string;
}

const STATUS_LABELS: Record<ClipStatus, string> = {
  loading: '加载中（首次需下载模型 q8 约 154 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText(snapshot: ClipSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置两张官方文档数据集图片（可跨域访问，与 processor 课同一数据集）：键是图片 URL，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg':
    '老虎（408×612）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/corgi.jpg':
    '柯基（410×614）',
};

const renderInteractive = canvasStory({
  create: createClipZeroShot,
  apply(instance: ClipInstance, args: ClipArgs) {
    instance.update(args);
  },
  readout(snapshot: ClipSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['候选标签', snapshot.labelsCount == null ? '—' : `${snapshot.labelsCount} 个`],
      ['top-1 预测', snapshot.top1 ?? '—'],
    ];
  },
});

const meta = {
  id: 'clip-image-matching',
  title: '任务实战/多模态/CLIP 图文匹配',
  tags: ['!dev'],
  args: {
    imageUrl:
      'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg',
    labelsText: 'tiger, horse, dog',
  },
  argTypes: {
    imageUrl: {
      name: '示例图片',
      description:
        '预置两张官方文档数据集图片；保持标签不变切换图片，观察概率分布整体翻转。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    labelsText: {
      name: '候选标签',
      description:
        "逗号分隔的英文标签；管线把每个标签套进模板 'This is a photo of {}' 编码后与图像向量比相似度。默认值与官方文档示例一致（tiger 得分约 0.999）。",
      control: {
        type: 'text',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ClipArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
