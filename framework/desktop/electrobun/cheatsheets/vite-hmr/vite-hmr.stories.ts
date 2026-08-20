import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import decisionSource from './url-decision.ts?raw';
import {
  createUrlDecision,
  type RunChannel,
  type UrlDecisionInstance,
  type UrlDecisionSnapshot,
} from './url-decision';

interface DecisionArgs {
  channel: RunChannel;
  devServer: boolean;
}

const renderDecision = canvasStory({
  create: createUrlDecision,
  apply(instance: UrlDecisionInstance, args: DecisionArgs) {
    instance.update(args);
  },
  readout(snapshot: UrlDecisionSnapshot) {
    return [
      ['运行通道', snapshot.channel],
      ['dev server', snapshot.devServer],
      ['加载 URL', snapshot.url],
      ['主进程日志', snapshot.log],
    ];
  },
});

const meta = {
  id: 'vite-hmr',
  title: '前端工程化/Vite 集成与 HMR',
  tags: ['!dev'],
  args: {
    channel: 'dev',
    devServer: true,
  },
  argTypes: {
    channel: {
      name: '运行通道',
      description:
        '应用包 version.json 里的 channel 字段：dev（electrobun dev 或 build --env=dev 的产物）或分发通道 canary / stable。',
      options: ['dev', 'canary', 'stable'],
      control: {
        type: 'inline-radio',
        labels: {
          dev: 'dev',
          canary: 'canary',
          stable: 'stable',
        },
      },
    },
    devServer: {
      name: 'Vite dev server',
      description: 'vite --port 5173 是否正在运行（bun run dev:hmr 的 concurrently [0] 进程）。',
      control: { type: 'boolean' },
    },
  },
  render: renderDecision,
  parameters: storySource(decisionSource),
} satisfies Meta<DecisionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UrlDecision: Story = {};
