import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import sourceCode from './surface-sources.ts?raw';
import {
  createSurfaceSources,
  type SurfaceSource,
  type SurfaceSourcesInstance,
  type SurfaceSourcesSnapshot,
} from './surface-sources';

interface SurfaceArgs {
  source: SurfaceSource;
}

const renderSources = canvasStory({
  create: createSurfaceSources,
  apply(instance: SurfaceSourcesInstance, args: SurfaceArgs) {
    instance.update(args);
  },
  readout(snapshot: SurfaceSourcesSnapshot) {
    return [
      ['创建通道', snapshot.createChannel],
      ['autoResize', snapshot.autoResize],
      ['主进程引用', snapshot.mainProcessRef],
      ['resize 驱动', snapshot.resizeDriver],
      ['销毁', snapshot.teardown],
    ];
  },
});

const meta = {
  id: 'webgpu',
  title: '进阶/WebGPU 与 3D 适配器',
  tags: ['!dev'],
  args: {
    source: 'gpu-window',
  },
  argTypes: {
    source: {
      name: '表面来源',
      description:
        '原生 GPU 表面（WGPUView）的三种创建途径；切换后创建、同步与销毁链路随之变化。',
      options: ['gpu-window', 'wgpu-tag', 'manual'],
      control: {
        type: 'inline-radio',
        labels: {
          'gpu-window': 'GpuWindow 独立窗口',
          'wgpu-tag': 'webview 内 wgpu 标签',
          manual: '手动 new WGPUView',
        },
      },
    },
  },
  render: renderSources,
  parameters: storySource(sourceCode),
} satisfies Meta<SurfaceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SurfaceSources: Story = {};
