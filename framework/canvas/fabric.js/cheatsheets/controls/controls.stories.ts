import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createControlsLab,
  type ControlsLabInstance,
  type ControlsLabOptions,
  type ControlsLabSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createControlsLab,
  apply(instance: ControlsLabInstance, args: ControlsLabOptions) {
    instance.update(args);
  },
  readout(snapshot: ControlsLabSnapshot) {
    return [
      ['当前手柄', snapshot.corner],
      ['最近动作', snapshot.action],
      ['矩形变换值', snapshot.transform],
      ['生效样式', snapshot.style],
      ['可见手柄', snapshot.visible],
    ];
  },
  captions: ['先点选对象再拖手柄 · Shift 翻转等比或切倾斜 · Alt 临时居中'],
});

const meta = {
  id: 'controls',
  title: '交互与编辑/变换控件',
  tags: ['!dev'],
  args: {
    cornerStyle: 'rect',
    cornerSize: 13,
    cornerColor: '#b2ccff',
    cornerStrokeColor: '#ffffff',
    transparentCorners: true,
    padding: 0,
    borderScaleFactor: 1,
    hasControls: true,
    hasBorders: true,
    centeredScaling: false,
    snapAngle: 0,
  },
  argTypes: {
    cornerStyle: {
      name: '手柄形状（cornerStyle）',
      description:
        'cornerStyle（默认 rect）：rect 方块 / circle 圆点；官方已标 deprecated，未来由自定义渲染接管。',
      control: {
        type: 'inline-radio',
        options: ['rect', 'circle'],
      },
    },
    cornerSize: {
      name: '手柄尺寸（cornerSize）',
      description:
        'cornerSize（默认 13）：手柄边长（px），不随对象缩放变化；同时决定鼠标命中区大小。',
      control: {
        type: 'range',
        min: 4,
        max: 40,
        step: 1,
      },
    },
    cornerColor: {
      name: '手柄颜色（cornerColor）',
      description:
        'cornerColor（默认 rgb(178,204,255)）：transparentCorners 为 true 时作描边色，false 时作填充色。',
      control: { type: 'color' },
    },
    cornerStrokeColor: {
      name: '手柄描边色（cornerStrokeColor）',
      description:
        'cornerStrokeColor（fabric 默认空串）：仅 transparentCorners 为 false 时作为描边色生效。',
      control: { type: 'color' },
    },
    transparentCorners: {
      name: '透明手柄（transparentCorners）',
      description:
        'transparentCorners（默认 true）：true 手柄镂空、用 cornerColor 描边；false 手柄实心、cornerColor 填充加 cornerStrokeColor 描边。',
      control: { type: 'boolean' },
    },
    padding: {
      name: '控件内边距（padding）',
      description:
        'padding（默认 0）：边框、手柄与命中区整体向外平移的距离，对象本体大小不变。',
      control: {
        type: 'range',
        min: 0,
        max: 40,
        step: 1,
      },
    },
    borderScaleFactor: {
      name: '边框粗细（borderScaleFactor）',
      description:
        'borderScaleFactor（默认 1）：边框与 mtr 连接线的线宽倍数。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 0.5,
      },
    },
    hasControls: {
      name: '显示手柄（hasControls）',
      description:
        'hasControls（默认 true）：整组显示 / 隐藏全部手柄；隐藏后对象仍可拖动（锁变换用 lock* 系列）。',
      control: { type: 'boolean' },
    },
    hasBorders: {
      name: '显示边框（hasBorders）',
      description:
        'hasBorders（默认 true）：整组显示 / 隐藏边框与 mtr 连接线，不影响手柄。',
      control: { type: 'boolean' },
    },
    centeredScaling: {
      name: '居中缩放（centeredScaling）',
      description:
        '对象级 centeredScaling（默认 false）：true 时拖角绕中心两翼同缩；默认锚定对角。按住 Alt（centeredKey）随时临时翻转。',
      control: { type: 'boolean' },
    },
    snapAngle: {
      name: '旋转吸附角（snapAngle）',
      description:
        '对象级 snapAngle（默认不吸附）：mtr 旋转按该步进吸附，如 45 表示 45° 一档；判定阈值 snapThreshold 缺省同 snapAngle。',
      control: {
        type: 'range',
        min: 0,
        max: 90,
        step: 15,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ControlsLabOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
