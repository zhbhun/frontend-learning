import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createFirstScene,
  type FirstSceneInstance,
  type FirstSceneSnapshot,
} from './example';

interface FirstSceneArgs {
  width: number;
  height: number;
  fill: string;
}

const renderInteractive = canvasStory({
  create: createFirstScene,
  apply(instance: FirstSceneInstance, args: FirstSceneArgs) {
    instance.update(args);
  },
  readout(snapshot: FirstSceneSnapshot) {
    return [
      ['实际渲染尺寸', `${snapshot.width} × ${snapshot.height}`],
      ['节点数量', snapshot.nodeCount],
    ];
  },
});

const meta = {
  id: 'getting-started',
  title: '起步/安装与第一个场景',
  tags: ['!dev'],
  args: {
    width: 480,
    height: 320,
    fill: '#ffffff',
  },
  argTypes: {
    width: {
      name: '画布宽度',
      description:
        'Leafer 配置项 width：画布逻辑宽度（像素）。与 height 同时给出时为固定尺寸画布。',
      control: {
        type: 'range',
        min: 240,
        max: 720,
        step: 10,
      },
    },
    height: {
      name: '画布高度',
      description:
        'Leafer 配置项 height：画布逻辑高度（像素）。与 width 同时给出时为固定尺寸画布。',
      control: {
        type: 'range',
        min: 200,
        max: 480,
        step: 10,
      },
    },
    fill: {
      name: '画布背景色',
      description:
        'Leafer 配置项 fill：画布背景色，写入底层 <canvas> 的 background-color。',
      control: {
        type: 'color',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FirstSceneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
