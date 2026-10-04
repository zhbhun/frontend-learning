import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAssemblyExample,
  type AssemblyInstance,
  type AssemblyOptions,
  type AssemblySnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createAssemblyExample,
  apply(instance: AssemblyInstance, args: AssemblyOptions) {
    instance.update(args);
  },
  readout(snapshot: AssemblySnapshot) {
    return [
      [
        '扩展上下文',
        snapshot.extensionContexts.length > 0
          ? snapshot.extensionContexts.join('、')
          : '无',
      ],
      ['网页上下文', snapshot.pageContext ?? '无'],
      [
        '消息通道',
        snapshot.channels.length > 0 ? snapshot.channels.join('；') : '—',
      ],
    ];
  },
});

const meta = {
  id: 'extension-architecture',
  title: '起步/扩展架构',
  tags: ['!dev'],
  args: {
    serviceWorker: true,
    popup: true,
    contentScript: true,
  },
  argTypes: {
    serviceWorker: {
      name: 'background.service_worker',
      description: '是否在 manifest 中声明后台 service worker。',
      control: { type: 'boolean' },
    },
    popup: {
      name: 'action.default_popup',
      description: '是否在 manifest 中声明工具栏弹窗页面。',
      control: { type: 'boolean' },
    },
    contentScript: {
      name: 'content_scripts',
      description: '是否在 manifest 中声明注入网页的 content script。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AssemblyOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
