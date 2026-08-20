import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import depthOrderSource from './depth-order.ts?raw';
import visualStateSource from './visual-state.ts?raw';
import {
  createDepthOrder,
  type DepthOrderInstance,
  type DepthOrderParams,
  type DepthOrderSnapshot,
  type OrderOp,
} from './depth-order';
import {
  createVisualState,
  type VisualStateInstance,
  type VisualStateParams,
  type VisualStateSnapshot,
} from './visual-state';

const ORDER_OP_OPTIONS: OrderOp[] = [
  'none',
  'a-to-top',
  'a-to-back',
  'a-above-b',
  'a-below-b',
];

const ORDER_OP_LABELS = new Map<OrderOp, string>([
  ['none', '无'],
  ['a-to-top', 'A.setToTop()'],
  ['a-to-back', 'A.setToBack()'],
  ['a-above-b', 'A.setAbove(B)'],
  ['a-below-b', 'A.setBelow(B)'],
]);

/** 数值读数统一保留两位小数,整数省去小数位。 */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const renderDepthOrder = canvasStory({
  create: createDepthOrder,
  apply(instance: DepthOrderInstance, args: DepthOrderParams) {
    instance.apply(args);
  },
  readout(snapshot: DepthOrderSnapshot) {
    return [
      ['渲染顺序(自下而上)', snapshot.renderOrder],
      ['画面最上层', snapshot.topName],
      [
        'depth A / B / C / D',
        `${snapshot.depthA} / ${snapshot.depthB} / ${snapshot.depthC} / ${snapshot.depthD}`,
      ],
      ['最近列表操作', snapshot.lastOp],
    ];
  },
  captions: ['depth 值优先', '同 depth 按列表顺序'],
});

const renderVisualState = canvasStory({
  create: createVisualState,
  apply(instance: VisualStateInstance, args: VisualStateParams) {
    instance.apply(args);
  },
  readout(snapshot: VisualStateSnapshot) {
    return [
      ['tint(tintTopLeft)', `${snapshot.tintHex}${snapshot.cornerTintActive ? '(四角各不同)' : ''}`],
      ['tintMode', `${snapshot.tintModeName}(${snapshot.tintModeValue})`],
      [
        'blendMode',
        snapshot.blendWebglMapped
          ? `${snapshot.blendModeName}(${snapshot.blendModeValue}),WebGL 有映射`
          : `${snapshot.blendModeName}(${snapshot.blendModeValue}),Canvas 专用:WebGL 下按 NORMAL 渲染`,
      ],
      [
        'alpha 对象 × 容器',
        `${num(snapshot.alphaSelf)} × ${num(snapshot.alphaContainer)} = ${num(snapshot.alphaEffective)}(有效)`,
      ],
    ];
  },
  captions: ['左:未施加状态的原纹理', '右:tint / alpha / blend mode'],
});

/** 两个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface DepthArgs extends DepthOrderParams, VisualStateParams {}

const meta: Meta<DepthArgs> = {
  id: 'depth',
  title: '资源与显示/深度与视觉状态',
  tags: ['!dev'],
  // 默认 render,同时为每个 story 的 args 提供类型锚点;各 story 覆盖为自己的 render
  render: renderDepthOrder,
};

export default meta;

type Story = StoryObj<DepthArgs>;

export const DepthOrderLab: Story = {
  args: {
    depthA: 0,
    depthB: 0,
    orderOp: 'none',
  },
  argTypes: {
    depthA: {
      name: 'A 的 depth',
      description: 'setDepth 值:数值大的盖住数值小的;改值只排队一次稳定重排。',
      control: { type: 'range', min: -3, max: 3, step: 1 },
    },
    depthB: {
      name: 'B 的 depth',
      description: '与 A 对照;C、D 固定 depth 0 作为参照组。',
      control: { type: 'range', min: -3, max: 3, step: 1 },
    },
    orderOp: {
      name: '列表位置操作',
      description:
        '只在切换时执行一次:挪显示列表数组位置,不改 depth 值;depth 不同的对象间不生效。',
      control: { type: 'select', options: ORDER_OP_OPTIONS },
      labels: ORDER_OP_LABELS as unknown as Record<string, string>,
    },
  },
  render: renderDepthOrder,
  parameters: storySource(depthOrderSource),
};

export const VisualStateLab: Story = {
  args: {
    tintMode: 'MULTIPLY',
    tintColor: '0xffffff',
    cornerTint: false,
    alpha: 1,
    containerAlpha: 1,
    blendMode: 'NORMAL',
  },
  argTypes: {
    tintMode: {
      name: 'tint 模式',
      description:
        'setTintMode:Phaser 4 颜色与模式分离;MULTIPLY 是默认乘法着色,FILL 替换填充(保留纹理 alpha)。',
      control: { type: 'select', options: ['MULTIPLY', 'FILL', 'ADD', 'SCREEN', 'OVERLAY'] },
    },
    tintColor: {
      name: 'tint 颜色',
      description: 'setTint 颜色;白 0xffffff 在 MULTIPLY 下等于无着色;四角渐变开启时忽略此项。',
      control: {
        type: 'select',
        options: ['0xffffff', '0xff4444', '0x44ff44', '0x4444ff', '0xffd24a'],
        labels: {
          '0xffffff': '白 0xffffff(无着色)',
          '0xff4444': '红 0xff4444',
          '0x44ff44': '绿 0x44ff44',
          '0x4444ff': '蓝 0x4444ff',
          '0xffd24a': '黄 0xffd24a',
        },
      },
    },
    cornerTint: {
      name: '四角渐变 tint',
      description: 'setTint(左上红, 右上绿, 左下蓝, 右下黄):颜色从角向中心插值。',
      control: { type: 'boolean' },
    },
    alpha: {
      name: '对象 alpha',
      description: 'setAlpha(0–1):对象自身不透明度,超出范围会被夹紧。',
      control: { type: 'range', min: 0.1, max: 1, step: 0.1 },
    },
    containerAlpha: {
      name: '容器 alpha',
      description: '主体所在容器的 alpha:渲染时与子对象 alpha 相乘,不改子对象属性。',
      control: { type: 'range', min: 0.2, max: 1, step: 0.1 },
    },
    blendMode: {
      name: '混合模式',
      description:
        'setBlendMode:WebGL 下仅 NORMAL/ADD/MULTIPLY/SCREEN/ERASE 有真实映射,其余 Canvas 专用。',
      control: {
        type: 'select',
        options: ['NORMAL', 'ADD', 'MULTIPLY', 'SCREEN', 'ERASE', 'OVERLAY'],
      },
    },
  },
  render: renderVisualState,
  parameters: storySource(visualStateSource),
};
