import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import classifierSource from './classifier.ts?raw';
import decoderSource from './decoder.ts?raw';
import preprocessSource from './preprocess.ts?raw';
import {
  SAMPLES,
  createImageClassification,
  type AppArgs,
  type AppInstance,
  type AppSnapshot,
} from './image-classification';
import { NORMALIZE_LABELS } from './preprocess';

const renderApp = canvasStory({
  create: createImageClassification,
  apply(instance: AppInstance, args: AppArgs) {
    instance.update(args);
  },
  readout(snapshot: AppSnapshot) {
    return [
      ['状态', snapshot.message],
      ['模型', snapshot.modelDesc],
      ['标签表', snapshot.labelsDesc],
      ['输入张量', snapshot.inputDesc],
      ['输出张量', snapshot.outputDesc],
      ['本次推理', snapshot.runDesc],
      ['本次解码', snapshot.decodeDesc],
      ['Top-1', snapshot.top1Desc],
    ];
  },
  captions: ['左侧：模型实际输入（中心裁剪 224×224）', '右侧：解码模块的 Top-K 输出'],
});

// Show code 组合输入 → 输出链路真正经过的三个核心模块；画布与状态机
// （image-classification.ts）是演示外壳，不拼入。
const coreSource = [
  '// ── 模块 1：preprocess.ts（预处理：RGBA → 输入张量）────────────',
  preprocessSource,
  '// ── 模块 2：decoder.ts（解码：logits → Top-K）──────────────────',
  decoderSource,
  '// ── 模块 3：classifier.ts（装配：加载缓存 + 管线编排）──────────',
  classifierSource,
].join('\n\n');

// 用类型标注（而非 satisfies）携带 AppArgs，让 Storybook 10 的 meta 携带 args 元数据，
// 与既有课程写法一致。
const meta: Meta<AppArgs> = {
  id: 'image-classification',
  title: '实战应用/图像分类应用',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<AppArgs>;

export const Pipeline: Story = {
  name: '端到端分类器',
  args: {
    photo: 'dog',
    normalize: 'imagenet',
    topK: 5,
  },
  argTypes: {
    photo: {
      name: '示例照片',
      description:
        '切换 Wikimedia Commons 示例照片（响应带 CORS 头，已实测）；切换后重新取图并跑完整管线。',
      control: {
        type: 'radio',
        labels: Object.fromEntries(SAMPLES.map((sample) => [sample.id, sample.label])),
        options: SAMPLES.map((sample) => sample.id),
      },
    },
    normalize: {
      name: '归一化',
      description:
        '预处理值域模式；后两档是「错而不报」的对照——观察输入 / 输出张量范围读数与 Top-K 的变化。',
      control: {
        type: 'radio',
        labels: NORMALIZE_LABELS,
        options: ['imagenet', 'divide', 'raw'],
      },
    },
    topK: {
      name: 'Top-K',
      description: '解码取概率前 K 的类别；切换只重算解码，不重跑推理。',
      control: {
        type: 'radio',
        options: [3, 5],
      },
    },
  },
  render: renderApp,
  parameters: storySource(coreSource),
};
