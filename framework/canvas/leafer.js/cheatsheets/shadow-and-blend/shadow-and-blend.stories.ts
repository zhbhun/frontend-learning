import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createVisualEffect,
  type VisualEffectInstance,
  type VisualEffectSnapshot,
  type BlendModeOption,
  type InnerShadowPreset,
} from './example';

interface VisualEffectArgs {
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  innerShadow: InnerShadowPreset;
  blendMode: BlendModeOption;
  opacity: number;
}

const renderInteractive = canvasStory({
  create: createVisualEffect,
  apply(instance: VisualEffectInstance, args: VisualEffectArgs) {
    instance.update(args);
  },
  readout(snapshot: VisualEffectSnapshot) {
    return [
      ['外阴影', snapshot.shadow],
      ['内阴影', snapshot.innerShadow],
      ['混合模式', snapshot.blendMode],
      ['透明度', snapshot.opacity],
    ];
  },
});

const meta = {
  id: 'shadow-and-blend',
  title: '图形与样式/视觉效果',
  tags: ['!dev'],
  args: {
    shadowX: 12,
    shadowY: 10,
    shadowBlur: 22,
    innerShadow: 'soft',
    blendMode: 'pass-through',
    opacity: 1,
  },
  argTypes: {
    shadowX: {
      name: '阴影 X shadowX',
      description:
        '外阴影的水平偏移（ShadowEffect.x）。正值右移、负值左移；与 shadowY、shadowBlur 共同决定外阴影的形态。',
      control: {
        type: 'range',
        min: -40,
        max: 40,
        step: 1,
      },
    },
    shadowY: {
      name: '阴影 Y shadowY',
      description:
        '外阴影的垂直偏移（ShadowEffect.y）。正值下移、负值上移。',
      control: {
        type: 'range',
        min: -40,
        max: 40,
        step: 1,
      },
    },
    shadowBlur: {
      name: '阴影模糊 blur',
      description:
        '外阴影的模糊半径（ShadowEffect.blur）。0 为硬边，越大越柔和。',
      control: {
        type: 'range',
        min: 0,
        max: 50,
        step: 1,
      },
    },
    innerShadow: {
      name: '内阴影 innerShadow',
      description:
        '内阴影预设。无 / 柔和 / 强烈 对应不同的 blur 与颜色；内阴影与外阴影共用 ShadowEffect 接口，只是绘制在图形内侧。',
      control: {
        type: 'select',
      },
      options: ['none', 'soft', 'strong'],
    },
    blendMode: {
      name: '混合模式 blendMode',
      description:
        '元素与下方内容的合成方式。pass-through 为默认（穿透、性能最好），multiply 变暗、screen 变亮、overlay 加深对比；normal 与 pass-through 视觉相同但会单独开层。',
      control: {
        type: 'select',
      },
      options: [
        'pass-through',
        'normal',
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
      ],
    },
    opacity: {
      name: '透明度 opacity',
      description:
        '元素整体透明度（0~1，默认 1）。作用于整个前景，包含其外阴影与内阴影。',
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<VisualEffectArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
