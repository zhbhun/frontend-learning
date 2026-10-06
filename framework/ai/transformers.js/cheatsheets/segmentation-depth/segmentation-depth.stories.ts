import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import segmentationSource from './segmentation-overlay.ts?raw';
import depthSource from './depth-map-render.ts?raw';
import samSource from './sam-prompt-mask.ts?raw';
import {
  createSegmentationOverlay,
  type OverlayInstance,
  type OverlaySnapshot,
  type OverlayStatus,
} from './segmentation-overlay';
import {
  createDepthMapRender,
  type DepthInstance,
  type DepthSnapshot,
  type DepthStatus,
} from './depth-map-render';
import {
  createSamPromptMask,
  type PromptInstance,
  type PromptSnapshot,
  type PromptStatus,
} from './sam-prompt-mask';

/* ---------- 共享：预置图片 ---------- */

/* 预置两张官方文档数据集图片（可跨域访问，与兄弟课程共用同一组 URL）：
   键是图片 URL，值是 Controls 下拉框里显示的短标签 */
const IMAGE_LABELS: Record<string, string> = {
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg':
    '猫咪 + 遥控器（室内多目标）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg':
    '老虎（动物特写）',
};

const imageArgType = (extra: string) => ({
  name: '示例图片',
  description: `预置两张官方文档数据集图片，切换后重新推理。${extra}`,
  control: {
    type: 'select' as const,
    labels: IMAGE_LABELS,
  },
  options: Object.keys(IMAGE_LABELS),
});

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText<T extends { status: string; loadSeconds: string | null }>(
  snapshot: T,
  labels: Record<string, string>,
): string {
  const label = labels[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* ---------- 实例一：image-segmentation（每个类别一张 mask，叠加渲染） ---------- */

interface OverlayArgs {
  imageUrl: string;
  maskOpacity: number;
}

const OVERLAY_STATUS: Record<OverlayStatus, string> = {
  loading: '加载中（库约 1.1 MB + 模型约 4.4 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

const renderOverlay = canvasStory({
  create: createSegmentationOverlay,
  apply(instance: OverlayInstance, args: OverlayArgs) {
    instance.update(args);
  },
  readout(snapshot: OverlaySnapshot) {
    return [
      ['状态', statusText(snapshot, OVERLAY_STATUS)],
      [
        '输出条数',
        snapshot.labelCount == null ? '—' : `${snapshot.labelCount} 个类别`,
      ],
      ['覆盖最高类别', snapshot.top1 ?? '—'],
      ['mask 尺寸', snapshot.maskSize ?? '—'],
      ['推理用时', snapshot.timing ?? '—'],
    ];
  },
});

/* ---------- 实例二：depth-estimation（predicted_depth + 深度灰度图） ---------- */

interface DepthArgs {
  imageUrl: string;
  invertDepth: boolean;
}

const DEPTH_STATUS: Record<DepthStatus, string> = {
  loading: '加载中（滚入视口后开始下载，约 27 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

const renderDepth = canvasStory({
  create: createDepthMapRender,
  apply(instance: DepthInstance, args: DepthArgs) {
    instance.update(args);
  },
  readout(snapshot: DepthSnapshot) {
    return [
      ['状态', statusText(snapshot, DEPTH_STATUS)],
      ['predicted_depth', snapshot.dimsText ?? '—'],
      ['depth', snapshot.depthText ?? '—'],
      ['推理用时', snapshot.timing ?? '—'],
    ];
  },
});

/* ---------- 实例三：SAM 提示分割（组件化三步，画布点击选点） ---------- */

interface PromptArgs {
  imageUrl: string;
}

const PROMPT_STATUS: Record<PromptStatus, string> = {
  loading: '加载中（滚入视口后开始下载，约 13.8 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

const renderPrompt = canvasStory({
  create: createSamPromptMask,
  apply(instance: PromptInstance, args: PromptArgs) {
    instance.update(args);
  },
  readout(snapshot: PromptSnapshot) {
    return [
      ['状态', statusText(snapshot, PROMPT_STATUS)],
      ['提示点', snapshot.clickPoint ?? '—'],
      ['iou_scores', snapshot.iouScores ?? '—'],
      ['选中候选', snapshot.selectedMask ?? '—'],
    ];
  },
});

/* ---------- Storybook 元数据 ---------- */

const meta = {
  id: 'segmentation-depth',
  title: '任务实战/视觉任务/分割与深度估计',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Interactive: StoryObj<Meta<OverlayArgs>> = {
  args: {
    imageUrl: Object.keys(IMAGE_LABELS)[0],
    maskOpacity: 45,
  },
  argTypes: {
    imageUrl: imageArgType('观察不同场景下出现了哪些类别。'),
    maskOpacity: {
      name: 'mask 不透明度',
      description:
        '叠加层的整体透明度（0–100）：拖到 0 只剩原图，拖到 100 掩码色块最实。只影响渲染，不重新推理。',
      control: {
        type: 'range',
        min: 0,
        max: 100,
        step: 5,
      },
    },
  },
  render: renderOverlay,
  parameters: storySource(segmentationSource),
};

export const DepthMap: StoryObj<Meta<DepthArgs>> = {
  args: {
    imageUrl: Object.keys(IMAGE_LABELS)[0],
    invertDepth: false,
  },
  argTypes: {
    imageUrl: imageArgType('观察不同场景的深度结构。'),
    invertDepth: {
      name: '明暗反转',
      description:
        '把深度灰度整体取反（255 − v）：对照「灰度只编码相对远近」，明暗方向是模型输出的约定，不是管线的标准。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderDepth,
  parameters: storySource(depthSource),
};

export const SamPrompt: StoryObj<Meta<PromptArgs>> = {
  args: {
    imageUrl: Object.keys(IMAGE_LABELS)[0],
  },
  argTypes: {
    imageUrl: imageArgType('切换后重新读图并计算图像嵌入，已选的提示点清空。'),
  },
  render: renderPrompt,
  parameters: storySource(samSource),
};
