import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './embed-sim.ts?raw';
import {
  createEmbedSim,
  type EmbedSimInstance,
  type EmbedSimOptions,
  type EmbedSimSnapshot,
} from './embed-sim';

interface EmbedSimArgs {
  method: EmbedSimOptions['method'];
  sitePolicy: EmbedSimOptions['sitePolicy'];
}

const renderInteractive = canvasStory({
  create: createEmbedSim,
  apply(instance: EmbedSimInstance, args: EmbedSimArgs) {
    instance.update(args);
  },
  readout(snapshot: EmbedSimSnapshot) {
    return [
      ['嵌入方式', snapshot.method],
      ['目标站点响应', snapshot.sitePolicy],
      ['判定', snapshot.verdict],
    ];
  },
});

const meta = {
  id: 'web-embeds',
  title: 'Web 内容/嵌入网页',
  tags: ['!dev'],
  args: {
    method: 'iframe',
    sitePolicy: 'X-Frame-Options: DENY',
  },
  argTypes: {
    method: {
      name: '嵌入方式',
      description: '选择把第三方网页放进窗口的方式，观察它的进程归属与控制边界。',
      control: {
        type: 'radio',
        options: ['iframe', 'WebContentsView', 'webview（历史）'],
      },
    },
    sitePolicy: {
      name: '目标站点响应',
      description: '目标站点返回的嵌入许可头，对照它对不同嵌入方式的约束差异。',
      control: {
        type: 'radio',
        options: ['允许嵌入', 'X-Frame-Options: DENY', 'CSP: frame-ancestors 限制'],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<EmbedSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
