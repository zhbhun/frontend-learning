import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPanConvert,
  createZoomPivot,
  type PanConvertInstance,
  type PanConvertOptions,
  type PanConvertSnapshot,
  type ZoomPivotInstance,
  type ZoomPivotOptions,
  type ZoomPivotSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface ViewportArgs extends ZoomPivotOptions, PanConvertOptions {}

const renderZoomPivot = canvasStory({
  create: createZoomPivot,
  apply(instance: ZoomPivotInstance, args: ViewportArgs) {
    instance.update(args);
  },
  readout(snapshot: ZoomPivotSnapshot) {
    return [
      ['缩放方式', snapshot.mode],
      ['viewportTransform', snapshot.vpt],
      ['getZoom()', snapshot.zoom],
      ['标记 场景坐标', snapshot.markerScene],
      ['标记 视口坐标', snapshot.markerViewport],
      ['左上角对应场景点', snapshot.topLeftScene],
    ];
  },
});

const renderPanConvert = canvasStory({
  create: createPanConvert,
  apply(instance: PanConvertInstance, args: ViewportArgs) {
    instance.update(args);
  },
  readout(snapshot: PanConvertSnapshot) {
    return [
      ['viewportTransform', snapshot.vpt],
      ['左上角对应场景点', snapshot.topLeftScene],
      ['标记 场景坐标', snapshot.markerScene],
      ['标记 视口坐标', snapshot.markerViewport],
      ['视口坐标 逆算回场景', snapshot.roundTrip],
    ];
  },
});

const meta = {
  id: 'viewport',
  title: '变换与组织/视口与坐标',
  tags: ['!dev'],
  render: renderZoomPivot,
  parameters: storySource(exampleSource),
} satisfies Meta<ViewportArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ZoomPivot: Story = {
  args: {
    zoomMode: 'marker',
    zoomLevel: 1.5,
  },
  argTypes: {
    zoomMode: {
      name: '缩放方式',
      description:
        'setZoom 等价 zoomToPoint(new Point(0, 0), z)，以视口左上角为不动点；zoomToPoint 的参数是视口坐标。',
      control: { type: 'inline-radio' },
      options: ['setZoom', 'center', 'marker'],
      labels: {
        setZoom: 'setZoom(左上角不动)',
        center: 'zoomToPoint(视口中心)',
        marker: 'zoomToPoint(标记点)',
      },
    },
    zoomLevel: {
      name: 'zoom 倍率',
      description:
        '目标缩放，1 为原始大小。三种方式在倍率 1 时结果一致；任何倍率下标记的场景坐标读数恒为 320, 180。',
      control: { type: 'range', min: 0.5, max: 2.5, step: 0.05 },
    },
  },
};

export const PanConvert: Story = {
  render: renderPanConvert,
  args: {
    panX: 160,
    panY: 90,
  },
  argTypes: {
    panX: {
      name: 'absolutePan 场景 X',
      description:
        '把该场景点送到视口左上角：vpt 读数的 e 恒等于 -X。拉到 320 时标记对象左上探出屏幕。',
      control: { type: 'range', min: 0, max: 320, step: 10 },
    },
    panY: {
      name: 'absolutePan 场景 Y',
      description: '同上，控制 vpt 的 f（恒等于 -Y）。',
      control: { type: 'range', min: 0, max: 180, step: 10 },
    },
  },
};
