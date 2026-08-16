import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExportLab,
  type ExportInstance,
  type ExportOptions,
  type ExportSnapshot,
} from './example';

const renderExportLab = canvasStory({
  create: createExportLab,
  apply(instance: ExportInstance, args: ExportOptions) {
    instance.update(args);
  },
  readout(snapshot: ExportSnapshot) {
    return [
      ['导出目标', snapshot.targetLabel],
      ['导出尺寸', snapshot.sizeLabel],
      ['实际格式', snapshot.mimeLabel],
      ['dataURL 长度', snapshot.lengthLabel],
      ['导出耗时', snapshot.durationLabel],
      ['缓冲内存', snapshot.memoryLabel],
      ['倍率构成', snapshot.scaleLabel],
    ];
  },
});

const meta = {
  id: 'export',
  title: '数据与导出/图片导出',
  tags: ['!dev'],
  render: renderExportLab,
  parameters: storySource(exampleSource),
} satisfies Meta<ExportOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ExportLab: Story = {
  args: {
    format: 'png',
    quality: 1,
    multiplier: 1,
    retina: false,
    crop: 'full',
    zoom: 1,
    target: 'canvas',
    live: true,
  },
  argTypes: {
    format: {
      name: '导出格式 format',
      description:
        'toDataURL 的 format 选项：png（默认，无损、保留透明）/ jpeg（有损，透明区被合成到黑色）/ webp（看浏览器支持，不支持时静默回退 png——读数「实际格式」直接核对回退结果）。',
      control: { type: 'select', options: ['png', 'jpeg', 'webp'] },
    },
    quality: {
      name: '质量 quality',
      description:
        '0–1，只对 jpeg / webp 这类有损格式有效：切到 jpeg 后调低质量，读数「dataURL 长度」明显下降；png 档下长度几乎不动（无损编码忽略 quality）。',
      control: { type: 'range', min: 0.1, max: 1, step: 0.05 },
    },
    multiplier: {
      name: '倍率 multiplier',
      description:
        '导出尺寸的放大系数（默认 1）：读数「导出尺寸」「缓冲内存」按倍率上涨（内存 = 宽×高×4，随倍率平方增长）。',
      control: { type: 'range', min: 1, max: 4, step: 1 },
    },
    retina: {
      name: 'retina 高清导出 enableRetinaScaling',
      description:
        '导出选项（默认 false，与画布实例的同名属性默认 true 是两回事）：开启后额外乘 devicePixelRatio——读数「倍率构成」与「导出尺寸」同步变化。',
      control: { type: 'boolean' },
    },
    crop: {
      name: '裁剪窗口',
      description:
        'toDataURL 的 left/top/width/height 预设（视口像素）：导出尺寸 = 窗口 × 倍率；「视口缩放」非 1 时同一窗口裁到的场景内容随之变化。',
      control: {
        type: 'select',
        options: ['full', 'left-top', 'center'],
        labels: { full: '完整画布', 'left-top': '左上四分之一', center: '中心窗口' },
      },
    },
    zoom: {
      name: '视口缩放 zoom',
      description:
        '改写 viewportTransform：画布显示与导出预览同步缩放，而「导出尺寸」不变——vpt 参与导出（所见即所得）的直接证据。',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
    },
    target: {
      name: '导出目标',
      description:
        '整块画布走 canvas.toDataURL；选中对象走对象级 toDataURL（先在画布上点选一个对象）：导出尺寸变成对象包围盒、jpeg 底色自动变白、预览中永远没有控件。',
      control: {
        type: 'select',
        options: ['canvas', 'object'],
        labels: { canvas: '整块画布', object: '选中对象' },
      },
    },
    live: {
      name: '执行导出',
      description:
        '开：任何参数变化、选中变化或拖动对象后 30ms 内自动重新导出；关：停止重新导出，读数与预览停在最后一次结果。',
      control: { type: 'boolean' },
    },
  },
};
