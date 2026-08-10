import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExportDemo,
  type ExportDemoInstance,
  type ExportDemoSnapshot,
} from './example';

interface ExportDemoArgs {
  shape: 'rect' | 'ellipse' | 'star' | 'polygon';
  count: number;
  pixelRatio: number;
}

const renderInteractive = canvasStory({
  create: createExportDemo,
  apply(instance: ExportDemoInstance, args: ExportDemoArgs) {
    instance.update(args);
  },
  readout(snapshot: ExportDemoSnapshot) {
    return [
      ['JSON 字符数', snapshot.jsonChars],
      ['导出 PNG', snapshot.imagePixels],
      ['SVG 路径', snapshot.svgChars],
      ['SVG 示例', snapshot.svgPreview],
    ];
  },
});

const meta = {
  id: 'export',
  title: '进阶与工程/导出',
  tags: ['!dev'],
  args: {
    shape: 'star',
    count: 3,
    pixelRatio: 2,
  },
  argTypes: {
    shape: {
      name: '形状',
      description:
        '场景中元素的类型（决定 toJSON 里的 tag 与 getPathString 生成的 SVG 路径）。切换后 JSON 的子节点 tag 和 SVG 路径同步变化。',
      control: {
        type: 'select',
      },
      options: ['rect', 'ellipse', 'star', 'polygon'],
      labels: {
        rect: '矩形 Rect',
        ellipse: '椭圆 Ellipse',
        star: '星形 Star',
        polygon: '多边形 Polygon',
      },
    },
    count: {
      name: '元素数量',
      description:
        '场景中的元素个数。toJSON 递归序列化所有子节点，数量越大 JSON 字符数越多。',
      control: {
        type: 'range',
        min: 1,
        max: 6,
        step: 1,
      },
    },
    pixelRatio: {
      name: '导出像素比',
      description:
        "传给 export('png', { pixelRatio }) 的像素比。导出图片的物理像素 = 逻辑尺寸 × 像素比，调大后读数里的「导出 PNG」宽高成比例增长。",
      control: {
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExportDemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
