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
      ['执行阶段', snapshot.stages],
      ['产物', snapshot.artifactCount],
      ['产物目录', snapshot.artifactDir],
      ['提示', snapshot.note],
    ];
  },
  captions: ['bundler 流水线(模拟)', '产物清单(模拟)'],
});

const meta = {
  id: 'bundling',
  title: '质量与发布/打包与分发/打包',
  tags: ['!dev'],
  args: {
    platform: 'macOS',
    command: 'tauri build',
  },
  argTypes: {
    platform: {
      name: '目标平台',
      description:
        '选择执行 tauri build 的系统,观察 targets "all" 的产出映射与产物路径如何随平台变化。',
      control: {
        type: 'radio',
      },
      options: ['macOS', 'Windows', 'Linux'],
    },
    command: {
      name: '构建命令',
      description:
        '切换 tauri build 及其常见变体,观察流水线哪些阶段被执行、产出哪些文件,以及跨平台格式边界。',
      control: {
        type: 'radio',
      },
      options: [
        'tauri build',
        'tauri build --bundles dmg',
        'tauri build --bundles nsis',
        'tauri build --no-bundle',
        'tauri bundle',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
