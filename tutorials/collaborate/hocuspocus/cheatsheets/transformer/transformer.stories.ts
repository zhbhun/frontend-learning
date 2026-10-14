import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createRoundtrip,
  createSchemaFilter,
  createSeedReplay,
  FILTER_SAMPLE_LABELS,
  type FilterSample,
  type ReplayOptions,
  type ReplaySnapshot,
  type RoundtripOptions,
  type RoundtripSnapshot,
  type FilterSnapshot,
  type TransformerInstance,
} from './transformer-model';
import transformerModelSource from './transformer-model.ts?raw';

interface RoundtripArgs {
  json: Record<string, unknown>;
}

interface FilterArgs {
  sample: FilterSample;
}

interface ReplayArgs {
  seedText: string;
  replay: boolean;
}

/** 默认底稿：heading + bold + link，均在 TiptapTransformer 默认的 StarterKit 里。 */
const DEFAULT_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '项目立项说明' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '由协作服务生成的' },
        { type: 'text', marks: [{ type: 'bold' }], text: '底稿内容' },
        { type: 'text', text: '，' },
        {
          type: 'text',
          marks: [
            { type: 'link', attrs: { href: 'https://tiptap.dev/docs/hocuspocus' } },
          ],
          text: '查看 Hocuspocus 文档',
        },
        { type: 'text', text: '。' },
      ],
    },
  ],
};

/** select 控件的 options 需要「标签 → 值」，与 FILTER_SAMPLE_LABELS 相反。 */
const FILTER_OPTIONS = Object.fromEntries(
  Object.entries(FILTER_SAMPLE_LABELS).map(([value, label]) => [label, value]),
) as Record<string, FilterSample>;

const renderRoundtrip = canvasStory({
  create: createRoundtrip,
  apply(
    instance: TransformerInstance<RoundtripOptions>,
    args: RoundtripArgs,
  ) {
    instance.update({ json: args.json });
  },
  readout(snapshot: RoundtripSnapshot) {
    return [
      ['输入 JSON', `${snapshot.jsonBytes} 字节`],
      ['Y.Doc 字段', snapshot.ok ? `${snapshot.field} · 顶层 ${snapshot.topBlocks} 块` : '—'],
      ['二进制 update', snapshot.ok ? `${snapshot.updateBytes} 字节` : '—'],
      ['回读 JSON', snapshot.ok ? (snapshot.matches ? '与输入一致' : '与输入不一致') : '转换失败'],
      ['错误消息', snapshot.error || '—'],
    ];
  },
});

const renderFilter = canvasStory({
  create: createSchemaFilter,
  apply(instance: TransformerInstance<{ sample: FilterSample }>, args: FilterArgs) {
    instance.update({ sample: args.sample });
  },
  readout(snapshot: FilterSnapshot) {
    return [
      ['转换样本', FILTER_SAMPLE_LABELS[snapshot.sample]],
      ['toYdoc', snapshot.ok ? '转换成功 → Y.Doc' : snapshot.error],
      ['回读 attrs', snapshot.readbackAttrs],
      ['结论', snapshot.conclusion],
    ];
  },
});

const renderReplay = canvasStory({
  create: createSeedReplay,
  apply(instance: TransformerInstance<ReplayOptions>, args: ReplayArgs) {
    instance.update({ seedText: args.seedText, replay: args.replay });
  },
  readout(snapshot: ReplaySnapshot) {
    return [
      ['底稿文字', snapshot.seedText || '—'],
      ['底稿 update', snapshot.seedBytes > 0 ? `${snapshot.seedBytes} 字节` : '—'],
      ['在线文档内容', snapshot.finalText ? snapshot.finalText.replace(/\n/g, ' ⏎ ') : '—'],
      ['底稿出现次数', snapshot.seedText ? String(snapshot.occurrences) : '—'],
      ['结论', snapshot.verdict],
    ];
  },
});

const meta = {
  id: 'transformer',
  title: '进阶/数据转换',
  tags: ['!dev'],
  args: {
    json: DEFAULT_DOC,
    sample: 'standard' as FilterSample,
    seedText: '发布窗口锁定在周四上午。',
    replay: false,
  },
  argTypes: {
    json: {
      name: 'Tiptap JSON',
      description:
        '进入 toYdoc 的文档 JSON：type 为 doc，content 里只能放 schema 认识的节点。',
      control: { type: 'object' },
    },
    sample: {
      name: '转换样本',
      description: '检验 schema 对节点、属性的双向过滤行为。',
      control: { type: 'select' },
      options: FILTER_OPTIONS,
    },
    seedText: {
      name: '底稿文字',
      description: 'onLoadDocument 里 toYdoc 底稿的内容。',
      control: { type: 'text' },
    },
    replay: {
      name: '重放到已有内容',
      description:
        '打开后底稿 update 会应用到已含同样内容的在线文档上，观察内容重复。',
      control: { type: 'boolean' },
    },
  },
  parameters: storySource(transformerModelSource),
} satisfies Meta<RoundtripArgs & FilterArgs & ReplayArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Roundtrip: Story = {
  name: '双向转换',
  render: renderRoundtrip,
  args: {
    json: DEFAULT_DOC,
  },
  argTypes: {
    sample: { table: { disable: true } },
    seedText: { table: { disable: true } },
    replay: { table: { disable: true } },
  },
};

export const SchemaFilter: Story = {
  name: 'schema 过滤',
  render: renderFilter,
  args: {
    sample: 'standard',
  },
  argTypes: {
    json: { table: { disable: true } },
    seedText: { table: { disable: true } },
    replay: { table: { disable: true } },
  },
};

export const SeedReplay: Story = {
  name: '底稿重放',
  render: renderReplay,
  args: {
    seedText: '发布窗口锁定在周四上午。',
    replay: false,
  },
  argTypes: {
    json: { table: { disable: true } },
    sample: { table: { disable: true } },
  },
};
