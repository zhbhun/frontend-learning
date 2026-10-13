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

function formatMode(mode: ExampleSnapshot['mode']): string {
  return mode === 'path' ? 'path（URL 请求）' : 'animationData（内联）';
}

function formatLoadMs(snapshot: ExampleSnapshot): string {
  if (snapshot.failed) {
    return '加载失败';
  }
  if (snapshot.loadMs === null) {
    return '等待 DOMLoaded…';
  }
  return `${snapshot.loadMs.toFixed(1)} ms`;
}

function formatRequests(snapshot: ExampleSnapshot): string {
  if (snapshot.failed) {
    return '未知';
  }
  if (snapshot.requests === null) {
    return '—';
  }
  return snapshot.requests > 0 ? `${snapshot.requests} 次` : '0 次';
}

const renderLoadModes = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['加载方式', formatMode(snapshot.mode)],
      ['到 DOMLoaded', formatLoadMs(snapshot)],
      ['本次资源请求', formatRequests(snapshot)],
    ];
  },
});

const meta = {
  id: 'getting-assets',
  title: '认识与上手/获取动画素材',
  tags: ['!dev'],
  args: {
    mode: 'path',
  },
  argTypes: {
    mode: {
      name: '加载方式',
      description:
        'path：把 URL 交给 lottie-web 发起请求；animationData：数据内联进代码，同步可用。',
      control: {
        type: 'radio',
        labels: {
          path: 'path（URL 加载）',
          animationData: 'animationData（内联）',
        },
      },
      options: ['path', 'animationData'],
    },
  },
  render: renderLoadModes,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoadModes: Story = {};
