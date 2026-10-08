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
      ['脚手架模板', snapshot.templateLabel],
      ['执行命令', snapshot.commandLine],
      ['前端入口', snapshot.frontendEntry],
      ['核心产物', snapshot.artifact],
    ];
  },
  captions: ['生成的工程结构', 'tauri 命令流水线'],
});

const meta = {
  id: 'first-app',
  title: '上手/第一个应用',
  tags: ['!dev'],
  args: {
    template: 'react-ts',
    command: 'dev',
  },
  argTypes: {
    template: {
      name: '脚手架模板',
      description: 'create-tauri-app 的前端模板，决定 src/ 内的框架代码。',
      control: {
        type: 'radio',
      },
      options: ['react-ts', 'vue-ts', 'vanilla-ts'],
    },
    command: {
      name: 'tauri 命令',
      description: '切换 dev / build，对照两条流水线的步骤与产物。',
      control: {
        type: 'inline-radio',
      },
      options: ['dev', 'build'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
