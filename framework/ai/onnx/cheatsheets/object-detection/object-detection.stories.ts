import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import detectSource from './yolos-detect.ts?raw';
import {
  createYolosDetect,
  type DetectionSnapshot,
  type YolosDetectInstance,
} from './yolos-detect';

interface ThresholdArgs {
  threshold: number;
}

const renderPipeline = canvasStory({
  create: createYolosDetect,
  apply(instance: YolosDetectInstance, args: ThresholdArgs) {
    instance.update({ threshold: args.threshold });
  },
  readout(snapshot: DetectionSnapshot) {
    return [
      ['状态', snapshot.message],
      ['模型输出', snapshot.outputDesc],
      ['候选集', snapshot.candidates],
      ['保留框数', snapshot.kept],
      ['推理耗时', snapshot.runMs],
    ];
  },
  captions: ['左：photo → 预处理 → 推理 → 解码 → 画框', '右：解码保留的候选（按分数排序）'],
});

// Storybook 10：用显式类型标注（而非 satisfies）让 meta 携带 args 元数据。
const meta: Meta<ThresholdArgs> = {
  id: 'object-detection',
  title: '实战应用/目标检测',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<ThresholdArgs>;

export const Pipeline: Story = {
  name: '端到端检测',
  args: {
    threshold: 0.5,
  },
  argTypes: {
    threshold: {
      name: '置信度阈值',
      description:
        '解码阶段的过滤线：只保留「最大类概率 ≥ 阈值」的候选。调整只重新解码已缓存的输出，不重新推理。',
      control: {
        type: 'range',
        min: 0.05,
        max: 0.95,
        step: 0.05,
      },
    },
  },
  render: renderPipeline,
  parameters: storySource(detectSource),
};
