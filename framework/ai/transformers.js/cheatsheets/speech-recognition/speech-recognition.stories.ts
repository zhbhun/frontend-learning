import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './speech-recognition-pipeline.ts?raw';
import {
  createSpeechRecognition,
  type AsrInstance,
  type AsrSnapshot,
  type AsrStatus,
} from './speech-recognition-pipeline';

interface AsrArgs {
  audioUrl: string;
  task: string;
  language: string;
  returnTimestamps: boolean;
  chunked: boolean;
}

const STATUS_LABELS: Record<AsrStatus, string> = {
  loading: '加载中（首次需下载音频与模型）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 预置三段官方文档示例音频（允许跨域）：键是音频 URL，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav':
    '英文演讲 jfk.wav（1.9 MB）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/french-audio.mp3':
    '法语短句 french-audio.mp3（100 KB）',
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/ted_60.wav':
    '英文长音频 ted_60.wav（60 秒 · 11.5 MB）',
};

/* task 的两个取值：transcribe 转写为原语言；translate 固定译成英语（仅多语模型可用） */
const TASK_LABELS: Record<string, string> = {
  transcribe: 'transcribe（转写为原文）',
  translate: 'translate（译成英语）',
};

/* language 传给 Whisper 的源语言提示；'' 表示不指定（v4.3.0 无自动检测，默认按英语处理） */
const LANGUAGE_LABELS: Record<string, string> = {
  '': '不指定（默认）',
  english: 'english（英语）',
  french: 'french（法语）',
  chinese: 'chinese（中文）',
};

const renderInteractive = canvasStory({
  create: createSpeechRecognition,
  apply(instance: AsrInstance, args: AsrArgs) {
    instance.update(args);
  },
  readout(snapshot: AsrSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['模型', snapshot.modelId ?? '—'],
      ['音频', snapshot.audioInfo ?? '—'],
      ['推理耗时', snapshot.elapsed ?? '—'],
      ['时间戳', snapshot.chunkInfo ?? '—'],
    ];
  },
});

const meta = {
  id: 'speech-recognition',
  title: '任务实战/音频任务/语音识别',
  tags: ['!dev'],
  args: {
    audioUrl:
      'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav',
    task: 'transcribe',
    language: '',
    returnTimestamps: false,
    chunked: false,
  },
  argTypes: {
    audioUrl: {
      name: '示例音频',
      description:
        '预置三段官方文档音频（允许跨域访问）。切换后重新 load_audio 并推理：画布绘制模型实际吃到的 16 kHz 单声道波形，读数「音频」给出采样数与时长。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    task: {
      name: '任务',
      description:
        'transcribe 转写为原语言；translate 译成英语。两者只在多语模型上可用——选 translate（或指定语言）时实例自动从 whisper-tiny.en 换成 whisper-tiny，首次多下载约 41 MB。',
      control: {
        type: 'select',
        labels: TASK_LABELS,
      },
      options: Object.keys(TASK_LABELS),
    },
    language: {
      name: '语言',
      description:
        'Whisper 的源语言提示（仅多语模型）。v4.3.0 没有自动语言检测：不指定时库默认按英语处理并在控制台警告——转写法语等非英语音频请显式选择。',
      control: {
        type: 'select',
        labels: LANGUAGE_LABELS,
      },
      options: Object.keys(LANGUAGE_LABELS),
    },
    returnTimestamps: {
      name: '返回时间戳',
      description:
        '开启后输出多出 chunks 段级时间戳（{ timestamp: [起, 止], text }），画布波形下方显示分段条；对照「时间戳」读数中的段数。',
      control: {
        type: 'boolean',
      },
    },
    chunked: {
      name: '长音频分段',
      description:
        '开启后按 chunk_length_s=30、stride_length_s=5 滑窗分段（官方示例取值）。关闭时超过 30 秒的音频只转前 30 秒且不报错——在 ted_60.wav 上对比两种结果。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AsrArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
