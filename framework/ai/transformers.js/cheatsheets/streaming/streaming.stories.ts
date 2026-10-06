import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './text-streamer.ts?raw';
import {
  createStreamerDemo,
  type StreamerInstance,
  type StreamerSnapshot,
  type StreamerStatus,
} from './text-streamer';

interface StreamerArgs {
  prompt: string;
  maxNewTokens: number;
  skipPrompt: boolean;
}

const STATUS_LABELS: Record<StreamerStatus, string> = {
  loading: '加载中（首次需下载模型，q8 约 129 MB）',
  ready: '就绪',
  running: '生成中…',
  error: '出错',
};

/* 预置提示词：键是提示词文本，值是 Controls 下拉框里显示的短标签 */
const PROMPT_LABELS: Record<string, string> = {
  'Tell me a joke about JavaScript.': '英文笑话',
  'List three primary colors with one short fact each.': '英文列举（多行）',
  'Write a haiku about the ocean.': '英文俳句',
  '用一句话介绍什么是流式输出。': '中文一句（逐字出现）',
};

const renderInteractive = canvasStory({
  create: createStreamerDemo,
  apply(instance: StreamerInstance, args: StreamerArgs) {
    instance.update(args);
  },
  readout(snapshot: StreamerSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['token 数', snapshot.tokenCount == null ? '—' : String(snapshot.tokenCount)],
      ['片段数', snapshot.pieceCount == null ? '—' : String(snapshot.pieceCount)],
      ['速度', snapshot.speed ?? '—'],
    ];
  },
});

const meta = {
  id: 'streaming',
  title: '核心 API/文本生成/流式输出',
  tags: ['!dev'],
  args: {
    prompt: 'Tell me a joke about JavaScript.',
    maxNewTokens: 48,
    skipPrompt: true,
  },
  argTypes: {
    prompt: {
      name: '提示词',
      description:
        '预置中英文各句；切换后重新生成，观察文本逐段出现与「token 数」「片段数」读数的差异。',
      control: {
        type: 'select',
        labels: PROMPT_LABELS,
      },
      options: Object.keys(PROMPT_LABELS),
    },
    maxNewTokens: {
      name: 'max_new_tokens',
      description:
        '生成 token 数上限（16~128）；模型提前采到 EOS 时会先停，实际 token 数可能更小。',
      control: {
        type: 'range',
        min: 16,
        max: 128,
        step: 16,
      },
    },
    skipPrompt: {
      name: 'skip_prompt',
      description:
        '对应 skip_prompt：开启时提示不进流；关闭后生成前先把渲染后的完整提示（含模板自动注入的 system 段）整段回显。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<StreamerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
