import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import supervisedSource from './supervised-classification.ts?raw';
import zeroShotSource from './zero-shot-classification.ts?raw';
import {
  MODELS,
  createSupervisedClassification,
  type ModelKey,
  type SupervisedInstance,
  type SupervisedSnapshot,
  type SupervisedStatus,
} from './supervised-classification';
import {
  createZeroShotClassification,
  type ZeroShotInstance,
  type ZeroShotSnapshot,
  type ZeroShotStatus,
} from './zero-shot-classification';

/* ---------- 实例一：text-classification（top_k 与二分类 / 多分类） ---------- */

interface SupervisedArgs {
  model: string;
  text: string;
  topK: string;
}

const SUPERVISED_STATUS: Record<SupervisedStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

function supervisedStatus(snapshot: SupervisedSnapshot): string {
  const label = SUPERVISED_STATUS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置六句中英文文本：键是文本值，值是 Controls 下拉框里显示的短标签 */
const SUPERVISED_PRESETS: Record<string, string> = {
  'I love transformers!': '英文好评',
  'The movie was okay, I guess.': '英文中性',
  'This movie was a complete waste of time.': '英文差评',
  '这家餐厅服务周到，菜品也很惊艳。': '中文好评',
  '产品功能齐全，但价格偏贵。': '中文中性',
  '服务态度糟糕，再也不来了。': '中文差评',
};

/* top_k 控件的档位：'all' 映射为 null（返回全部标签） */
const TOPK_LABELS: Record<string, string> = {
  '1': '1（只取最高）',
  '2': '2',
  '3': '3（超过类别数会被截断）',
  all: 'null（全部标签）',
};

const MODEL_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(MODELS).map(([key, value]) => [key, value.name]),
);

const renderSupervised = canvasStory({
  create: createSupervisedClassification,
  apply(instance: SupervisedInstance, args: SupervisedArgs) {
    instance.update({
      model: (args.model in MODELS ? args.model : 'sst2') as ModelKey,
      text: args.text,
      topK: args.topK,
    });
  },
  readout(snapshot: SupervisedSnapshot) {
    return [
      ['状态', supervisedStatus(snapshot)],
      ['分类模型', snapshot.modelName],
      ['top_k', snapshot.topK],
      ['结果条数', snapshot.count == null ? '—' : String(snapshot.count)],
      ['分数合计', snapshot.sum == null ? '—' : snapshot.sum.toFixed(4)],
    ];
  },
});

/* ---------- 实例二：zero-shot-classification（标签设计） ---------- */

interface ZeroShotArgs {
  text: string;
  labels: string;
  template: string;
  multiLabel: boolean;
}

const ZERO_SHOT_STATUS: Record<ZeroShotStatus, string> = {
  loading: '加载中（滚入视口后开始下载）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

function zeroShotStatus(snapshot: ZeroShotSnapshot): string {
  const label = ZERO_SHOT_STATUS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.loadSeconds
    ? `${label}（加载用时 ${snapshot.loadSeconds} 秒）`
    : label;
}

/* 预置三句英文文本（示例 NLI 模型仅支持英文） */
const ZERO_SHOT_PRESETS: Record<string, string> = {
  'I have a problem with my iPhone that needs to be resolved asap.': '客服工单',
  'Last week I upgraded my iOS version, and ever since then my phone has been overheating.':
    '系统升级抱怨',
  'The new update completely fixed the battery drain on my phone.': '正面反馈',
};

const renderZeroShot = canvasStory({
  create: createZeroShotClassification,
  apply(instance: ZeroShotInstance, args: ZeroShotArgs) {
    instance.update({
      text: args.text,
      labels: args.labels,
      template: args.template,
      multiLabel: args.multiLabel,
    });
  },
  readout(snapshot: ZeroShotSnapshot) {
    return [
      ['状态', zeroShotStatus(snapshot)],
      ['标签数', String(snapshot.labelCount)],
      [
        'multi_label',
        snapshot.multiLabel ? '开 · 逐标签独立' : '关 · 互斥归一',
      ],
      ['分数合计', snapshot.sum == null ? '—' : snapshot.sum.toFixed(4)],
    ];
  },
});

/* ---------- Storybook 元数据 ---------- */

const meta = {
  id: 'text-classification',
  title: '任务实战/文本任务/文本分类与零样本',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Interactive: StoryObj<Meta<SupervisedArgs>> = {
  args: {
    model: 'sst2',
    text: 'I love transformers!',
    topK: 'all',
  },
  argTypes: {
    model: {
      name: '分类模型',
      description:
        '二分类模型只有 NEGATIVE / POSITIVE 两类；三分类多语模型增加 neutral，且能处理中文。',
      control: {
        type: 'select',
        labels: MODEL_LABELS,
      },
      options: Object.keys(MODELS),
    },
    text: {
      name: '示例文本',
      description: '预置六句中英文文本；切换后重新推理，观察各标签的分数条。',
      control: {
        type: 'select',
        labels: SUPERVISED_PRESETS,
      },
      options: Object.keys(SUPERVISED_PRESETS),
    },
    topK: {
      name: 'top_k',
      description: '返回条数；null 返回全部标签，数值超过类别数会被截断。',
      control: {
        type: 'select',
        labels: TOPK_LABELS,
      },
      options: Object.keys(TOPK_LABELS),
    },
  },
  render: renderSupervised,
  parameters: storySource(supervisedSource),
};

export const ZeroShot: StoryObj<Meta<ZeroShotArgs>> = {
  args: {
    text: 'I have a problem with my iPhone that needs to be resolved asap.',
    labels: 'urgent, not urgent, phone, tablet, computer',
    template: 'This example is {}.',
    multiLabel: false,
  },
  argTypes: {
    text: {
      name: '示例文本',
      description: '预置三句英文文本；示例 NLI 模型仅支持英文。',
      control: {
        type: 'select',
        labels: ZERO_SHOT_PRESETS,
      },
      options: Object.keys(ZERO_SHOT_PRESETS),
    },
    labels: {
      name: 'candidate_labels',
      description:
        '逗号分隔的候选标签；每个标签触发一次句对前向，改标签即改结果。',
      control: {
        type: 'text',
      },
    },
    template: {
      name: 'hypothesis_template',
      description: '假设句模板，{} 会被候选标签替换；默认 This example is {}.',
      control: {
        type: 'text',
      },
    },
    multiLabel: {
      name: 'multi_label',
      description: '开：逐标签独立打分；关：候选间互斥归一（合计为 1）。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderZeroShot,
  parameters: storySource(zeroShotSource),
};
