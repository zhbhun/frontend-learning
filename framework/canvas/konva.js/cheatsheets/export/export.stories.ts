import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExport,
  type ExportInstance,
  type ExportSnapshot,
} from './example';

interface ExportArgs {
  method: 'toCanvas' | 'toDataURL' | 'toImage' | 'toBlob';
  pixelRatio: number;
  mimeType: 'image/png' | 'image/jpeg';
  quality: number;
}

const renderInteractive = canvasStory({
  create: createExport,
  apply(instance: ExportInstance, args: ExportArgs) {
    instance.update(args);
  },
  readout(snapshot: ExportSnapshot) {
    return [
      ['导出方法', snapshot.method],
      ['产物类型', snapshot.typeName],
      ['调用方式', snapshot.async ? '异步 Promise' : '同步'],
      ['pixelRatio', `${snapshot.pixelRatio}×`],
      ['导出尺寸', `${snapshot.width} × ${snapshot.height}`],
      ['数据大小', snapshot.sizeLabel],
    ];
  },
  captions: ['源场景', '导出产物'],
});

const meta = {
  id: 'export',
  title: '数据与导出/导出',
  tags: ['!dev'],
  args: {
    method: 'toDataURL',
    pixelRatio: 2,
    mimeType: 'image/png',
    quality: 0.8,
  },
  argTypes: {
    method: {
      name: '导出方法',
      description:
        '四种方法共享同一导出引擎，区别只在产物：toCanvas / toDataURL 同步返回；toImage / toBlob 返回 Promise。',
      control: { type: 'radio' },
      options: ['toCanvas', 'toDataURL', 'toImage', 'toBlob'],
    },
    pixelRatio: {
      name: 'pixelRatio',
      description: '分辨率倍数。导出像素尺寸 = 节点尺寸 × pixelRatio；越大越清晰也越大。',
      control: { type: 'range', min: 1, max: 3, step: 1 },
    },
    mimeType: {
      name: '图片格式',
      description:
        'image/png 无损、支持透明；image/jpeg 有损、无透明（透明区域被填成黑色）。',
      control: { type: 'radio' },
      options: ['image/png', 'image/jpeg'],
    },
    quality: {
      name: 'JPEG 质量',
      description: '仅 image/jpeg 有效，取值 0–1；越小文件越小、画质越低。',
      control: { type: 'range', min: 0.1, max: 1, step: 0.1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExportArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
