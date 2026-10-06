import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './cutout-composite.ts?raw';
import {
  COMPOSITE_BACKGROUNDS,
  createCutoutInstance,
  type CutoutInstance,
  type CutoutSnapshot,
  type CutoutStatus,
} from './cutout-composite';

interface CutoutArgs {
  imageUrl: string;
  background: string;
}

const STATUS_LABELS: Record<CutoutStatus, string> = {
  loading: '加载中（库约 1.1 MB + 模型约 25.9 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText(snapshot: CutoutSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置三张官方文档数据集人像图（可跨域访问，已核实存在）：键是图片 URL，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/portrait-of-woman_small.jpg':
    '人像 · 官方文档示例图（360×450）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/woman-with-afro.jpg':
    '人像（640×963）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/young-man-standing-and-leaning-on-car.jpg':
    '人像 + 车（970×1455）',
};

/* 底衬选项与示例实现共用同一份定义（COMPOSITE_BACKGROUNDS），避免两处维护 */
const BACKGROUND_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(COMPOSITE_BACKGROUNDS).map(([key, value]) => [key, value.label]),
);

const renderInteractive = canvasStory({
  create: createCutoutInstance,
  apply(instance: CutoutInstance, args: CutoutArgs) {
    instance.update(args);
  },
  readout(snapshot: CutoutSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['输出尺寸', snapshot.outputSize ?? '—'],
      ['推理用时', snapshot.inferTime ?? '—'],
      ['软边界像素', snapshot.softEdge ?? '—'],
    ];
  },
  captions: ['原图', '抠图（底衬显示透明区域）'],
});

const meta = {
  id: 'background-removal',
  title: '任务实战/视觉任务/背景移除',
  tags: ['!dev'],
  args: {
    imageUrl:
      'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/portrait-of-woman_small.jpg',
    background: 'checker',
  },
  argTypes: {
    imageUrl: {
      name: '示例图片',
      description:
        '预置三张官方文档数据集人像图；切换后重新抠图，观察输出尺寸、推理用时与软边界像素的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    background: {
      name: '合成底衬',
      description:
        '抠图下方先铺的底衬（先画底、再 drawImage 抠图）：棋盘格是图像软件表示透明的通用底衬，纯色用于检查软边界在不同底色上的观感。切换只重绘合成结果，不重新推理。',
      control: {
        type: 'select',
        labels: BACKGROUND_LABELS,
      },
      options: Object.keys(BACKGROUND_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CutoutArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
