import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createViewScene,
  type ViewControlInstance,
  type ViewControlSnapshot,
  type ViewAction,
} from './example';

interface ViewControlArgs {
  scale: number;
  pan: boolean;
  wheelZoom: boolean;
  action: ViewAction;
}

const renderInteractive = canvasStory({
  create: createViewScene,
  apply(instance: ViewControlInstance, args: ViewControlArgs) {
    instance.update(args);
  },
  readout(snapshot: ViewControlSnapshot) {
    return [
      ['视图缩放', `${snapshot.scale}×`],
      ['视口偏移', `${snapshot.offsetX}, ${snapshot.offsetY}`],
      ['拖拽平移', snapshot.pan ? '开' : '关'],
      ['滚轮缩放', snapshot.wheelZoom ? '开' : '关'],
    ];
  },
});

const meta = {
  id: 'view-control',
  title: '交互与事件/视图控制',
  tags: ['!dev'],
  args: {
    scale: 1,
    pan: true,
    wheelZoom: true,
    action: 'none',
  },
  argTypes: {
    scale: {
      name: '视图缩放',
      description:
        'leafer.zoom(数字)：把视图缩放设为该绝对值（以画布中心为轴），超出 zoom.min / zoom.max 会被钳制。',
      control: {
        type: 'range',
        min: 0.25,
        max: 4,
        step: 0.25,
      },
    },
    pan: {
      name: '拖拽平移',
      description:
        '开关「拖拽平移」handler：开 = 按住拖动把位移累加进 zoomLayer.x/y；关 = 不响应拖拽。把鼠标移到画布上按住拖动试用。',
      control: { type: 'boolean' },
    },
    wheelZoom: {
      name: '滚轮缩放',
      description:
        '开关「滚轮缩放」handler：开 = 滚轮以光标为中心改 zoomLayer.scaleX/Y；关 = 不响应滚轮。把鼠标移到画布上滚动试用。',
      control: { type: 'boolean' },
    },
    action: {
      name: '视图动作',
      description:
        '一次性动作：适应视图 = leafer.zoom("fit") 把所有内容居中适配；还原 1:1 = leafer.zoom(1)。',
      control: { type: 'select' },
      options: ['none', 'fit', 'reset'],
      labels: {
        none: '无',
        fit: '适应视图 fit',
        reset: '还原 1:1',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ViewControlArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
