import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import compareSource from './graphics-vs-shape.ts?raw';
import commandsSource from './graphics-commands.ts?raw';
import gallerySource from './shape-gallery.ts?raw';
import bakeSource from './bake-texture.ts?raw';
import {
  createGraphicsVsShape,
  type CompareInstance,
  type CompareSnapshot,
} from './graphics-vs-shape';
import {
  createGraphicsCommands,
  COMMAND_SHAPE_LABELS,
  type CommandShapeKind,
  type CommandsInstance,
  type CommandsSnapshot,
} from './graphics-commands';
import {
  createShapeGallery,
  GALLERY_LABELS,
  type GalleryInstance,
  type GalleryKind,
  type GallerySnapshot,
} from './shape-gallery';
import {
  createBakeTexture,
  type BakeInstance,
  type BakeSnapshot,
} from './bake-texture';

/** 所有 Story 共用的可选输入;各 Story 只消费自己声明的子集 */
interface GraphicsArgs {
  fillColor?: number;
  strokeColor?: number;
  strokeWidth?: number;
  size?: number;
  sweepDegrees?: number;
  compareShape?: CommandShapeKind;
  galleryShape?: GalleryKind;
  filled?: boolean;
  stroked?: boolean;
  paintColor?: number;
  bakes?: number;
}

const FILL_COLORS = [
  { value: 0x2dd4bf, label: '青 0x2dd4bf' },
  { value: 0xfacc15, label: '黄 0xfacc15' },
  { value: 0xf87171, label: '红 0xf87171' },
  { value: 0x818cf8, label: '紫 0x818cf8' },
  { value: 0x4ade80, label: '绿 0x4ade80' },
];

const STROKE_COLORS = [
  { value: 0xe2e8f0, label: '浅白 0xe2e8f0' },
  { value: 0x0f172a, label: '深蓝 0x0f172a' },
  { value: 0xfbbf24, label: '橙 0xfbbf24' },
];

/** 颜色控件:options 传值数组,labels 把数字映射为可读文案 */
const colorControl = (colors: { value: number; label: string }[], name: string) =>
  ({
    name,
    control: { type: 'select' },
    options: colors.map((entry) => entry.value),
    labels: Object.fromEntries(
      colors.map((entry) => [entry.value, entry.label]),
    ) as Record<number, string>,
  }) as const;

const renderCompare = canvasStory({
  create: createGraphicsVsShape,
  apply(instance: CompareInstance, args: GraphicsArgs) {
    instance.update({
      fillColor: args.fillColor ?? 0x2dd4bf,
      strokeColor: args.strokeColor ?? 0xe2e8f0,
      strokeWidth: args.strokeWidth ?? 3,
      size: args.size ?? 64,
    });
  },
  readout(snapshot: CompareSnapshot) {
    return [
      ['Graphics 重画次数', snapshot.graphicsRedraws],
      ['Shape 重画次数', snapshot.shapeRedraws],
      ['命令缓冲长度', snapshot.commandBufferLength],
      ['游戏对象数(Graphics/Shape)', `${snapshot.graphicsObjectCount} / ${snapshot.shapeObjectCount}`],
      ['Shape fillColor', snapshot.shapeFillColor],
      ['Shape isFilled', snapshot.shapeIsFilled],
      ['Shape isStroked', snapshot.shapeIsStroked],
      ['Shape lineWidth', snapshot.shapeLineWidth],
    ];
  },
  captions: [
    '上:1 个 Graphics 画 3 块 | 下:3 个 add.rectangle 各自为对象',
    '同组参数驱动两条通路,只有机制读数不同',
  ],
});

const renderCommands = canvasStory({
  create: createGraphicsCommands,
  apply(instance: CommandsInstance, args: GraphicsArgs) {
    instance.update({
      shape: args.compareShape ?? 'rectangle',
      fillColor: args.fillColor ?? 0x2dd4bf,
      strokeColor: args.strokeColor ?? 0xe2e8f0,
      strokeWidth: args.strokeWidth ?? 3,
      size: args.size ?? 150,
      sweepDegrees: args.sweepDegrees ?? 270,
    });
  },
  readout(snapshot: CommandsSnapshot) {
    return [
      ['当前形状', snapshot.shape],
      ['命令缓冲长度', snapshot.commandBufferLength],
      ['绘制笔数(方法调用)', snapshot.drawCalls],
      ['重画次数', snapshot.redraws],
      ['扫过角度', snapshot.sweepNote],
    ];
  },
  captions: [
    '一支 Graphics 画笔在 8 种图形间整块重画',
    '「扫过角度」只在弧/扇形下生效',
  ],
});

const renderGallery = canvasStory({
  create: createShapeGallery,
  apply(instance: GalleryInstance, args: GraphicsArgs) {
    instance.update({
      shape: args.galleryShape ?? 'rectangle',
      filled: args.filled ?? true,
      stroked: args.stroked ?? true,
      fillColor: args.fillColor ?? 0x2dd4bf,
      strokeColor: args.strokeColor ?? 0xe2e8f0,
      strokeWidth: args.strokeWidth ?? 3,
      size: args.size ?? 150,
    });
  },
  readout(snapshot: GallerySnapshot) {
    return [
      ['当前成员', snapshot.shape],
      ['对象存在', snapshot.exists],
      ['isFilled', snapshot.isFilled],
      ['isStroked', snapshot.isStroked],
      ['fillColor', snapshot.fillColor],
      ['lineWidth', snapshot.lineWidth],
      ['原生尺寸 w × h', snapshot.nativeSize],
      ['显示尺寸', snapshot.displaySize],
      ['origin', snapshot.origin],
    ];
  },
  captions: [
    '七个 Shape 成员常驻,切换只是 setVisible',
    '填充与描边开关相互独立',
  ],
});

const renderBake = canvasStory({
  create: createBakeTexture,
  apply(instance: BakeInstance, args: GraphicsArgs) {
    instance.update({
      paintColor: args.paintColor ?? 0x2dd4bf,
      bakes: args.bakes ?? 0,
    });
  },
  readout(snapshot: BakeSnapshot) {
    return [
      ['画笔颜色', snapshot.paintColor],
      ['烘焙次数', snapshot.bakeCount],
      ['纹理存在', snapshot.textureExists],
      ['纹理源类型', snapshot.sourceType],
      ['纹理尺寸', snapshot.textureSize],
    ];
  },
  captions: [
    '左:Graphics 画笔(实时) | 右:烘焙纹理精灵(快照)',
    '重烘焙前先 textures.remove,避免命令叠加在旧画布上',
  ],
});

const meta: Meta<GraphicsArgs> = {
  id: 'graphics',
  title: '资源与显示/图形绘制',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderCompare,
};

export default meta;

type Story = StoryObj<GraphicsArgs>;

export const GraphicsVsShape: Story = {
  args: {
    fillColor: 0x2dd4bf,
    strokeColor: 0xe2e8f0,
    strokeWidth: 3,
    size: 64,
  },
  argTypes: {
    fillColor: {
      ...colorControl(FILL_COLORS, '填充色'),
      description: 'fillStyle(color, 1) 与 setFillStyle(color, 1) 同步生效。',
    },
    strokeColor: {
      ...colorControl(STROKE_COLORS, '描边色'),
      description: 'lineStyle(宽, color) 与 setStrokeStyle(宽, color) 同步生效。',
    },
    strokeWidth: {
      name: '描边宽',
      description: '同时进入 Graphics 的 lineStyle 与 Shape 的 setStrokeStyle。',
      control: { type: 'range', min: 0, max: 12, step: 1 },
    },
    size: {
      name: '尺寸',
      description:
        'Graphics 侧 clear 后按新宽高重画;Shape 侧只调 setSize(宽, 高)。',
      control: { type: 'range', min: 40, max: 110, step: 2 },
    },
  },
  parameters: storySource(compareSource),
  render: renderCompare,
};

export const GraphicsCommands: Story = {
  args: {
    compareShape: 'rectangle',
    fillColor: 0x2dd4bf,
    strokeColor: 0xe2e8f0,
    strokeWidth: 3,
    size: 150,
    sweepDegrees: 270,
  },
  argTypes: {
    compareShape: {
      name: '形状',
      description: '每次切换都 clear() 后整块重画为对应图形。',
      control: { type: 'radio' },
      options: Object.keys(COMMAND_SHAPE_LABELS),
      labels: COMMAND_SHAPE_LABELS as Record<string, string>,
    },
    fillColor: {
      ...colorControl(FILL_COLORS, '填充色'),
      description: 'fillStyle(color, 1);样式命令影响其后所有绘制。',
    },
    strokeColor: {
      ...colorControl(STROKE_COLORS, '描边色'),
      description: 'lineStyle(描边宽, color, 1)。',
    },
    strokeWidth: {
      name: '描边宽',
      description: '线宽进入 lineStyle;拖动时命令数不变,只有值变化。',
      control: { type: 'range', min: 0, max: 12, step: 1 },
    },
    size: {
      name: '尺寸',
      description: '整体缩放当前图形(椭圆固定 2:3 宽高比)。',
      control: { type: 'range', min: 60, max: 260, step: 10 },
    },
    sweepDegrees: {
      name: '扫过角度',
      description: '只作用于弧/扇形;内部用 Phaser.Math.DegToRad 换算成弧度。',
      control: { type: 'range', min: 30, max: 360, step: 15 },
    },
  },
  parameters: storySource(commandsSource),
  render: renderCommands,
};

export const ShapeGallery: Story = {
  args: {
    galleryShape: 'rectangle',
    filled: true,
    stroked: true,
    fillColor: 0x2dd4bf,
    strokeColor: 0xe2e8f0,
    strokeWidth: 3,
    size: 150,
  },
  argTypes: {
    galleryShape: {
      name: '形状',
      description: '七个工厂成员在同一中心切换,展示各自几何与专有 setter。',
      control: { type: 'radio' },
      options: Object.keys(GALLERY_LABELS),
      labels: GALLERY_LABELS as Record<string, string>,
    },
    filled: {
      name: '填充',
      description:
        'setFillStyle(color, 1) / 无参 setFillStyle() 对应开关;对 Line 无画面效果。',
      control: { type: 'boolean' },
    },
    stroked: {
      name: '描边',
      description: 'setStrokeStyle(宽, color, 1) / 无参 setStrokeStyle() 对应开关。',
      control: { type: 'boolean' },
    },
    fillColor: {
      ...colorControl(FILL_COLORS, '填充色'),
      description: '写入 fillColor,是否生效由 isFilled 决定。',
    },
    strokeColor: {
      ...colorControl(STROKE_COLORS, '描边色'),
      description: '写入 strokeColor,是否生效由 isStroked 决定。',
    },
    strokeWidth: {
      name: '描边宽',
      description: '写入 lineWidth;0 时描边消失但 isStroked 仍为 true。',
      control: { type: 'range', min: 0, max: 12, step: 1 },
    },
    size: {
      name: '尺寸',
      description:
        '按成员分发到专有 setter:setSize / setRadius / setTo / setInnerRadius 等。',
      control: { type: 'range', min: 60, max: 240, step: 10 },
    },
  },
  parameters: storySource(gallerySource),
  render: renderGallery,
};

export const BakeTexture: Story = {
  args: {
    paintColor: 0x2dd4bf,
    bakes: 0,
  },
  argTypes: {
    paintColor: {
      ...colorControl(FILL_COLORS, '画笔颜色'),
      description: '只重画左侧 Graphics;烘焙纹理不随之更新(快照语义)。',
    },
    bakes: {
      name: '重新烘焙',
      description: '每加一触发一次 remove + generateTexture,右侧精灵同步为新快照。',
      control: { type: 'range', min: 0, max: 9, step: 1 },
    },
  },
  parameters: storySource(bakeSource),
  render: renderBake,
};
