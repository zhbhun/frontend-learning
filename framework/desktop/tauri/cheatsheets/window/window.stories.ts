import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['逻辑尺寸', snapshot.logical],
      ['物理尺寸', snapshot.physical],
      ['窗口装饰', snapshot.chrome],
      ['可调整大小', snapshot.resizable],
      ['启动位置', snapshot.position],
    ];
  },
  captions: ['模拟桌面:窗口按 app.windows[0] 配置绘制,底部为逻辑 → 物理换算读数'],
});

const meta = {
  id: 'window',
  title: '核心开发/配置与窗口/窗口',
  tags: ['!dev'],
  args: {
    width: 800,
    height: 600,
    title: '我的便签',
    resizable: true,
    decorations: true,
    center: false,
    scaleFactor: 2,
  },
  argTypes: {
    width: {
      name: 'width',
      description: '窗口宽度(逻辑像素),对应 WindowConfig.width,默认 800。',
      control: {
        type: 'range',
        min: 360,
        max: 1280,
        step: 20,
      },
    },
    height: {
      name: 'height',
      description: '窗口高度(逻辑像素),对应 WindowConfig.height,默认 600。',
      control: {
        type: 'range',
        min: 240,
        max: 800,
        step: 20,
      },
    },
    title: {
      name: 'title',
      description: '标题栏文字,对应 WindowConfig.title;无边框时不显示。',
      control: {
        type: 'text',
      },
    },
    resizable: {
      name: 'resizable',
      description: '能否拖拽缩放,对应 WindowConfig.resizable,默认 true。',
      control: {
        type: 'boolean',
      },
    },
    decorations: {
      name: 'decorations',
      description: '系统边框与标题栏,对应 WindowConfig.decorations,默认 true。',
      control: {
        type: 'boolean',
      },
    },
    center: {
      name: 'center',
      description: '启动时是否居中,对应 WindowConfig.center,默认 false。',
      control: {
        type: 'boolean',
      },
    },
    scaleFactor: {
      name: 'scaleFactor',
      description: '显示器缩放系数;逻辑尺寸不变时,物理尺寸随它换算。',
      control: {
        type: 'radio',
      },
      options: [1, 2],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
