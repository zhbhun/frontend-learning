import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createIntro,
  type IntroInstance,
  type IntroOptions,
  type IntroShape,
  type IntroSnapshot,
} from './example';

interface IntroArgs extends IntroOptions {}

const renderInteractive = canvasStory({
  create: createIntro,
  apply(instance: IntroInstance, args: IntroArgs) {
    instance.update(args);
  },
  readout(snapshot: IntroSnapshot) {
    return [
      ['节点类型', snapshot.tag],
      ['填充色', snapshot.fill],
      ['子节点数', snapshot.nodeCount],
    ];
  },
});

const meta = {
  id: 'intro',
  title: '起步/认识 LeaferJS',
  tags: ['!dev'],
  args: {
    fill: '#4f7cff',
    shape: 'rect',
    cornerRadius: 18,
  },
  argTypes: {
    fill: {
      name: '填充色',
      description: '节点的 fill 属性；赋值后引擎自动重绘，无需手动调用渲染。',
      control: { type: 'color' },
    },
    shape: {
      name: '图形',
      description: '切换不同的 Leafer UI 节点类型：Rect / Ellipse / Polygon。',
      options: ['rect', 'circle', 'triangle'] as IntroShape[],
      control: { type: 'select' },
      labels: { rect: '矩形', circle: '圆', triangle: '三角形' },
    },
    cornerRadius: {
      name: '圆角',
      description: '矩形的 cornerRadius；对圆和三角形无效。',
      control: { type: 'range', min: 0, max: 80, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<IntroArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
