import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './forward-inference.ts?raw';
import {
  createForwardInference,
  ID2LABEL,
  type ForwardInferenceInstance,
  type ForwardInferenceSnapshot,
  type InferenceStatus,
} from './forward-inference';

interface InferenceArgs {
  text: string;
}

const STATUS_LABELS: Record<InferenceStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '前向推理中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：就绪时补上模型加载用时，方便对比首次下载与缓存命中的差异 */
function statusText(snapshot: ForwardInferenceSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置五句中英文文本：键是文本值，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'I love transformers!': '英文好评',
  'This movie was a complete waste of time.': '英文差评',
  'The movie was okay, I guess.': '英文中性',
  '这家餐厅服务周到，菜品也很惊艳。': '中文好评',
  '服务态度糟糕，再也不来了。': '中文差评',
};

const renderInteractive = canvasStory({
  create: createForwardInference,
  apply(instance: ForwardInferenceInstance, args: InferenceArgs) {
    instance.update(args);
  },
  readout(snapshot: ForwardInferenceSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      [
        'logits（NEGATIVE, POSITIVE）',
        snapshot.logits == null
          ? '—'
          : snapshot.logits.map((value) => value.toFixed(4)).join(', '),
      ],
      [
        'softmax 概率',
        snapshot.probs == null
          ? '—'
          : snapshot.probs
              .map((prob, index) => `${ID2LABEL[index]} ${(prob * 100).toFixed(2)}%`)
              .join(' / '),
      ],
      ['预测 label', snapshot.label ?? '—'],
    ];
  },
});

const meta = {
  id: 'model-inference',
  title: '核心 API/组件化推理/model 前向推理',
  tags: ['!dev'],
  args: {
    text: 'I love transformers!',
  },
  argTypes: {
    text: {
      name: '示例文本',
      description:
        '预置五句中英文文本；切换后重新编码并前向，观察 logits、softmax 概率与预测 label 的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<InferenceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
