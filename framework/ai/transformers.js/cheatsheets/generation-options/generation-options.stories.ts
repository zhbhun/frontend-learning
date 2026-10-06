import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './generation-params.ts?raw';
import {
  createGenerationParams,
  describeParams,
  type GenerationInstance,
  type GenerationSnapshot,
  type GenerationStatus,
} from './generation-params';

interface GenerationArgs {
  prompt: string;
  maxNewTokens: number;
  doSample: boolean;
  temperature: number;
  topK: number;
  repetitionPenalty: number;
}

const STATUS_LABELS: Record<GenerationStatus, string> = {
  loading: '加载中（首次需下载模型）',
  generating: '生成中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：生成完成后补上用时，让 max_new_tokens 与等待时间的关系可对比 */
function statusText(snapshot: GenerationSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.seconds
    ? `${label}（生成用时 ${snapshot.seconds} 秒）`
    : label;
}

/* 预置三条英文指令：键是提示词文本，值是 Controls 下拉框里显示的短标签。
   小模型对中文支持有限，预置用英文；「开放续写」在贪心长生成下易复读，
   是 repetition_penalty 的演示场景 */
const PRESET_LABELS: Record<string, string> = {
  'What is the capital of France?': '事实问答',
  'Give me three ideas for a weekend project.': '创意列表',
  'Tell me a story about a robot.': '开放续写（易复读）',
};

/* readout 面板宽度有限，生成文本只截取前一段展示；完整输出见画布 */
function cap(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const renderInteractive = canvasStory({
  create: createGenerationParams,
  apply(instance: GenerationInstance, args: GenerationArgs) {
    instance.update(args);
  },
  readout(snapshot: GenerationSnapshot) {
    return [
      ['状态', statusText(snapshot)],
      ['当前参数', describeParams(snapshot.params)],
      ['生成文本', snapshot.output == null ? '—' : cap(snapshot.output)],
    ];
  },
});

const meta = {
  id: 'generation-options',
  title: '核心 API/文本生成/生成参数',
  tags: ['!dev'],
  args: {
    prompt: 'What is the capital of France?',
    maxNewTokens: 48,
    doSample: true,
    temperature: 0.7,
    topK: 50,
    repetitionPenalty: 1,
  },
  argTypes: {
    prompt: {
      name: '提示词',
      description:
        '预置三条英文指令；切换后自动重新生成，观察同一参数下不同任务的输出。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    maxNewTokens: {
      name: 'max_new_tokens',
      description:
        '生成 token 数上限（16~128，默认保守 48）；调大输出更长，「生成用时」读数近似线性变长。',
      control: {
        type: 'range',
        min: 16,
        max: 128,
        step: 8,
      },
    },
    doSample: {
      name: 'do_sample',
      description:
        '采样总开关：关闭即贪心解码（确定性），temperature 与 top_k 暂时不生效。',
      control: {
        type: 'boolean',
      },
    },
    temperature: {
      name: 'temperature',
      description:
        '分布锐度（0.1~1.5）；仅采样时生效，调小输出更稳，调大更发散易跑偏。',
      control: {
        type: 'range',
        min: 0.1,
        max: 1.5,
        step: 0.1,
      },
    },
    topK: {
      name: 'top_k',
      description:
        '每步候选集大小（0~100）；仅采样时生效，1 等价贪心，0 表示不截断（整词表抽签）。',
      control: {
        type: 'range',
        min: 0,
        max: 100,
        step: 1,
      },
    },
    repetitionPenalty: {
      name: 'repetition_penalty',
      description:
        '重复惩罚（1.0~1.5）；对已出现过的 token 打折，调大后复读片段减少，过大文本破碎。',
      control: {
        type: 'range',
        min: 1,
        max: 1.5,
        step: 0.05,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GenerationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
