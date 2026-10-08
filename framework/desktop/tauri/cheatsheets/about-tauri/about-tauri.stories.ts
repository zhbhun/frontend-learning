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
      ['浏览器引擎', snapshot.engine],
      ['后端运行时', snapshot.runtime],
      ['随应用打包', snapshot.bundled],
    ];
  },
});

const meta = {
  id: 'about-tauri',
  title: '上手/认识 Tauri',
  tags: ['!dev'],
  args: {
    framework: 'tauri',
    platform: 'macOS',
  },
  argTypes: {
    framework: {
      name: '框架',
      description:
        '切换对比的方案:Electron 把浏览器与运行时打进安装包,Tauri 复用系统 WebView。',
      control: {
        type: 'radio',
        labels: { electron: 'Electron', tauri: 'Tauri' },
      },
      options: ['electron', 'tauri'],
    },
    platform: {
      name: '目标平台',
      description:
        '查看 Tauri 在该平台复用的系统 WebView;对 Electron 的构图与读数没有影响。',
      control: {
        type: 'inline-radio',
      },
      options: ['macOS', 'Windows', 'Linux'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
