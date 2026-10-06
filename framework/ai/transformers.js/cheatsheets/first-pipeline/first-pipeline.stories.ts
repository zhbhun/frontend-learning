import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './sentiment-pipeline.ts?raw';
import {
  createSentimentPipeline,
  type PipelineStatus,
  type SentimentPipelineInstance,
  type SentimentPipelineSnapshot,
} from './sentiment-pipeline';

interface SentimentArgs {
  text: string;
}

const STATUS_LABELS: Record<PipelineStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 预置三句中英文文本：键是文本值，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'I love transformers!': '英文好评',
  'This movie was a complete waste of time.': '英文差评',
  '这家餐厅服务周到，菜品也很惊艳。': '中文好评',
};

const renderInteractive = canvasStory({
  create: createSentimentPipeline,
  apply(instance: SentimentPipelineInstance, args: SentimentArgs) {
    instance.update(args);
  },
  readout(snapshot: SentimentPipelineSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['输入文本', snapshot.text],
      ['label', snapshot.label ?? '—'],
      ['score', snapshot.score == null ? '—' : snapshot.score.toFixed(4)],
    ];
  },
});

const meta = {
  id: 'first-pipeline',
  title: '上手/第一个 pipeline',
  tags: ['!dev'],
  args: {
    text: 'I love transformers!',
  },
  argTypes: {
    text: {
      name: '示例文本',
      description: '预置三句中英文文本；切换后重新推理，观察 label 与 score 的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SentimentArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
