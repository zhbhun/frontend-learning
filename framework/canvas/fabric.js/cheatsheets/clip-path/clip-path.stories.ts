import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCanvasClipLab,
  createClipShapeLab,
  type CanvasClipLabInstance,
  type CanvasClipLabOptions,
  type CanvasClipLabSnapshot,
  type ClipShapeLabInstance,
  type ClipShapeLabOptions,
  type ClipShapeLabSnapshot,
} from './example';

/** 本课全部控件的合集；每个 story 只在自己的 argTypes 里声明所用子集 */
export interface ClipPathArgs
  extends ClipShapeLabOptions,
    CanvasClipLabOptions {}

const renderClipShapeLab = canvasStory({
  create: createClipShapeLab,
  apply(instance: ClipShapeLabInstance, args: ClipPathArgs) {
    instance.update({
      clipShape: args.clipShape,
      absolutePositioned: args.absolutePositioned,
      inverted: args.inverted,
      clipSize: args.clipSize,
      clipAngle: args.clipAngle,
      clipOffsetX: args.clipOffsetX,
      mutateInPlace: args.mutateInPlace,
      markDirty: args.markDirty,
    });
  },
  readout(snapshot: ClipShapeLabSnapshot) {
    return [
      ['遮罩', snapshot.maskLabel],
      ['absolutePositioned', snapshot.positionModeLabel],
      ['inverted', snapshot.invertLabel],
      ['遮罩中心', snapshot.maskCenterLabel],
      ['更新方式', snapshot.updateModeLabel],
      ['缓存位图重画', snapshot.cacheRepaints],
      ['toObject().clipPath', snapshot.serializedLabel],
    ];
  },
});

const renderCanvasClipLab = canvasStory({
  create: createCanvasClipLab,
  apply(instance: CanvasClipLabInstance, args: ClipPathArgs) {
    instance.update({
      canvasClipShape: args.canvasClipShape,
      canvasClipSize: args.canvasClipSize,
      canvasClipOffsetX: args.canvasClipOffsetX,
      canvasClipOffsetY: args.canvasClipOffsetY,
      canvasInverted: args.canvasInverted,
      viewportZoom: args.viewportZoom,
    });
  },
  readout(snapshot: CanvasClipLabSnapshot) {
    return [
      ['画布遮罩', snapshot.clipLabel],
      ['遮罩中心', snapshot.clipCenterLabel],
      ['inverted', snapshot.invertedLabel],
      ['viewportTransform[0]', snapshot.zoomLabel],
      ['toObject().clipPath', snapshot.serializedLabel],
    ];
  },
});

const meta = {
  id: 'clip-path',
  title: '图形与样式/文本与图片/裁剪与遮罩',
  tags: ['!dev'],
  render: renderClipShapeLab,
  parameters: storySource(exampleSource),
} satisfies Meta<ClipPathArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ClipShapeLab: Story = {
  args: {
    clipShape: 'circle',
    absolutePositioned: false,
    inverted: false,
    clipSize: 64,
    clipAngle: 0,
    clipOffsetX: 0,
    mutateInPlace: false,
    markDirty: false,
  },
  argTypes: {
    clipShape: {
      name: '遮罩形状',
      description:
        'clipPath 可以是任意 FabricObject，这里切换三种基础图形对照可见区域轮廓（遮罩只取几何，与颜色无关）。',
      control: {
        type: 'inline-radio',
        labels: { circle: 'Circle 圆', rect: 'Rect 矩形', triangle: 'Triangle 三角' },
      },
      options: ['circle', 'rect', 'triangle'],
    },
    absolutePositioned: {
      name: '绝对定位 absolutePositioned',
      description:
        '遮罩自身的 absolutePositioned：false = 宿主局部坐标（原点在宿主几何中心，窗口贴花式跟随宿主）；true = 画布场景坐标（窗口固定在画布上，内容在窗口下滑动，宿主缓存每帧重画）。',
      control: { type: 'boolean' },
    },
    inverted: {
      name: '反转裁剪 inverted',
      description:
        '遮罩自身的 inverted：false 裁内（destination-in，只留重叠处）；true 裁外（destination-out，挖掉重叠处）。',
      control: { type: 'boolean' },
    },
    clipSize: {
      name: '遮罩尺寸',
      description: 'circle 的半径；rect / triangle 的基准边长（宽高按固定比例换算）。',
      control: { type: 'range', min: 24, max: 96, step: 8 },
    },
    clipAngle: {
      name: '遮罩角度',
      description: '遮罩自身 angle：绕遮罩中心旋转轮廓（rect / triangle 上效果最明显）。',
      control: { type: 'range', min: 0, max: 360, step: 15 },
    },
    clipOffsetX: {
      name: '遮罩横向偏移',
      description:
        '遮罩 left：默认模式下是相对宿主几何中心的局部坐标；绝对定位模式下叠加在画布场景锚点上（两种解释见读数「遮罩中心」）。',
      control: { type: 'range', min: -140, max: 140, step: 10 },
    },
    mutateInPlace: {
      name: '就地修改',
      description:
        '开启后不换实例、原地改遮罩属性——宿主的 set 缺席，缓存位图不重画，画面停在旧窗口。',
      control: { type: 'boolean' },
    },
    markDirty: {
      name: '手动置 dirty',
      description:
        "配合「就地修改」：host.set('dirty', true) 强制下一帧重画宿主缓存位图，画面追上实例状态。",
      control: { type: 'boolean' },
    },
  },
};

export const CanvasClipLab: Story = {
  render: renderCanvasClipLab,
  args: {
    canvasClipShape: 'circle',
    canvasClipSize: 104,
    canvasClipOffsetX: 0,
    canvasClipOffsetY: 0,
    canvasInverted: false,
    viewportZoom: 1,
  },
  argTypes: {
    canvasClipShape: {
      name: '遮罩形状',
      description:
        'canvas.clipPath 同样只取几何；窗口限制的是整块画布内容（背景色、全部对象、控件）。',
      control: {
        type: 'inline-radio',
        labels: { circle: 'Circle 圆', rect: 'Rect 矩形' },
      },
      options: ['circle', 'rect'],
    },
    canvasClipSize: {
      name: '遮罩尺寸',
      description: 'circle 的半径；rect 的基准边长（宽高按固定比例换算）。',
      control: { type: 'range', min: 48, max: 144, step: 8 },
    },
    canvasClipOffsetX: {
      name: '遮罩横向偏移',
      description:
        '画布级遮罩的 left：场景坐标，原点固定在画布左上角（画布级没有 absolutePositioned 开关）。',
      control: { type: 'range', min: -120, max: 120, step: 10 },
    },
    canvasClipOffsetY: {
      name: '遮罩纵向偏移',
      description: '画布级遮罩的 top：场景坐标。',
      control: { type: 'range', min: -80, max: 80, step: 10 },
    },
    canvasInverted: {
      name: '反转裁剪 inverted（画布级无效）',
      description:
        '画布级渲染恒 destination-in，inverted 不生效——切换开关画面不变即是证据；裁外要用带洞形状或对象级遮罩。',
      control: { type: 'boolean' },
    },
    viewportZoom: {
      name: '视口缩放',
      description:
        'canvas.setZoom：画布级遮罩跟随 viewportTransform，缩放时窗口与内容一起变换（视口机制见「视口与坐标」课）。',
      control: { type: 'range', min: 0.5, max: 2, step: 0.25 },
    },
  },
};
