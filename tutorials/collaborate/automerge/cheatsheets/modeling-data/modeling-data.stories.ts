import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  GRANULARITY_OPTIONS,
  createGranularityLab,
  type GranularityArgsView,
  type GranularityInstance,
  type GranularitySnapshot,
} from './change-granularity';
import {
  SCALE_OPTIONS,
  createScaleLab,
  type ScaleArgsView,
  type ScaleInstance,
  type ScaleSnapshot,
} from './collection-scale';
import {
  SHAPE_OPTIONS,
  createShapeLab,
  type ShapeArgsView,
  type ShapeInstance,
  type ShapeSnapshot,
} from './concurrent-shapes';
import granularitySource from './change-granularity.ts?raw';
import scaleSource from './collection-scale.ts?raw';
import shapeSource from './concurrent-shapes.ts?raw';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台，
 * 互不串位。场景切换与文本输入都通过 args 重新驱动实例重算。
 */
function scaleRenderer() {
  return canvasStory({
    create: createScaleLab,
    apply(instance: ScaleInstance, args: ScaleArgsView) {
      instance.update(args);
    },
    readout(snapshot: ScaleSnapshot) {
      const kb = (n: number) =>
        n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} 字节`;
      return [
        ['单次插入变更', kb(snapshot.changeBytes)],
        ['全文档 save', kb(snapshot.saveBytes)],
        ['全文档 load', `约 ${snapshot.loadMs} ms`],
      ];
    },
  });
}

function shapeRenderer() {
  return canvasStory({
    create: createShapeLab,
    apply(instance: ShapeInstance, args: ShapeArgsView) {
      instance.update(args);
    },
    readout(snapshot: ShapeSnapshot) {
      return [
        ['合并结果', snapshot.mergedShort],
        [
          'bbbb 编辑保留',
          snapshot.editKept === null ? '—' : snapshot.editKept ? '是' : '否（丢失）',
        ],
        ['冲突候选', snapshot.conflicts > 0 ? `${snapshot.conflicts} 个` : '无'],
      ];
    },
  });
}

function granularityRenderer() {
  return canvasStory({
    create: createGranularityLab,
    apply(instance: GranularityInstance, args: GranularityArgsView) {
      instance.update(args);
    },
    readout(snapshot: GranularitySnapshot) {
      return [
        ['单次写入 op 数', String(snapshot.opsPerWrite)],
        ['两副本总 op 数', String(snapshot.totalOps)],
        ['合并后读数', snapshot.mergedShort],
        ['冲突候选', snapshot.conflicts > 0 ? `${snapshot.conflicts} 个` : '无'],
      ];
    },
  });
}

interface CourseArgs
  extends ScaleArgsView,
    ShapeArgsView,
    GranularityArgsView {}

const meta = {
  id: 'modeling-data',
  title: '进阶专题/数据建模手册',
  tags: ['!dev'],
  args: {
    size: SCALE_OPTIONS[0],
    shape: SHAPE_OPTIONS[0],
    bobValue: '来自 B 的值',
    field: GRANULARITY_OPTIONS[0],
    content: '会议纪要：确认迭代范围与负责人，同步风险清单',
  },
  argTypes: {
    size: {
      name: '集合规模',
      description: '构造固定内容的 list，观察单次插入的变更体积与全文档体积随规模的走向。',
      control: { type: 'select' },
      options: SCALE_OPTIONS,
    },
    shape: {
      name: '建模场景',
      description:
        '两个共享祖先的副本各做一次并发修改：并发添加、清单+实体移动、list 内移动元素。',
      control: { type: 'select' },
      options: SHAPE_OPTIONS,
    },
    bobValue: {
      name: '副本 bbbb 写入',
      description: '副本 bbbb（actorId 为 bbbb）并发写入的内容，通常是修改后的标题。',
      control: { type: 'text' },
    },
    field: {
      name: '字段写法',
      description:
        '同一字段写 20 次的三种写法：普通字符串整段覆盖、ImmutableString 整段覆盖、Counter 与普通数字。',
      control: { type: 'select' },
      options: GRANULARITY_OPTIONS,
    },
    content: {
      name: '每次写入的内容',
      description: '整段覆盖时每次写入的文本，长度决定普通字符串产生的 op 数。',
      control: { type: 'text' },
    },
  },
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const ScaleLab: Story = {
  name: '集合规模与文档体积',
  args: { size: SCALE_OPTIONS[0] },
  render: scaleRenderer(),
  parameters: storySource(scaleSource),
};

export const ConcurrentAdd: Story = {
  name: '并发添加对照',
  args: { shape: SHAPE_OPTIONS[0], bobValue: '来自 B 的值' },
  render: shapeRenderer(),
  parameters: storySource(shapeSource),
};

export const OrderedMove: Story = {
  name: '清单与实体移动',
  args: { shape: SHAPE_OPTIONS[1], bobValue: 'B2' },
  render: shapeRenderer(),
  parameters: storySource(shapeSource),
};

export const MovedElementEdit: Story = {
  name: '移动元素的并发编辑',
  args: { shape: SHAPE_OPTIONS[2], bobValue: 'C2' },
  render: shapeRenderer(),
  parameters: storySource(shapeSource),
};

export const GranularityLab: Story = {
  name: '字段写法与变更粒度',
  args: { field: GRANULARITY_OPTIONS[0] },
  render: granularityRenderer(),
  parameters: storySource(granularitySource),
};
