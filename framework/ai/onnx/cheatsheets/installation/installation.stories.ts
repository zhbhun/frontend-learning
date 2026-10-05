import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import envCheckSource from './env-check.ts?raw';
import {
  createEnvCheck,
  type EnvCheckInstance,
  type EnvCheckSnapshot,
} from './env-check';

interface EnvCheckArgs {
  expectedVersion: string;
}

const renderEnvCheck = canvasStory({
  create: createEnvCheck,
  apply(instance: EnvCheckInstance, args: EnvCheckArgs) {
    instance.update(args);
  },
  readout(snapshot: EnvCheckSnapshot) {
    return [
      ['运行时版本', snapshot.runtimeVersion],
      ['版本对齐', snapshot.alignmentLabel],
      ['WebGPU 适配器', snapshot.webgpuLabel],
      ['跨域隔离', snapshot.isolationLabel],
      ['逻辑核数', snapshot.hardwareConcurrency],
    ];
  },
});

const meta = {
  id: 'installation',
  title: '上手/安装与导入',
  tags: ['!dev'],
  args: {
    expectedVersion: '1.30.0',
  },
  argTypes: {
    expectedVersion: {
      name: '期望版本',
      description: '读者预期安装的 onnxruntime-web 版本号，实例用它与运行时版本比对。',
      control: {
        type: 'text',
      },
    },
  },
  render: renderEnvCheck,
  parameters: storySource(envCheckSource),
} satisfies Meta<EnvCheckArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EnvCheck: Story = {};
