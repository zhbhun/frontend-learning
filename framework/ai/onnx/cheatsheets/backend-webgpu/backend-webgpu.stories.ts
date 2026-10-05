import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import webgpuBenchmarkSource from './webgpu-benchmark.ts?raw';
import {
  createWebGpuBenchmark,
  type WebGpuBenchmarkArgs,
  type WebGpuBenchmarkInstance,
  type WebGpuBenchmarkSnapshot,
} from './webgpu-benchmark';

const renderBenchmark = canvasStory({
  create: createWebGpuBenchmark,
  apply(instance: WebGpuBenchmarkInstance, args: WebGpuBenchmarkArgs) {
    instance.update({ iterations: args.iterations });
  },
  readout(snapshot: WebGpuBenchmarkSnapshot) {
    return [
      ['状态', snapshot.message],
      ['WebGPU 支持', snapshot.support],
      ['GPU 适配器', snapshot.adapter],
      ['shader-f16 特性', snapshot.shaderF16],
      ['wasm 均值', snapshot.wasmMean],
      ['wasm 最快', snapshot.wasmBest],
      ['webgpu 均值', snapshot.webgpuMean],
      ['webgpu 最快', snapshot.webgpuBest],
      ['加速比（wasm ÷ webgpu）', snapshot.ratio],
      ['webgpu 失败原因', snapshot.webgpuError],
      ['实际加载工件', snapshot.artifacts],
    ];
  },
  captions: ['画布：两个后端的计时结果', '读数：能力检测与计时的原始值'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta = {
  id: 'backend-webgpu',
  title: '核心概念/执行后端/WebGPU 后端',
  tags: ['!dev'],
};

export default meta;

type BenchmarkStory = StoryObj<WebGpuBenchmarkArgs>;

export const Benchmark: BenchmarkStory = {
  name: '能力检测与对比',
  args: {
    iterations: 20,
  },
  argTypes: {
    iterations: {
      name: '计时次数',
      description: '每个后端预热一次后各计时多少次推理；切换会重新计时（会话已缓存）。',
      control: {
        type: 'radio',
        options: [1, 10, 20, 50],
      },
    },
  },
  render: renderBenchmark,
  parameters: storySource(webgpuBenchmarkSource),
};
