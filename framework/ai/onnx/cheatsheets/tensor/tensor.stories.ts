import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import dimsReshapeSource from './dims-reshape.ts?raw';
import float16BitsSource from './float16-bits.ts?raw';
import typeMapSource from './type-map.ts?raw';
import {
  createDimsReshape,
  type DimsReshapeInstance,
  type DimsReshapeSnapshot,
} from './dims-reshape';
import {
  createFloat16Bits,
  type Float16Instance,
  type Float16Snapshot,
} from './float16-bits';
import {
  createTypeMap,
  DTYPE_IDS,
  type DtypeId,
  type TypeMapInstance,
  type TypeMapSnapshot,
} from './type-map';

interface TypeMapArgs {
  dtype: DtypeId;
}

interface DimsArgs {
  rows: number;
  cols: number;
}

interface Float16Args {
  value: number;
}

const renderTypeMap = canvasStory({
  create: createTypeMap,
  apply(instance: TypeMapInstance, args: TypeMapArgs) {
    instance.update({ dtype: args.dtype });
  },
  readout(snapshot: TypeMapSnapshot) {
    return [
      ['类型', snapshot.dtype],
      ['dims', snapshot.dims],
      ['size', String(snapshot.size)],
      ['data 载体', snapshot.carrier],
      ...snapshot.rows,
    ];
  },
});

const renderDimsReshape = canvasStory({
  create: createDimsReshape,
  apply(instance: DimsReshapeInstance, args: DimsArgs) {
    instance.update({ rows: args.rows, cols: args.cols });
  },
  readout(snapshot: DimsReshapeSnapshot) {
    return [
      ['A.dims', snapshot.dimsA],
      ['B.dims', snapshot.dimsB],
      ['size', String(snapshot.size)],
      ['A.data === B.data', snapshot.sameBuffer],
      ['data 内容', snapshot.dataPreview],
    ];
  },
  captions: ['左：A——按 dims 行优先折叠', '右：B——reshape 只换形状'],
});

const renderFloat16 = canvasStory({
  create: createFloat16Bits,
  apply(instance: Float16Instance, args: Float16Args) {
    instance.update({ value: args.value });
  },
  readout(snapshot: Float16Snapshot) {
    return [
      ['输入值', snapshot.value],
      ['float32 存储值', snapshot.stored32],
      ['float16 位模式', snapshot.bits],
      ['float16 解回值', snapshot.decoded],
      ['float16 − float32', snapshot.delta],
    ];
  },
});

// 用类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级元数据。
const meta: Meta = {
  id: 'tensor',
  title: '核心概念/张量与数据/Tensor 与数据类型',
  tags: ['!dev'],
};

export default meta;

type TypeMapStory = StoryObj<TypeMapArgs>;
type DimsStory = StoryObj<DimsArgs>;
type Float16Story = StoryObj<Float16Args>;

export const TypeMap: TypeMapStory = {
  name: '类型映射',
  args: {
    dtype: 'float32',
  },
  argTypes: {
    dtype: {
      name: '数据类型',
      description: '切换 new Tensor 的 type 实参，观察 data 载体与内容的变化。',
      control: {
        type: 'radio',
        options: [...DTYPE_IDS],
      },
    },
  },
  render: renderTypeMap,
  parameters: storySource(typeMapSource),
};

export const DimsReshape: DimsStory = {
  name: 'dims 与 reshape',
  args: {
    rows: 2,
    cols: 3,
  },
  argTypes: {
    rows: {
      name: '行数',
      description: 'A 的第一维长度，data 取序列 1..行数×列数。',
      control: { type: 'range', min: 1, max: 4, step: 1 },
    },
    cols: {
      name: '列数',
      description: 'A 的第二维长度，B 转置为 [列数, 行数]。',
      control: { type: 'range', min: 1, max: 6, step: 1 },
    },
  },
  render: renderDimsReshape,
  parameters: storySource(dimsReshapeSource),
};

export const Float16Bits: Float16Story = {
  name: 'float16 位模式',
  args: {
    value: 0.1,
  },
  argTypes: {
    value: {
      name: '输入值',
      description: '同一个 number 在 float32 与 float16 下的存储对比。',
      control: { type: 'range', min: -10, max: 10, step: 0.001 },
    },
  },
  render: renderFloat16,
  parameters: storySource(float16BitsSource),
};
