import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSnapAlignRuler,
  type SnapAlignRulerInstance,
  type SnapAlignRulerSnapshot,
  type SnapAlignRulerOptions,
} from './example';

interface SnapAlignRulerArgs extends SnapAlignRulerOptions {}

const renderInteractive = canvasStory({
  create: createSnapAlignRuler,
  apply(instance: SnapAlignRulerInstance, args: SnapAlignRulerArgs) {
    instance.update(args);
  },
  readout(snapshot: SnapAlignRulerSnapshot) {
    return [
      ['吸附', snapshot.snap],
      ['网格', `${snapshot.gridSize} px`],
      ['选中位置', snapshot.selectedPos],
      ['吸附目标', snapshot.snapTarget],
    ];
  },
});

const meta = {
  id: 'snap-align-ruler',
  title: '编辑器/编组与对齐/吸附、对齐与标尺',
  tags: ['!dev'],
  args: {
    snap: true,
    gridSize: 20,
    showGrid: true,
  },
  argTypes: {
    snap: {
      name: '吸附',
      description:
        'editor.config.beforeMove 开关：开 = 移动落点吸附到网格；关 = 自由移动（吸附目标显示「自由」）。',
      control: { type: 'select' },
      options: [true, false],
      labels: {
        true: '是',
        false: '否',
      },
    },
    gridSize: {
      name: '网格大小',
      description:
        '吸附网格的间距（px），同时决定背景网格线的疏密。范围 10–60，越小吸附越密集。',
      control: {
        type: 'range',
        min: 10,
        max: 60,
        step: 5,
      },
    },
    showGrid: {
      name: '显示网格',
      description:
        '是否渲染背景网格参考线。隐藏后吸附（beforeMove）仍按 gridSize 生效，只是看不见网格。',
      control: { type: 'select' },
      options: [true, false],
      labels: {
        true: '显示',
        false: '隐藏',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SnapAlignRulerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
