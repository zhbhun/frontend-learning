import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTransformScene,
  type TransformInstance,
  type TransformSnapshot,
  type AroundOption,
} from './example';

interface TransformArgs {
  rotation: number;
  scale: number;
  skewX: number;
  around: AroundOption;
}

const renderInteractive = canvasStory({
  create: createTransformScene,
  apply(instance: TransformInstance, args: TransformArgs) {
    instance.update(args);
  },
  readout(snapshot: TransformSnapshot) {
    return [
      ['变换中心 (around)', `${snapshot.pivotX}, ${snapshot.pivotY}`],
      ['左上角 (世界)', `${snapshot.topLeftX}, ${snapshot.topLeftY}`],
      ['世界包围盒', `${snapshot.worldW} × ${snapshot.worldH}`],
      ['变换值', `${snapshot.rotation}° / ${snapshot.scale}× / ${snapshot.skewX}°`],
    ];
  },
});

const meta = {
  id: 'transform',
  title: '变换与布局/变换',
  tags: ['!dev'],
  args: {
    rotation: 30,
    scale: 1,
    skewX: 0,
    around: 'center',
  },
  argTypes: {
    rotation: {
      name: '旋转角度',
      description: 'rotation：以 around 锚点为中心旋转的角度（度）。',
      control: {
        type: 'range',
        min: 0,
        max: 360,
        step: 5,
      },
    },
    scale: {
      name: '统一缩放',
      description: '同时设置 scaleX 与 scaleY 的统一缩放倍数。',
      control: {
        type: 'range',
        min: 0.5,
        max: 1.5,
        step: 0.1,
      },
    },
    skewX: {
      name: 'X 斜切',
      description: 'skewX：沿 X 轴的斜切角度（度）。',
      control: {
        type: 'range',
        min: -40,
        max: 40,
        step: 5,
      },
    },
    around: {
      name: '锚点 around',
      description:
        '同时充当变换中心与定位锚点：把这个点钉在声明的 x/y 上，旋转/缩放绕它进行。',
      control: { type: 'select' },
      options: ['top-left', 'center', 'bottom-right'],
      labels: {
        'top-left': '左上角',
        center: '中心',
        'bottom-right': '右下角',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TransformArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
