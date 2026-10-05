import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import samplingDemoSource from './sampling-demo.ts?raw';
import tokenLoopSource from './token-loop-demo.ts?raw';
import {
  createSamplingDemo,
  SAMPLING_STRATEGY_LABELS,
  type SamplingInstance,
  type SamplingSnapshot,
  type SamplingStrategy,
} from './sampling-demo';
import {
  createTokenLoop,
  TOKEN_LOOP_ACTION_LABELS,
  type TokenLoopAction,
  type TokenLoopInstance,
  type TokenLoopSnapshot,
} from './token-loop-demo';

interface TokenLoopArgs {
  action: TokenLoopAction;
}

interface SamplingArgs {
  strategy: SamplingStrategy;
  temperature: number;
  topK: number;
  topP: number;
}

const renderTokenLoop = canvasStory({
  create: createTokenLoop,
  apply(instance: TokenLoopInstance, args: TokenLoopArgs) {
    instance.update({ action: args.action });
  },
  readout(snapshot: TokenLoopSnapshot) {
    return [
      ['阶段', snapshot.stage],
      ['input_ids', snapshot.inputIds],
      ['attention_mask', snapshot.attentionMask],
      ['position_ids', snapshot.positionIds],
      ['KV 缓存 seq_len', snapshot.kvCache],
      ['最新选中 token', snapshot.lastToken],
      ['输出文本', snapshot.outputText],
    ];
  },
  captions: [
    '左：每轮 run 的 feeds（形状与位置编码）',
    '右：KV 缓存逐 token 生长，present 改名回喂',
  ],
});

const renderSampling = canvasStory({
  create: createSamplingDemo,
  apply(instance: SamplingInstance, args: SamplingArgs) {
    instance.update(args);
  },
  readout(snapshot: SamplingSnapshot) {
    return [
      ['策略', snapshot.strategy],
      ['参数', snapshot.parameters],
      ['选中下一个 token', snapshot.chosen],
      ['候选分布（温度缩放后）', snapshot.distribution],
    ];
  },
  captions: [
    '点击画布：重新抽样（greedy 恒定不变）',
    '灰条 = 被策略截断的候选',
  ],
});

// 用类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级元数据。
const meta: Meta = {
  id: 'llm-in-browser',
  title: '实战应用/浏览器跑大模型',
  tags: ['!dev'],
};

export default meta;

type TokenLoopStory = StoryObj<TokenLoopArgs>;
type SamplingStory = StoryObj<SamplingArgs>;

export const TokenLoop: TokenLoopStory = {
  name: '生成循环',
  args: {
    action: 'prefill',
  },
  argTypes: {
    action: {
      name: '循环操作',
      description: '预填 / 单步 decode / 自动生成 / 重置；点击画布执行一步。',
      control: {
        type: 'radio',
        options: ['reset', 'prefill', 'step', 'auto'],
        labels: TOKEN_LOOP_ACTION_LABELS,
      },
    },
  },
  render: renderTokenLoop,
  parameters: storySource(tokenLoopSource),
};

export const Sampling: SamplingStory = {
  name: '采样策略',
  args: {
    strategy: 'greedy',
    temperature: 0.8,
    topK: 2,
    topP: 0.9,
  },
  argTypes: {
    strategy: {
      name: '采样策略',
      description: 'greedy 是官方 chat 示例的基线；其余策略改变候选分布与选中结果。',
      control: {
        type: 'radio',
        options: ['greedy', 'temperature', 'top-k', 'top-p'],
        labels: SAMPLING_STRATEGY_LABELS,
      },
    },
    temperature: {
      name: 'temperature',
      description: 'logits ÷ T 后 softmax：T 越小分布越尖，越大越平。',
      control: {
        type: 'range',
        min: 0.2,
        max: 2,
        step: 0.1,
      },
    },
    topK: {
      name: 'top-k',
      description: '只在分数前 k 名内抽样。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
    topP: {
      name: 'top-p',
      description: '取累计概率达到 p 的最小候选集，集内抽样。',
      control: {
        type: 'range',
        min: 0.1,
        max: 1,
        step: 0.05,
      },
    },
  },
  render: renderSampling,
  parameters: storySource(samplingDemoSource),
};
