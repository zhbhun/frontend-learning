import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import qaSource from './qa-pipeline.ts?raw';
import summarizationSource from './summarization-pipeline.ts?raw';
import {
  createQaPipeline,
  type QaInstance,
  type QaSnapshot,
  type QaStatus,
} from './qa-pipeline';
import {
  createSummarizationPipeline,
  type SummarizationInstance,
  type SummarizationSnapshot,
  type SummarizationStatus,
} from './summarization-pipeline';

/* ---------- 实例一：question-answering（question + context → 答案片段） ---------- */

interface QaArgs {
  question: string;
  topK: string;
}

const QA_STATUS: Record<QaStatus, string> = {
  loading: '加载中（首次需下载模型）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 预置三个问题：键是问题文本，值是 Controls 下拉框里显示的短标签；
   答案都是范例短文（写在 qa-pipeline.ts 的 CONTEXT 常量）里的连续片段 */
const QUESTION_LABELS: Record<string, string> = {
  'Where are the models downloaded from?': '模型从哪来',
  'What does the library use to execute the models?': '谁来执行模型',
  'How many times are the models downloaded?': '下载几次',
};

/* top_k 控件的档位：QA 管线唯一的推理选项 */
const TOPK_LABELS: Record<string, string> = {
  '1': '1（单条答案）',
  '3': '3（三条候选）',
};

const renderQa = canvasStory({
  create: createQaPipeline,
  apply(instance: QaInstance, args: QaArgs) {
    instance.update(args);
  },
  readout(snapshot: QaSnapshot) {
    const best = snapshot.candidates?.[0];
    return [
      ['状态', QA_STATUS[snapshot.status]],
      ['question', snapshot.question],
      ['answer', best?.answer ?? '—'],
      ['score', best ? best.score.toFixed(4) : '—'],
    ];
  },
});

/* ---------- 实例二：summarization（文章 → 生成的摘要） ---------- */

interface SummarizationArgs {
  article: string;
  maxNewTokens: number;
}

const SUMMARIZATION_STATUS: Record<SummarizationStatus, string> = {
  loading: '加载中（滚入视口后开始下载）',
  ready: '就绪',
  generating: '生成中',
  error: '出错',
};

function summarizationStatus(snapshot: SummarizationSnapshot): string {
  const label = SUMMARIZATION_STATUS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.seconds
    ? `${label}（生成用时 ${snapshot.seconds} 秒）`
    : label;
}

/* 预置两篇英文短文（t5-small 只擅长英文摘要）；键是文章文本，值是下拉短标签。
   第一篇与官方文档 summarization 示例同文（埃菲尔铁塔），便于对照文档输出 */
const ARTICLE_LABELS: Record<string, string> = {
  'Caching is one of the core techniques for making web applications feel fast. The browser stores copies of static files such as images, stylesheets, and scripts, so repeat visits can skip the network entirely. Service workers push this idea further by letting a web application manage its own cache and keep working offline. A good caching strategy balances freshness against speed: files that rarely change can live in the cache for months, while dynamic responses must be revalidated much more often.':
    '浏览器缓存',
  'The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct.':
    '埃菲尔铁塔（官方文档同文）',
};

/* readout 面板宽度有限，摘要文本只截取前一段展示；完整输出见画布 */
function cap(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const renderSummarization = canvasStory({
  create: createSummarizationPipeline,
  apply(instance: SummarizationInstance, args: SummarizationArgs) {
    instance.update(args);
  },
  readout(snapshot: SummarizationSnapshot) {
    return [
      ['状态', summarizationStatus(snapshot)],
      [
        'summary_text',
        snapshot.summary === null ? '—' : cap(snapshot.summary),
      ],
      ['摘要词数', snapshot.outputWords == null ? '—' : String(snapshot.outputWords)],
    ];
  },
});

/* ---------- Storybook 元数据 ---------- */

const meta = {
  id: 'qa-summarization',
  title: '任务实战/文本任务/问答与摘要',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Interactive: StoryObj<Meta<QaArgs>> = {
  args: {
    question: 'Where are the models downloaded from?',
    topK: '1',
  },
  argTypes: {
    question: {
      name: 'question',
      description:
        '预置三个问题，答案都是同一段短文里的连续片段；切换后重新推理，观察高亮片段与 score 的变化。',
      control: {
        type: 'select',
        labels: QUESTION_LABELS,
      },
      options: Object.keys(QUESTION_LABELS),
    },
    topK: {
      name: 'top_k',
      description:
        '返回候选数；1 时输出单个对象，3 时输出按 score 降序的三条候选。',
      control: {
        type: 'select',
        labels: TOPK_LABELS,
      },
      options: Object.keys(TOPK_LABELS),
    },
  },
  render: renderQa,
  parameters: storySource(qaSource),
};

export const Summarization: StoryObj<Meta<SummarizationArgs>> = {
  args: {
    article: Object.keys(ARTICLE_LABELS)[0],
    maxNewTokens: 64,
  },
  argTypes: {
    article: {
      name: '示例文章',
      description:
        '预置两篇英文短文；切换后自动重新生成，观察摘要文本与词数的变化。',
      control: {
        type: 'select',
        labels: ARTICLE_LABELS,
      },
      options: Object.keys(ARTICLE_LABELS),
    },
    maxNewTokens: {
      name: 'max_new_tokens',
      description:
        '生成 token 数上限（32~128）；调大摘要更长、生成用时近似线性变长，机制的完整讲解见 2.2.1 课。',
      control: {
        type: 'range',
        min: 32,
        max: 128,
        step: 16,
      },
    },
  },
  render: renderSummarization,
  parameters: storySource(summarizationSource),
};
