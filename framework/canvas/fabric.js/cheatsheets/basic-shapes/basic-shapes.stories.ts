import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCircleRadius,
  createEllipseRadii,
  createLineStroke,
  createOriginAnchor,
  createPolyFamily,
  createRectCorners,
  createShapeGallery,
  type CircleRadiusInstance,
  type CircleRadiusOptions,
  type CircleRadiusSnapshot,
  type EllipseRadiiInstance,
  type EllipseRadiiOptions,
  type EllipseRadiiSnapshot,
  type LineStrokeInstance,
  type LineStrokeOptions,
  type LineStrokeSnapshot,
  type OriginAnchorInstance,
  type OriginAnchorOptions,
  type OriginAnchorSnapshot,
  type PolyFamilyInstance,
  type PolyFamilyOptions,
  type PolyFamilySnapshot,
  type RectCornerInstance,
  type RectCornerOptions,
  type RectCornerSnapshot,
  type ShapeGalleryInstance,
  type ShapeGalleryOptions,
  type ShapeGallerySnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface BasicShapesArgs
  extends ShapeGalleryOptions,
    OriginAnchorOptions,
    RectCornerOptions,
    CircleRadiusOptions,
    EllipseRadiiOptions,
    LineStrokeOptions,
    PolyFamilyOptions {}

const renderShapeGallery = canvasStory({
  create: createShapeGallery,
  apply(instance: ShapeGalleryInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: ShapeGallerySnapshot) {
    return [
      ['画布对象数', snapshot.objectCount],
      ['尺寸 width×height', snapshot.shapeSize],
      ['left / top', `${snapshot.objectLeft} / ${snapshot.objectTop}`],
      ['fill', snapshot.objectFill],
    ];
  },
});

const renderOriginAnchor = canvasStory({
  create: createOriginAnchor,
  apply(instance: OriginAnchorInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: OriginAnchorSnapshot) {
    return [
      ['originX', snapshot.originX],
      ['originY', snapshot.originY],
      ['left / top', `${snapshot.objectLeft} / ${snapshot.objectTop}`],
      ['中心点 x, y', snapshot.centerPoint],
    ];
  },
});

const renderRectCorners = canvasStory({
  create: createRectCorners,
  apply(instance: RectCornerInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: RectCornerSnapshot) {
    return [
      ['rx', snapshot.rx],
      ['ry', snapshot.ry],
      ['width×height', snapshot.size],
    ];
  },
});

const renderCircleRadius = canvasStory({
  create: createCircleRadius,
  apply(instance: CircleRadiusInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: CircleRadiusSnapshot) {
    return [
      ['radius', snapshot.radius],
      ['width = 2×radius', snapshot.width],
      ['height = 2×radius', snapshot.height],
      ['startAngle / endAngle', `${snapshot.startAngle} / ${snapshot.endAngle}`],
    ];
  },
});

const renderEllipseRadii = canvasStory({
  create: createEllipseRadii,
  apply(instance: EllipseRadiiInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: EllipseRadiiSnapshot) {
    return [
      ['rx', snapshot.rx],
      ['ry', snapshot.ry],
      ['width = 2×rx', snapshot.width],
      ['height = 2×ry', snapshot.height],
    ];
  },
});

const renderLineStroke = canvasStory({
  create: createLineStroke,
  apply(instance: LineStrokeInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: LineStrokeSnapshot) {
    return [
      ['端点 x1,y1 → x2,y2', snapshot.endpoints],
      ['width×height', `${snapshot.width}×${snapshot.height}`],
      ['中心 left, top', snapshot.position],
      ['stroke', snapshot.strokeState],
    ];
  },
});

const renderPolyFamily = canvasStory({
  create: createPolyFamily,
  apply(instance: PolyFamilyInstance, args: BasicShapesArgs) {
    instance.update(args);
  },
  readout(snapshot: PolyFamilySnapshot) {
    return [
      ['类型', snapshot.polyType],
      ['points 数量', snapshot.pointCount],
      ['width×height', snapshot.size],
    ];
  },
});

const meta = {
  id: 'basic-shapes',
  title: '图形与样式/图形/基础图形',
  tags: ['!dev'],
  render: renderShapeGallery,
  parameters: storySource(exampleSource),
} satisfies Meta<BasicShapesArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CreateShape: Story = {
  args: {
    shapeKind: 'rect',
    left: 320,
    top: 180,
    fill: '#4f7cff',
    opacity: 1,
    visible: true,
  },
  argTypes: {
    shapeKind: {
      name: '图形类型',
      description: '切换 7 个内置图形类：换类型即按各自的形状参数新建对象。',
      control: { type: 'inline-radio' },
      options: [
        'rect',
        'circle',
        'ellipse',
        'triangle',
        'line',
        'polyline',
        'polygon',
      ],
      labels: {
        rect: 'Rect',
        circle: 'Circle',
        ellipse: 'Ellipse',
        triangle: 'Triangle',
        line: 'Line',
        polyline: 'Polyline',
        polygon: 'Polygon',
      },
    },
    left: {
      name: 'left',
      description:
        '通用属性。originX/originY 默认 center：left/top 定位的是对象中心。',
      control: { type: 'range', min: 0, max: 640, step: 10 },
    },
    top: {
      name: 'top',
      description: '通用属性，与 left 同一套定位语义。',
      control: { type: 'range', min: 0, max: 360, step: 10 },
    },
    fill: {
      name: 'fill 填充色',
      description:
        '通用属性，默认 rgb(0,0,0)。Line 不渲染 fill，范例把它映射到 stroke。',
      control: { type: 'color' },
    },
    opacity: {
      name: 'opacity 不透明度',
      description: '通用属性，默认 1。',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    visible: {
      name: 'visible 可见',
      description: '通用属性，默认 true；false 时对象不参与渲染。',
      control: { type: 'boolean' },
    },
  },
};

export const OriginAnchor: Story = {
  render: renderOriginAnchor,
  args: {
    anchorOriginX: 'center',
    anchorOriginY: 'center',
    anchorLeft: 320,
    anchorTop: 180,
  },
  argTypes: {
    anchorOriginX: {
      name: 'originX',
      description:
        "定位基准：'center' 表示 left 对准中心，'left' 表示对准左边缘。v7 起默认 'center'。",
      control: { type: 'inline-radio' },
      options: ['center', 'left'],
      labels: { center: "'center'", left: "'left'" },
    },
    anchorOriginY: {
      name: 'originY',
      description: "定位基准：'center' 或 'top'，与 originX 同一套语义。",
      control: { type: 'inline-radio' },
      options: ['center', 'top'],
      labels: { center: "'center'", top: "'top'" },
    },
    anchorLeft: {
      name: 'left',
      description: '锚点 x（红点位置）；切 origin 时它的画布坐标不变。',
      control: { type: 'range', min: 80, max: 560, step: 10 },
    },
    anchorTop: {
      name: 'top',
      description: '锚点 y（红点位置）。',
      control: { type: 'range', min: 80, max: 280, step: 10 },
    },
  },
};

export const RectCorners: Story = {
  render: renderRectCorners,
  args: { rectRx: 30, rectRy: 30 },
  argTypes: {
    rectRx: {
      name: 'rx 水平圆角',
      description:
        '默认 0。构造时只给 rx 不给 ry，ry 会取 rx 的值；渲染时钳制在 width/2 内。',
      control: { type: 'range', min: 0, max: 130, step: 1 },
    },
    rectRy: {
      name: 'ry 垂直圆角',
      description: '默认 0，独立于 rx 变化。',
      control: { type: 'range', min: 0, max: 130, step: 1 },
    },
  },
};

export const CircleRadius: Story = {
  render: renderCircleRadius,
  args: { circleRadius: 62, startAngle: 0, endAngle: 360 },
  argTypes: {
    circleRadius: {
      name: 'radius 半径',
      description:
        '默认 0。Circle 不用 width/height：改 radius 会同步派生 width = height = 2×radius。',
      control: { type: 'range', min: 0, max: 95, step: 1 },
    },
    startAngle: {
      name: 'startAngle 起始角',
      description: '默认 0（度）。与 endAngle 配合把圆切成弧 / 扇形。',
      control: { type: 'range', min: 0, max: 360, step: 1 },
    },
    endAngle: {
      name: 'endAngle 结束角',
      description: '默认 360（度），完整圆。',
      control: { type: 'range', min: 0, max: 360, step: 1 },
    },
  },
};

export const EllipseRadii: Story = {
  render: renderEllipseRadii,
  args: { ellipseRx: 80, ellipseRy: 50 },
  argTypes: {
    ellipseRx: {
      name: 'rx 水平半径',
      description:
        '默认 0。rx/ry 是椭圆的两个半径（不是 Rect 的圆角），派生 width = 2×rx。',
      control: { type: 'range', min: 0, max: 110, step: 1 },
    },
    ellipseRy: {
      name: 'ry 垂直半径',
      description: '默认 0，派生 height = 2×ry。',
      control: { type: 'range', min: 0, max: 110, step: 1 },
    },
  },
};

export const LineStroke: Story = {
  render: renderLineStroke,
  args: { lineStroked: true, lineX2: 320 },
  argTypes: {
    lineStroked: {
      name: 'stroke 描边',
      description:
        'Line 只渲染 stroke：关掉（置 null）后线段不可见，fill 无法替代。',
      control: { type: 'boolean' },
    },
    lineX2: {
      name: 'x2 终点 x',
      description:
        '改动触发内部重算：width = |x2 − x1|，位置取两端点包围盒中心。',
      control: { type: 'range', min: 120, max: 430, step: 1 },
    },
  },
};

export const PolyFamily: Story = {
  render: renderPolyFamily,
  args: { polyClosed: false, polyPreset: 'chevron' },
  argTypes: {
    polyClosed: {
      name: '闭合（Polygon）',
      description:
        'false 为 Polyline（开放折线，填充按弦闭合）；true 换成 Polygon，轮廓自动闭合。',
      control: { type: 'boolean' },
    },
    polyPreset: {
      name: '点集预设',
      description: '换一组 points：尺寸与位置由点集包围盒重新派生。',
      control: { type: 'inline-radio' },
      options: ['chevron', 'star'],
      labels: { chevron: '折线组', star: '五角星' },
    },
  },
};
