import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './tokenizer-encoding.ts?raw';
import {
  createTokenizerEncoding,
  type EncodingInstance,
  type EncodingSnapshot,
  type TokenizerStatus,
} from './tokenizer-encoding';

interface TokenizerArgs {
  text: string;
  addSpecialTokens: boolean;
  truncation: boolean;
  maxLength: number;
}

const STATUS_LABELS: Record<TokenizerStatus, string> = {
  loading: '加载中（库约 1.1 MB + tokenizer 约 0.7 MB）',
  ready: '就绪',
  error: '出错',
};

/* 预置中英文文本：键是文本值，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'I love transformers!': '英文短句',
  'This movie was a complete waste of time.': '英文影评',
  '这家餐厅服务周到，菜品也很惊艳。': '中文句子（大量 [UNK]）',
  'Transformers.js runs pre-trained models directly in your browser, so your text never leaves the machine.':
    '英文长句（演示截断）',
};

const LONG_TEXT =
  'Transformers.js runs pre-trained models directly in your browser, so your text never leaves the machine.';

/* readout 面板宽度有限，长列表只截取前一段展示；完整值见画布 token 块 */
function cap(value: string, max = 46): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const renderInteractive = canvasStory({
  create: createTokenizerEncoding,
  apply(instance: EncodingInstance, args: TokenizerArgs) {
    instance.update(args);
  },
  readout(snapshot: EncodingSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['token 数', snapshot.count == null ? '—' : String(snapshot.count)],
      ['tokens', snapshot.tokens ? cap(snapshot.tokens.join(' ')) : '—'],
      ['input_ids', snapshot.ids ? cap(snapshot.ids.join(', ')) : '—'],
      ['attention_mask', snapshot.mask ? cap(snapshot.mask.join('')) : '—'],
      ['解码文本', snapshot.decoded ? cap(snapshot.decoded) : '—'],
    ];
  },
});

const meta = {
  id: 'tokenizer',
  title: '核心 API/组件化推理/tokenizer',
  tags: ['!dev'],
  args: {
    text: LONG_TEXT,
    addSpecialTokens: true,
    truncation: false,
    maxLength: 8,
  },
  argTypes: {
    text: {
      name: '示例文本',
      description:
        '预置中英文各句；切换后立即重新编码，观察 tokens、input_ids 与 attention_mask 的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    addSpecialTokens: {
      name: '特殊 token',
      description:
        '对应 add_special_tokens：关闭后不再自动加 [CLS] / [SEP]，token 数随之减少。',
      control: {
        type: 'boolean',
      },
    },
    truncation: {
      name: '截断',
      description:
        '对应 truncation: true：超过 max_length 时砍掉序列尾部，结尾 [SEP] 一起消失。',
      control: {
        type: 'boolean',
      },
    },
    maxLength: {
      name: 'max_length',
      description:
        '截断目标长度（4~20 个 token）；仅在「截断」开启后生效，本模型的实际上限是 512。',
      control: {
        type: 'range',
        min: 4,
        max: 20,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TokenizerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
