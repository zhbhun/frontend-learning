import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  SYMPTOMS,
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
      ['现象', snapshot.symptom],
      ['侧别', snapshot.side],
      ['首选通道', snapshot.channel],
      ['第一步', snapshot.step],
      ['可用性', snapshot.availability],
    ];
  },
});

const meta = {
  id: 'debugging',
  title: '质量与发布/调试与测试/调试与日志',
  tags: ['!dev'],
  args: {
    symptom: 'invoke 的 Promise 永远不 resolve',
    build: 'dev',
  },
  argTypes: {
    symptom: {
      name: '问题现象',
      description:
        '选择遇到的现象,读数给出侧别、首选通道、第一步动作与当前构建下的可用性。',
      control: {
        type: 'select',
      },
      options: [...SYMPTOMS],
    },
    build: {
      name: '构建形态',
      description:
        'dev 指跑 tauri dev 的开发态,release 指打包产物;--debug 构建的 devtools 与 dev 一致。',
      control: {
        type: 'select',
      },
      options: ['dev', 'release'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
