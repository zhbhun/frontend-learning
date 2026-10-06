import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './ner-pipeline.ts?raw';
import {
  createNerPipeline,
  type AggregationStrategy,
  type NerInstance,
  type NerSnapshot,
  type NerStatus,
} from './ner-pipeline';

interface NerArgs {
  text: string;
  aggregationStrategy: AggregationStrategy;
}

const STATUS_LABELS: Record<NerStatus, string> = {
  loading: '加载中（首次需下载 q8 模型约 170 MB）',
  running: '推理中',
  ready: '就绪',
  error: '出错',
};

/* 预置中英文文本：键是文本值，值是 Controls 下拉框里显示的短标签 */
const PRESET_LABELS: Record<string, string> = {
  'My name is Sarah and I live in London': '英文 · 官方文档示例',
  'Sarah lives in the United States of America': '英文 · 多词实体',
  '张伟住在北京，周末常去上海出差。': '中文 · 人名与地名',
};

const STRATEGY_LABELS: Record<string, string> = {
  simple: 'simple（聚合成实体）',
  none: 'none（原始 token 输出）',
};

/* readout 面板宽度有限，长 word 截断展示；完整清单见画布图例与高亮 */
function cap(value: string, max = 28): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const renderInteractive = canvasStory({
  create: createNerPipeline,
  apply(instance: NerInstance, args: NerArgs) {
    instance.update(args);
  },
  readout(snapshot: NerSnapshot) {
    const entries: Array<[string, unknown]> = [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['aggregation_strategy', snapshot.aggregationStrategy],
      ['输出条数', snapshot.items.length > 0 ? snapshot.items.length : '—'],
    ];
    // 实体清单读数：none 模式给 entity（BIO 标签），simple 模式给 entity_group
    snapshot.items.slice(0, 4).forEach((item, index) => {
      const label = 'entity_group' in item ? item.entity_group : item.entity;
      entries.push([
        `#${index + 1} · ${label}`,
        `${cap(item.word)} · ${item.score.toFixed(3)}`,
      ]);
    });
    if (snapshot.items.length > 4) {
      entries.push(['…', `其余 ${snapshot.items.length - 4} 条见画布`]);
    }
    return entries;
  },
});

const meta = {
  id: 'token-classification',
  title: '任务实战/文本任务/token 分类',
  tags: ['!dev'],
  args: {
    text: 'My name is Sarah and I live in London',
    aggregationStrategy: 'simple',
  },
  argTypes: {
    text: {
      name: '示例文本',
      description:
        '预置中英文各句；切换后重新推理，观察画布高亮与实体清单的变化。',
      control: {
        type: 'select',
        labels: PRESET_LABELS,
      },
      options: Object.keys(PRESET_LABELS),
    },
    aggregationStrategy: {
      name: 'aggregation_strategy',
      description:
        '输出粒度：simple 把相邻同组 token 聚成实体（entity_group）；none 输出每个 token 的 BIO 标签与 ## 子词碎片。v4.3.0 只支持这两档，其余取值会抛错。',
      control: {
        type: 'select',
        labels: STRATEGY_LABELS,
      },
      options: ['simple', 'none'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<NerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
