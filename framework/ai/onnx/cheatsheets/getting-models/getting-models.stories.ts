import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import inspectorSource from './getting-models.ts?raw';
import {
  createSignatureInspector,
  MODEL_SOURCES,
  type ModelSourceId,
  type SignatureEntry,
  type SignatureInspectorInstance,
  type SignatureSnapshot,
} from './getting-models';

interface SourceArgs {
  source: ModelSourceId;
}

/** 一条签名条目在读数里占一行：标签是值名，值是类型与形状。 */
function readoutRows(
  prefix: string,
  entries: SignatureEntry[],
  rows: Array<[string, string]>,
) {
  for (const entry of entries) {
    rows.push([`${prefix} ${entry.name}`, entry.desc]);
  }
}

const renderInspector = canvasStory({
  create: createSignatureInspector,
  apply(instance: SignatureInspectorInstance, args: SourceArgs) {
    instance.update({ sourceId: args.source });
  },
  readout(snapshot: SignatureSnapshot) {
    const rows: Array<[string, string]> = [
      ['状态', snapshot.message],
      ['来源', snapshot.sourceNote],
    ];
    readoutRows('输入', snapshot.inputs, rows);
    readoutRows('输出', snapshot.outputs, rows);
    return rows;
  },
});

// 用类型标注（而非 satisfies）携带 SourceArgs，让默认导出的 meta 携带 args 元数据。
const meta: Meta<SourceArgs> = {
  id: 'getting-models',
  title: '上手/获取模型',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<SourceArgs>;

export const SignatureLookup: Story = {
  name: '签名速查',
  args: {
    source: 'zoo-media',
  },
  argTypes: {
    source: {
      name: '模型来源',
      description:
        '切换模型 URL 的来源与形态：两个能加载的直连来源，加一个刻意的 LFS 指针失败对照。',
      control: {
        type: 'radio',
        labels: Object.fromEntries(
          MODEL_SOURCES.map((item) => [item.id, item.label] as const),
        ),
      },
      options: MODEL_SOURCES.map((item) => item.id),
    },
  },
  render: renderInspector,
  parameters: storySource(inspectorSource),
};
