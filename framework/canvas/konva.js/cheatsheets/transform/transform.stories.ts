import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPlayground,
  type TransformInstance,
  type TransformSnapshot,
  createStacking,
  type StackingInstance,
  type StackingSnapshot,
} from './example';

interface PlaygroundArgs {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  offsetX: number;
  offsetY: number;
}

interface StackingArgs {
  mainOnTop: boolean;
}

const renderPlayground = canvasStory({
  create: createPlayground,
  apply(instance: TransformInstance, args: PlaygroundArgs) {
    instance.update(args);
  },
  readout(snapshot: TransformSnapshot) {
    return [
      ['位置 x, y', `${snapshot.x}, ${snapshot.y}`],
      ['旋转 °', snapshot.rotation],
      ['缩放 ×', `${snapshot.scaleX} × ${snapshot.scaleY}`],
      ['偏斜 skew', `${snapshot.skewX}, ${snapshot.skewY}`],
      ['原点 offset', `${snapshot.offsetX}, ${snapshot.offsetY}`],
    ];
  },
});

const renderStacking = canvasStory({
  create: createStacking,
  apply(instance: StackingInstance, args: StackingArgs) {
    instance.update(args);
  },
  readout(snapshot: StackingSnapshot) {
    return [
      ['主形状 zIndex', snapshot.mainZ],
      ['参考形状 zIndex', snapshot.otherZ],
      ['当前在前', snapshot.front],
    ];
  },
});

const meta = {
  id: 'transform',
  title: '变换与组织/变换',
  tags: ['!dev'],
  parameters: storySource(exampleSource),
} satisfies Meta;

export default meta;

/**
 * 仿射变换playground：九个控件驱动一个矩形的全部变换属性。
 * 橙色枢轴 + 灰色参照框让「围绕枢轴变换」直接可见。
 */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    x: 170,
    y: 110,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
  },
  argTypes: {
    x: {
      name: '位置 x',
      description: 'x：变换枢轴的横坐标。矩形把它当作左上角。',
      control: { type: 'range', min: 20, max: 540, step: 2 },
    },
    y: {
      name: '位置 y',
      description: 'y：变换枢轴的纵坐标。',
      control: { type: 'range', min: 20, max: 320, step: 2 },
    },
    rotation: {
      name: '旋转 °',
      description: 'rotation：默认以度为单位（Konva.angleDeg 默认 true）。',
      control: { type: 'range', min: -180, max: 180, step: 1 },
    },
    scaleX: {
      name: '缩放 scaleX',
      description: 'scaleX：负值水平翻转。缩放围绕枢轴发生。',
      control: { type: 'range', min: -2, max: 2, step: 0.1 },
    },
    scaleY: {
      name: '缩放 scaleY',
      description: 'scaleY：负值垂直翻转。',
      control: { type: 'range', min: -2, max: 2, step: 0.1 },
    },
    skewX: {
      name: '偏斜 skewX',
      control: { type: 'range', min: -2, max: 2, step: 0.1 },
    },
    skewY: {
      name: '偏斜 skewY',
      control: { type: 'range', min: -2, max: 2, step: 0.1 },
    },
    offsetX: {
      name: '原点 offsetX',
      description:
        'offsetX：把形体的这个局部点钉到枢轴 (x,y)，即旋转 / 缩放 / 偏斜的支点。',
      control: { type: 'range', min: 0, max: 120, step: 2 },
    },
    offsetY: {
      name: '原点 offsetY',
      control: { type: 'range', min: 0, max: 80, step: 2 },
    },
  },
  render: renderPlayground,
};

/**
 * 层级：两个重叠矩形，切换 mainOnTop 调用 moveToTop / moveToBottom。
 */
export const Stacking: StoryObj<StackingArgs> = {
  args: {
    mainOnTop: true,
  },
  argTypes: {
    mainOnTop: {
      name: '主形状置顶',
      description: 'true 调用 moveToTop()，false 调用 moveToBottom()。',
      control: 'boolean',
    },
  },
  render: renderStacking,
};
