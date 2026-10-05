import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import epMatrixSource from './ep-matrix.ts?raw';
import {
  COMBO_OPTIONS,
  createEpMatrix,
  type EpMatrixArgs,
  type EpMatrixInstance,
  type EpMatrixSnapshot,
} from './ep-matrix';

const renderMatrix = canvasStory({
  create: createEpMatrix,
  apply(instance: EpMatrixInstance, args: EpMatrixArgs) {
    instance.update(args);
  },
  readout(snapshot: EpMatrixSnapshot) {
    return [
      ['组合', snapshot.comboLabel],
      ['navigator.gpu', snapshot.gpuPresent],
      ['GPU 适配器', snapshot.adapter],
      ['navigator.ml', snapshot.mlPresent],
      ['WebGL 上下文', snapshot.webglContext],
      ['create 结果', snapshot.createOutcome],
      ['ort 警告（捕获原文）', snapshot.ortWarnings],
      ['生效 EP（推定）', snapshot.effectiveEps],
      ['create 耗时', snapshot.createMs],
      ['run 均值（预热 1 次后 5 次）', snapshot.runMean],
    ];
  },
  captions: ['画布：每个请求 EP 的判定与会话结局', '读数：检测链、警告原文与推定的生效列表'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta = {
  id: 'backend-selection',
  title: '核心概念/执行后端/后端选择与回退',
  tags: ['!dev'],
};

export default meta;

type MatrixStory = StoryObj<EpMatrixArgs>;

export const Matrix: MatrixStory = {
  name: '选择与回退现场',
  args: {
    // 默认展示「实验后端不可用 → 警告 + 兜底」：在绝大多数读者的环境里都能看到。
    combo: COMBO_OPTIONS[2].label,
  },
  argTypes: {
    combo: {
      name: 'executionProviders 组合',
      description:
        '切换后按新组合创建会话（结果缓存）；[\'webgl\'] 单独请求会演示全部不可用的抛错。',
      control: {
        type: 'radio',
        options: COMBO_OPTIONS.map((option) => option.label),
      },
    },
  },
  render: renderMatrix,
  parameters: storySource(epMatrixSource),
};
