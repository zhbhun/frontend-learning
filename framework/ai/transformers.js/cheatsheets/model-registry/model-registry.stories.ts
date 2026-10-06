import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './model-registry-check.ts?raw';
import {
  createModelRegistryCheck,
  type CheckStatus,
  type DtypeChoice,
  type ModelPreset,
  type ModelRegistryInstance,
  type ModelRegistrySnapshot,
} from './model-registry-check';

interface RegistryArgs {
  model: ModelPreset;
  dtype: DtypeChoice;
}

const STATUS_LABELS: Record<CheckStatus, string> = {
  loading: '检查中…',
  ready: '就绪',
  error: '出错',
};

/* 模型预设的下拉标签：distilbert 是 1.2 课用过的模型，缓存检查应读到真实命中 */
const MODEL_LABELS: Record<ModelPreset, string> = {
  distilbert: 'distilbert 情感分类（1.2 课已用）',
  minilm: 'MiniLM 句向量（未用过）',
};

/* dtype 档位的下拉标签：q2 两个预设仓库都未导出，用于观察「未提供」 */
const DTYPE_LABELS: Record<DtypeChoice, string> = {
  fp32: 'fp32（全精度基准）',
  fp16: 'fp16（体积减半）',
  q8: 'q8（浏览器 WASM 默认档）',
  q4: 'q4（4-bit 块量化）',
  q2: 'q2（低比特 · 两仓库均未提供）',
};

const renderInteractive = canvasStory({
  create: createModelRegistryCheck,
  apply(instance: ModelRegistryInstance, args: RegistryArgs) {
    instance.update(args);
  },
  readout(snapshot: ModelRegistrySnapshot) {
    return [
      ['模型', MODEL_LABELS[snapshot.model]],
      ['dtype', snapshot.dtype],
      ['文件清单', snapshot.fileCount > 0 ? `${snapshot.fileCount} 个文件` : '—'],
      ['合计体积', snapshot.totalText ?? '—'],
      ['缓存命中', snapshot.cacheText ?? '—'],
      ['实际需下载', snapshot.pendingText ?? '—'],
      ['状态', STATUS_LABELS[snapshot.status]],
    ];
  },
});

const meta = {
  id: 'model-registry',
  title: '核心 API/运行配置/ModelRegistry',
  tags: ['!dev'],
  args: {
    model: 'distilbert',
    dtype: 'q8',
  },
  argTypes: {
    model: {
      name: '模型预设',
      description:
        '切换 get_pipeline_files / is_pipeline_cached_files 的检查对象；distilbert 与 1.2 课同一模型，运行过其示例的浏览器应显示缓存命中。',
      control: {
        type: 'select',
        labels: MODEL_LABELS,
      },
      options: Object.keys(MODEL_LABELS),
    },
    dtype: {
      name: 'dtype 档位',
      description:
        '决定清单中的 onnx 文件名与缓存键；切到 q2 可观察仓库未提供档位时 exists: false 的表现。检查不下载任何权重。',
      control: {
        type: 'select',
        labels: DTYPE_LABELS,
      },
      options: Object.keys(DTYPE_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<RegistryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
