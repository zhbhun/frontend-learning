import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './device-dtype-probe.ts?raw';
import {
  createDeviceDtypeProbe,
  type DeviceDtypeInstance,
  type DeviceDtypeSnapshot,
  type DtypeValue,
} from './device-dtype-probe';

interface DeviceDtypeArgs {
  dtype: DtypeValue;
}

const STATUS_LABELS: Record<DeviceDtypeSnapshot['status'], string> = {
  loading: '探测中…',
  ready: '就绪',
};

/* dtype 全集的下拉标签：顺序与正文映射表一致 */
const DTYPE_LABELS: Record<DtypeValue, string> = {
  fp32: 'fp32（全精度基准）',
  fp16: 'fp16（体积减半 · 需 shader-f16）',
  q8: 'q8（浏览器 WASM 默认档）',
  int8: 'int8（8-bit 变体）',
  uint8: 'uint8（8-bit 变体）',
  q4: 'q4（4-bit 块量化）',
  q4f16: 'q4f16（fp16 + 4-bit · LLM 常用）',
  q2: 'q2（v4.1 · 低比特）',
  q2f16: 'q2f16（v4.1 · 低比特）',
  q1: 'q1（v4.1 · BitNET 类）',
  q1f16: 'q1f16（v4.1 · BitNET 类）',
  bnb4: 'bnb4（bitsandbytes 4-bit）',
};

const renderInteractive = canvasStory({
  create: createDeviceDtypeProbe,
  apply(instance: DeviceDtypeInstance, args: DeviceDtypeArgs) {
    instance.update(args);
  },
  readout(snapshot: DeviceDtypeSnapshot) {
    return [
      ['状态', STATUS_LABELS[snapshot.status]],
      ['WebGPU', snapshot.webgpuText],
      ['shader-f16', snapshot.shaderF16Text],
      ['当前 dtype', snapshot.dtype],
      ['对应文件', snapshot.fileName ?? '—'],
      ['文件体积', snapshot.sizeText ?? '—'],
      ['仓库状态', snapshot.repoText ?? '—'],
    ];
  },
});

const meta = {
  id: 'device-dtype',
  title: '核心 API/运行配置/device 与 dtype',
  tags: ['!dev'],
  args: {
    dtype: 'q8',
  },
  argTypes: {
    dtype: {
      name: 'dtype 档位',
      description:
        '对应 options.dtype：切换后用 HEAD 请求实测该档位文件是否存在与体积（不下载权重）；选到 q1/q2 系列可看到本仓库未提供。',
      control: {
        type: 'select',
        labels: DTYPE_LABELS,
      },
      options: Object.keys(DTYPE_LABELS),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<DeviceDtypeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
