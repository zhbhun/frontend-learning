import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCustomShape,
  type GearInstance,
  type GearSnapshot,
} from './example';

interface GearArgs {
  /** 齿数：驱动 sceneFunc 的顶点循环。 */
  teeth: number;
  /** 中心孔占比 = holeRadius / outerRadius；0 = 实心。 */
  holeRatio: number;
}

const renderInteractive = canvasStory({
  create: createCustomShape,
  apply(instance: GearInstance, args: GearArgs) {
    instance.update(args);
  },
  readout(snapshot: GearSnapshot) {
    return [
      ['齿数', snapshot.teeth],
      ['路径顶点', snapshot.vertexCount],
      ['外径', snapshot.outerRadius],
      ['齿谷半径', snapshot.valleyRadius],
      ['中心孔', snapshot.holeRadius > 0 ? snapshot.holeRadius : '无'],
      ['子路径', snapshot.subpathCount],
    ];
  },
});

const meta = {
  id: 'custom-shape',
  title: '形状与样式/形状/自定义形状',
  tags: ['!dev'],
  args: {
    teeth: 8,
    holeRatio: 0.3,
  },
  argTypes: {
    teeth: {
      name: '齿数',
      description:
        'sceneFunc 里循环的次数，直接决定齿轮边数。每齿生成 4 个顶点（读数「路径顶点」= 齿数 × 4）。',
      control: { type: 'range', min: 4, max: 14, step: 1 },
    },
    holeRatio: {
      name: '中心孔占比',
      description:
        'holeRadius / outerRadius。0 = 实心（单子路径）；>0 = 中心孔（第二个子路径，配合 fillRule:evenodd 镂空）。',
      control: { type: 'range', min: 0, max: 0.6, step: 0.05 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GearArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
