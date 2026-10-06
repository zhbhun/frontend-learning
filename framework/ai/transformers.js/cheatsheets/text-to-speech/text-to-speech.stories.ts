import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './tts-pipeline.ts?raw';
import {
  createTtsPipeline,
  type TtsInstance,
  type TtsSnapshot,
  type TtsStatus,
} from './tts-pipeline';

interface TtsArgs {
  text: string;
}

const STATUS_LABELS: Record<TtsStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '合成中',
  ready: '就绪',
  error: '出错',
};

/* 预置三条英文文本：键是文本值，值是 Controls 下拉框里显示的短标签（该模型族暂无中文模型） */
const PRESET_LABELS: Record<string, string> = {
  'Hello, my dog is cute.': '英文短句',
  'I love transformers.js!': '英文感叹句',
  'The quick brown fox jumps over the lazy dog.': '英文长句',
};

const renderInteractive = canvasStory({
  create: createTtsPipeline,
  apply(instance: TtsInstance, args: TtsArgs) {
    instance.update(args);
  },
  readout(snapshot: TtsSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['sampling_rate', snapshot.samplingRate ?? '—'],
      [
        '时长',
        snapshot.durationSeconds ? `${snapshot.durationSeconds} 秒` : '—',
      ],
      [
        '推理用时',
        snapshot.inferSeconds ? `${snapshot.inferSeconds} 秒` : '—',
      ],
    ];
  },
});

const meta = {
  id: 'text-to-speech',
  title: '任务实战/音频任务/语音合成',
  tags: ['!dev'],
  args: {
    text: 'Hello, my dog is cute.',
  },
  argTypes: {
    text: {
      name: '示例文本',
      description: '预置三条英文文本；切换后重新合成，观察波形、时长与推理用时的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TtsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
