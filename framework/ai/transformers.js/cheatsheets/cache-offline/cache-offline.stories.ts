import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './cache-inventory.ts?raw';
import {
  createCacheInventory,
  type CacheInventoryInstance,
  type CacheInventorySnapshot,
  type InventoryStatus,
  type ProbeKey,
  type ViewKey,
} from './cache-inventory';

interface CacheInventoryArgs {
  view: ViewKey;
  probe: ProbeKey;
}

const STATUS_LABELS: Record<InventoryStatus, string> = {
  loading: '读取中…',
  ready: '就绪',
  error: '读取失败',
};

/* 「观察对象」全集的下拉标签：模型与使用它的兄弟课程对应 */
const VIEW_LABELS: Record<ViewKey, string> = {
  distilbert: 'distilbert sst-2（1.2 课 · 情感分类）',
  minilm: 'all-MiniLM-L6-v2（3.1.4 课 · 句向量）',
  mobilevit: 'mobilevit-small（3.2.1 课 · 图像分类）',
  whisper: 'whisper-tiny.en（3.3.1 课 · 语音识别）',
  wasm: 'WASM 运行时文件（ORT）',
  all: '全部条目',
};

/* 「revision 探针」的下拉标签：main 是缓存条目实际使用的版本 */
const PROBE_LABELS: Record<ProbeKey, string> = {
  main: 'main（条目所用版本）',
  upgrade: '新版本探针（模拟模型升级）',
};

const renderInteractive = canvasStory({
  create: createCacheInventory,
  apply(instance: CacheInventoryInstance, args: CacheInventoryArgs) {
    instance.update(args);
  },
  readout(snapshot: CacheInventorySnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['缓存名', snapshot.cacheName ?? '—'],
      ['条目总数', `${snapshot.totalCount} 条`],
      ['当前视图', `${snapshot.viewCount} 条 · 合计 ${snapshot.viewSizeText}`],
      [
        '命中判定',
        snapshot.probeTotal > 0
          ? `revision=${snapshot.probeRevision}：${snapshot.probeHits}/${snapshot.probeTotal} 命中`
          : '—',
      ],
      ['结论', snapshot.probeConclusion],
    ];
  },
});

const meta = {
  id: 'cache-offline',
  title: '工程化/缓存与离线',
  tags: ['!dev'],
  args: {
    view: 'distilbert',
    probe: 'main',
  } as CacheInventoryArgs,
  argTypes: {
    view: {
      name: '观察对象',
      description:
        '切换查看不同模型或 WASM 运行时在 transformers-cache 里的真实条目（URL 键 + Content-Length 体积）；没运行过对应课程时条目为 0，同样是有效观察。',
      control: {
        type: 'select',
        labels: VIEW_LABELS,
      },
      options: Object.keys(VIEW_LABELS),
    },
    probe: {
      name: 'revision 探针',
      description:
        '按「浏览器缓存键 = 完整远端 URL」规则构造 URL 逐文件 match（纯本地、零网络）：main 应全部命中；切到新版本探针可看到版本变化导致全部失配。',
      control: {
        type: 'select',
        labels: PROBE_LABELS,
      },
      options: Object.keys(PROBE_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CacheInventoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
