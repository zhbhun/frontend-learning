import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFillStrokeShadow,
  type FillStrokeShadowInstance,
  type FillStrokeShadowOptions,
  type FillStrokeShadowSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createFillStrokeShadow,
  apply(instance: FillStrokeShadowInstance, args: FillStrokeShadowOptions) {
    instance.update(args);
  },
  readout(snapshot: FillStrokeShadowSnapshot) {
    return [
      ['fill 实际值', snapshot.fillValue],
      ['hasFill()', snapshot.hasFillLabel],
      ['外接框宽', snapshot.boundsWidth],
      ['整帧渲染次数', snapshot.renderCount],
      ['缓存位图重画', snapshot.cacheRepaints],
      ['阴影有效偏移 X', snapshot.shadowOffsetXLabel],
      ['opacity', snapshot.opacityLabel],
      ['混合模式', snapshot.composite],
    ];
  },
});

const meta = {
  id: 'fill-stroke-shadow',
  title: '图形与样式/样式/填充、描边与阴影',
  tags: ['!dev'],
  args: {
    fillMode: 'color',
    fillColor: '#f59e0b',
    fillAlpha: 1,
    paintFirst: 'fill',
    strokeWidth: 6,
    dashStyle: 'solid',
    lineCap: 'butt',
    lineJoin: 'miter',
    strokeUniform: false,
    objectScale: 1,
    shadowColor: 'rgba(0,0,0,0.45)',
    shadowBlur: 18,
    shadowOffsetX: 12,
    shadowOffsetY: 12,
    shadowNonScaling: false,
    opacity: 1,
    composite: 'source-over',
  },
  argTypes: {
    fillMode: {
      name: '填充形态',
      description:
        "fill 的取值形态：颜色、'transparent'（照常绘制但完全透明）或 null（跳过填充遍）。",
      control: {
        type: 'inline-radio',
        labels: { color: '颜色', transparent: "'transparent'", none: '无（null）' },
      },
      options: ['color', 'transparent', 'none'],
    },
    fillColor: {
      name: '填充颜色',
      description: '填充使用的 CSS 颜色（#rrggbb），仅「颜色」形态生效。',
      control: { type: 'color' },
    },
    fillAlpha: {
      name: '填充透明度',
      description:
        'Fabric 没有 fillOpacity：透明度写进颜色本身，与填充颜色合成 rgba，只淡填充。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    paintFirst: {
      name: '绘制顺序',
      description:
        "paintFirst：'fill' 先填充后描边（描边被盖一半）；'stroke' 描边垫底、完整宽度可见。",
      control: {
        type: 'inline-radio',
        labels: { fill: 'fill 先画', stroke: 'stroke 先画' },
      },
      options: ['fill', 'stroke'],
    },
    strokeWidth: {
      name: '描边宽度',
      description:
        'strokeWidth：沿轮廓居中绘制，一半扩到外接框外；设为 0 视觉上等效 stroke 为 null。',
      control: { type: 'range', min: 0, max: 24, step: 1 },
    },
    dashStyle: {
      name: '虚线样式',
      description: 'strokeDashArray：实线（null）/ 虚线 [12,8] / 点线 [1,11]（配圆头成圆点）。',
      control: {
        type: 'inline-radio',
        labels: { solid: '实线', dash: '虚线', dot: '点线' },
      },
      options: ['solid', 'dash', 'dot'],
    },
    lineCap: {
      name: '线端样式',
      description: 'strokeLineCap：作用于折线两端等开放端点；butt 不外伸。',
      control: {
        type: 'inline-radio',
        labels: { butt: 'butt 平头', round: 'round 圆头', square: 'square 方头' },
      },
      options: ['butt', 'round', 'square'],
    },
    lineJoin: {
      name: '拐角样式',
      description:
        'strokeLineJoin：作用于折线拐角；miter 的尖峰受 strokeMiterLimit（默认 4）截断。',
      control: {
        type: 'inline-radio',
        labels: { miter: 'miter 尖角', round: 'round 圆角', bevel: 'bevel 斜切' },
      },
      options: ['miter', 'round', 'bevel'],
    },
    strokeUniform: {
      name: '描边宽度锁定',
      description:
        'strokeUniform：默认关——描边随对象缩放变形；开启后屏幕上恒定像素宽，缩放不变形。',
      control: { type: 'boolean' },
    },
    objectScale: {
      name: '对象缩放',
      description: 'scaleX = scaleY：观察描边宽度、外接框与阴影偏移是否跟随缩放。',
      control: { type: 'range', min: 0.5, max: 3, step: 0.1 },
    },
    shadowColor: {
      name: '阴影颜色',
      description:
        'shadow.color：任意 CSS 颜色；带 alpha 的投影柔和，不透明色投影生硬。',
      control: {
        type: 'select',
        labels: {
          'rgba(0,0,0,0.45)': '半透明黑（默认档）',
          'rgba(0,0,0,0.12)': '更淡的黑',
          '#e11d48': '不透明红',
          'rgba(37,99,235,0.35)': '半透明蓝',
        },
      },
      options: [
        'rgba(0,0,0,0.45)',
        'rgba(0,0,0,0.12)',
        '#e11d48',
        'rgba(37,99,235,0.35)',
      ],
    },
    shadowBlur: {
      name: '阴影模糊',
      description: 'shadow.blur：模糊半径，渲染时还会乘上对象缩放（nonScaling 除外）。',
      control: { type: 'range', min: 0, max: 40, step: 1 },
    },
    shadowOffsetX: {
      name: '阴影偏移 X',
      description: 'shadow.offsetX：水平偏移，随对象缩放（nonScaling 除外），读数给出有效值。',
      control: { type: 'range', min: -30, max: 30, step: 1 },
    },
    shadowOffsetY: {
      name: '阴影偏移 Y',
      description: 'shadow.offsetY：垂直偏移，规则同 offsetX。',
      control: { type: 'range', min: -30, max: 30, step: 1 },
    },
    shadowNonScaling: {
      name: '阴影不随缩放',
      description:
        'shadow.nonScaling：默认关——偏移与模糊随对象缩放；开启后锁定，缩放对象阴影不变。',
      control: { type: 'boolean' },
    },
    opacity: {
      name: '整体透明度',
      description:
        'opacity：合成期作用于整个对象（填充、描边、阴影一起淡出），不重画对象缓存位图。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    composite: {
      name: '混合模式',
      description:
        'globalCompositeOperation：主矩形画上画布时如何与三色条纹（已有内容）合成。',
      control: {
        type: 'select',
        labels: {
          'source-over': 'source-over 常规覆盖（默认）',
          multiply: 'multiply 正片叠底',
          screen: 'screen 滤色',
          overlay: 'overlay 叠加',
          difference: 'difference 差值',
          lighter: 'lighter 提亮',
          'destination-out': 'destination-out 擦除底层',
        },
      },
      options: [
        'source-over',
        'multiply',
        'screen',
        'overlay',
        'difference',
        'lighter',
        'destination-out',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FillStrokeShadowOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
