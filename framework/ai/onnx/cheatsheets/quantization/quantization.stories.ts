import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import accuracyCheckSource from './accuracy-check.ts?raw';
import sizeSpeedSource from './size-speed.ts?raw';
import {
  createAccuracyCheck,
  type AccuracyArgs,
  type AccuracyInstance,
  type AccuracySnapshot,
} from './accuracy-check';
import {
  createSizeSpeed,
  type SizeSpeedArgs,
  type SizeSpeedInstance,
  type SizeSpeedSnapshot,
} from './size-speed';

const renderSizeSpeed = canvasStory({
  create: createSizeSpeed,
  apply(instance: SizeSpeedInstance, args: SizeSpeedArgs) {
    instance.update(args);
  },
  readout(snapshot: SizeSpeedSnapshot) {
    const ratio = (
      numerator?: number,
      denominator?: number,
    ): string =>
      numerator !== undefined && denominator ? `${((numerator / denominator) * 100).toFixed(1)}%` : '—';
    return [
      ['状态', snapshot.message],
      ['对照对', snapshot.pairLabel],
      [
        'fp32 文件',
        snapshot.fp32Bytes !== undefined
          ? `${snapshot.fp32Label} · ${snapshot.fp32Bytes.toLocaleString('en-US')} 字节`
          : '—',
      ],
      [
        'int8 文件',
        snapshot.int8Bytes !== undefined
          ? `${snapshot.int8Label} · ${snapshot.int8Bytes.toLocaleString('en-US')} 字节`
          : '—',
      ],
      ['体积比（int8/fp32）', ratio(snapshot.int8Bytes, snapshot.fp32Bytes)],
      ['fp32 median', snapshot.fp32Median !== undefined ? `${snapshot.fp32Median.toFixed(2)} ms` : '—'],
      ['int8 median', snapshot.int8Median !== undefined ? `${snapshot.int8Median.toFixed(2)} ms` : '—'],
      [
        '耗时比（fp32/int8）',
        snapshot.fp32Median !== undefined && snapshot.int8Median
          ? `${(snapshot.fp32Median / snapshot.int8Median).toFixed(2)}x`
          : '—',
      ],
      ['测量环境', snapshot.backendNote],
    ];
  },
  captions: ['画布：下载体积与稳态耗时两组条形', '读数：文件字节、median 与比值'],
});

const renderAccuracy = canvasStory({
  create: createAccuracyCheck,
  apply(instance: AccuracyInstance, args: AccuracyArgs) {
    instance.update(args);
  },
  readout(snapshot: AccuracySnapshot) {
    return [
      ['状态', snapshot.message],
      ['输入', snapshot.inputLabel],
      ['fp32 top1', snapshot.fp32 ? `类别 ${snapshot.fp32.top1}` : '—'],
      ['fp32 置信度', snapshot.fp32 ? snapshot.fp32.prob.toFixed(4) : '—'],
      ['int8 top1', snapshot.int8 ? `类别 ${snapshot.int8.top1}` : '—'],
      ['int8 置信度', snapshot.int8 ? snapshot.int8.prob.toFixed(4) : '—'],
      ['int8 输出最大绝对值', snapshot.int8 ? snapshot.int8.maxAbs.toFixed(4) : '—'],
      ['logit 最大绝对差', snapshot.maxAbsDiff !== undefined ? snapshot.maxAbsDiff.toFixed(4) : '—'],
      ['结论', snapshot.conclusion ?? '—'],
    ];
  },
  captions: ['画布：输入预览与两张 logit 条形图', '读数：top1、置信度与差异'],
});

// 用类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级元数据，与既有课程写法一致。
const meta: Meta = {
  id: 'quantization',
  title: '工程与性能/性能优化/量化与体积',
  tags: ['!dev'],
};

export default meta;

type SizeSpeedStory = StoryObj<SizeSpeedArgs>;
type AccuracyStory = StoryObj<AccuracyArgs>;

export const SizeSpeed: SizeSpeedStory = {
  name: '体积与速度对照',
  args: {
    pair: 'squeezenet',
    samples: 30,
  },
  argTypes: {
    pair: {
      name: '对照对',
      description: '同一网络的两份权重；切换后重新下载并测量，MNIST 对体积比被图结构稀释。',
      control: {
        type: 'radio',
        options: ['squeezenet', 'mnist'],
        labels: {
          squeezenet: 'SqueezeNet 1.0（权重主导）',
          mnist: 'MNIST（图结构占比大）',
        },
      },
    },
    samples: {
      name: '采样次数',
      description: 'median 来自预热 1 次后的连续 run 次数；口径与「性能测量」课一致。',
      control: {
        type: 'radio',
        options: [10, 30],
      },
    },
  },
  render: renderSizeSpeed,
  parameters: storySource(sizeSpeedSource),
};

export const AccuracyCheck: AccuracyStory = {
  name: '同一输入对拍',
  args: {
    input: 'digit',
  },
  argTypes: {
    input: {
      name: '对拍输入',
      description: '同一份输入依次喂给 fp32 与 int8 两个会话；「恒零」结论与输入无关。',
      control: {
        type: 'radio',
        options: ['digit', 'noise'],
        labels: { digit: '合成数字 0', noise: '随机噪声' },
      },
    },
  },
  render: renderAccuracy,
  parameters: storySource(accuracyCheckSource),
};
