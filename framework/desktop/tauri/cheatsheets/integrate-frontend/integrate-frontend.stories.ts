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
      ['执行命令', snapshot.commandLine],
      ['消费字段', snapshot.consumedFields],
      ['前端入口', snapshot.frontendEntry],
      ['对接结果', snapshot.connection],
    ];
  },
  captions: ['前端侧（React + Vite）', 'src-tauri/tauri.conf.json'],
});

const meta = {
  id: 'integrate-frontend',
  title: '上手/集成已有前端',
  tags: ['!dev'],
  args: {
    command: 'dev',
    vitePort: 1420,
    devUrlPort: 1420,
  },
  argTypes: {
    command: {
      name: 'tauri 命令',
      description: '切换 dev / build，对照各自消费的 build 段字段与前端入口。',
      control: {
        type: 'inline-radio',
      },
      options: ['dev', 'build'],
    },
    vitePort: {
      name: 'Vite 端口',
      description: 'vite.config.ts 中 server.port 的取值，dev server 实际监听的端口。',
      control: {
        type: 'radio',
      },
      options: [1420, 5173],
    },
    devUrlPort: {
      name: 'devUrl 端口',
      description: 'tauri.conf.json 中 build.devUrl 的端口，开发窗口加载的地址。',
      control: {
        type: 'radio',
      },
      options: [1420, 5173],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
