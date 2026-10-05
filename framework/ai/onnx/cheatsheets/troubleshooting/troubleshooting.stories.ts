import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
// Show code 绑定 worker 文件：十档故障的注入逻辑与真实 ort 执行都发生在那里。
import faultLabWorkerSource from './fault-lab.worker.ts?raw';
import {
  createFaultLab,
  FAULT_OPTIONS,
  softWrap,
  STAGE_LABELS,
  type FaultArgs,
  type FaultLabInstance,
  type FaultLabSnapshot,
} from './fault-lab';

const renderFaultLab = canvasStory({
  create: createFaultLab,
  apply(instance: FaultLabInstance, args: FaultArgs) {
    instance.update({ fault: args.fault });
  },
  readout(snapshot: FaultLabSnapshot) {
    const outcome =
      snapshot.phase === 'running'
        ? '进行中…'
        : snapshot.outcome === 'error'
          ? `中断于 ${snapshot.stage ? STAGE_LABELS[snapshot.stage] : '链路'}`
          : snapshot.outcome === 'fallback-ok'
            ? '无报错——警告 + 兜底（会话照建）'
            : '无报错——输出恒零（结果不对）';
    return [
      ['故障注入', snapshot.faultLabel],
      ['结局', outcome],
      ['报错原文', snapshot.errorText ? softWrap(snapshot.errorText) : '—'],
      ['控制台警告', snapshot.warningText ? softWrap(snapshot.warningText) : '—'],
      ['实际拉取 .wasm', snapshot.wasmUrl ? softWrap(snapshot.wasmUrl) : '—'],
      [
        '输出最大绝对值',
        snapshot.outputMaxAbs === null ? '—' : snapshot.outputMaxAbs.toExponential(2),
      ],
    ];
  },
  captions: [
    '画布：推理链路四阶段，红 = 中断点，⚠ = 带警告通过，! = 结果异常',
    '读数：报错原文、控制台警告与实际拉取的工件 URL',
  ],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta<FaultArgs> = {
  id: 'troubleshooting',
  title: '工程与性能/上线/常见报错排查',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<FaultArgs>;

export const FaultLab: Story = {
  name: '报错现场复现器',
  args: {
    fault: 'wasm-mjs-404',
  },
  argTypes: {
    fault: {
      name: '故障注入',
      description:
        '切换后在全新 worker 里重跑一次真实链路：读数给出报错原文、控制台警告与中断阶段。',
      control: {
        type: 'radio',
        labels: Object.fromEntries(FAULT_OPTIONS.map((option) => [option.id, option.label])),
        options: FAULT_OPTIONS.map((option) => option.id),
      },
    },
  },
  render: renderFaultLab,
  parameters: storySource(faultLabWorkerSource),
};
