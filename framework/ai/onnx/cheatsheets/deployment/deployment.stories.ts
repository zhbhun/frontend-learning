import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import deployProbeSource from './deploy-probe.ts?raw';
import {
  createDeployProbe,
  type DeployProbeInstance,
  type DeployProbeSnapshot,
  type DeployTarget,
} from './deploy-probe';

interface DeployProbeArgs {
  target: DeployTarget;
  expectedVersion: string;
}

const renderProbe = canvasStory({
  create: createDeployProbe,
  apply(instance: DeployProbeInstance, args: DeployProbeArgs) {
    instance.update(args);
  },
  readout(snapshot: DeployProbeSnapshot) {
    return [
      ['目标后端', snapshot.target],
      ['运行时版本', snapshot.runtimeVersion],
      [
        '版本对齐',
        snapshot.versionAligned
          ? '一致'
          : `不一致（期望 ${snapshot.expectedVersion}）`,
      ],
      ['安全上下文', snapshot.secureContext ? '是（https 或 localhost）' : '否'],
      [
        '跨域隔离',
        snapshot.isolated ? '已隔离（可多线程）' : '未隔离（单线程 wasm）',
      ],
      ['SharedArrayBuffer', snapshot.sabReady ? '可用' : '不可见'],
      ['WebGPU 适配器', snapshot.webgpuLabel],
      ['运行条件', snapshot.verdict],
    ];
  },
});

// 用显式 Meta<T> 类型标注（而非 satisfies）：让 Storybook 10 的 meta 携带课程级 args。
const meta: Meta<DeployProbeArgs> = {
  id: 'deployment',
  title: '工程与性能/上线/部署',
  tags: ['!dev'],
  args: {
    target: 'wasm',
    expectedVersion: '1.30.0',
  },
  argTypes: {
    target: {
      name: '目标后端',
      description:
        '按应用实际请求的执行后端切换必须项：webgpu 目标把安全上下文与适配器可用升为必须。',
      control: {
        type: 'radio',
        options: ['wasm', 'webgpu'],
      },
    },
    expectedVersion: {
      name: '期望版本',
      description: '预期部署的 onnxruntime-web 版本号，与运行时读数比对。',
      control: {
        type: 'text',
      },
    },
  },
  render: renderProbe,
  parameters: storySource(deployProbeSource),
};

export default meta;

type Story = StoryObj<DeployProbeArgs>;

export const DeployProbe: Story = {};
