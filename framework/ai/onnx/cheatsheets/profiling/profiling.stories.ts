import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import kernelProfilingSource from './kernel-profiling.ts?raw';
import runTimingSource from './run-timing.ts?raw';
import {
  createKernelProfiling,
  type ProfilingInstance,
  type ProfilingSnapshot,
} from './kernel-profiling';
import {
  createRunTiming,
  type RunTimingInstance,
  type TimingSnapshot,
} from './run-timing';

const renderTiming = canvasStory({
  create: createRunTiming,
  apply(instance: RunTimingInstance, args: { model: string; warmup: number; samples: number }) {
    instance.update(args);
  },
  readout(snapshot: TimingSnapshot) {
    return [
      ['状态', snapshot.message],
      ['模型', snapshot.modelLabel],
      ['输入签名', snapshot.inputSignature],
      ['输出签名', snapshot.outputSignature],
      ['执行后端', snapshot.backendNote],
      ['预热 / 采样', `${snapshot.warmupCount} / ${snapshot.sampleCount}`],
      ['首个样本', snapshot.stats ? `${snapshot.stats.first.toFixed(2)} ms` : '—'],
      ['min', snapshot.stats ? `${snapshot.stats.min.toFixed(2)} ms` : '—'],
      ['median', snapshot.stats ? `${snapshot.stats.median.toFixed(2)} ms` : '—'],
      ['p95', snapshot.stats ? `${snapshot.stats.p95.toFixed(2)} ms` : '—'],
      ['max', snapshot.stats ? `${snapshot.stats.max.toFixed(2)} ms` : '—'],
      ['均值', snapshot.stats ? `${snapshot.stats.mean.toFixed(2)} ms` : '—'],
    ];
  },
  captions: ['画布：每次取样的 run 耗时', '读数：输入签名与分布统计'],
});

const renderProfiling = canvasStory({
  create: createKernelProfiling,
  apply(instance: ProfilingInstance) {
    instance.update();
  },
  readout(snapshot: ProfilingSnapshot) {
    const topEntries: [string, string][] = snapshot.topKernels.map(
      (line, index) => [`Top${index + 1} 内核`, line],
    );
    return [
      ['状态', snapshot.message],
      ['WebGPU 支持', snapshot.support],
      ['GPU 适配器', snapshot.adapter],
      ['timestamp-query', snapshot.timestampQuery],
      ['profiling.mode', snapshot.profilingMode],
      ['run 次数', snapshot.runCount],
      ['剖析记录', snapshot.recordCount],
      ...topEntries,
    ];
  },
  captions: ['画布：ondata 记录按算子类型汇总', '读数：能力检测与内核耗时排行'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta = {
  id: 'profiling',
  title: '工程与性能/性能优化/性能测量',
  tags: ['!dev'],
};

export default meta;

type TimingStory = StoryObj<{ model: string; warmup: number; samples: number }>;

export const TimingLoop: TimingStory = {
  name: '计时闭环',
  args: {
    model: 'squeezenet',
    warmup: 0,
    samples: 30,
  },
  argTypes: {
    model: {
      name: '模型',
      description: '切换后重新创建会话并计时；模型越大，warmup 效应越容易观察。',
      control: {
        type: 'radio',
        options: ['squeezenet', 'mnist'],
        labels: { squeezenet: 'squeezenet1.1（4.7MB）', mnist: 'mnist-8（26KB）' },
      },
    },
    warmup: {
      name: '预热次数',
      description: '计时前的弃置 run 数；0 次时首个样本承担冷启动成本。',
      control: {
        type: 'radio',
        options: [0, 1, 3],
      },
    },
    samples: {
      name: '采样次数',
      description: '计入统计的连续 run 次数；次数越多分布越稳。',
      control: {
        type: 'radio',
        options: [10, 30],
      },
    },
  },
  render: renderTiming,
  parameters: storySource(runTimingSource),
};

type ProfilingStory = StoryObj<Record<string, never>>;

export const KernelProfiling: ProfilingStory = {
  name: '内核计时现场',
  render: renderProfiling,
  parameters: storySource(kernelProfilingSource),
};
