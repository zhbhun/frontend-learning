import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import gettingStartedSource from './getting-started.ts?raw';
import {
  createGettingStarted,
  type GettingStartedInstance,
  type GettingStartedSnapshot,
} from './getting-started';

interface GettingStartedArgs {
  background: string;
}

const renderInteractive = canvasStory({
  create: createGettingStarted,
  apply(instance: GettingStartedInstance, args: GettingStartedArgs) {
    instance.update(args);
  },
  readout(snapshot: GettingStartedSnapshot) {
    return [
      ['渲染器', snapshot.renderer],
      ['分辨率', snapshot.resolution],
      ['画布尺寸', snapshot.screen],
    ];
  },
});

const meta = {
  id: 'getting-started',
  title: '入门/初始化',
  tags: ['!dev'],
  args: {
    background: '#1a1a2e',
  },
  argTypes: {
    background: {
      name: '背景色',
      description:
        '对应 Application.init 的 background 选项；运行时通过 app.renderer.background.color 修改。',
      control: {
        type: 'color',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(gettingStartedSource),
} satisfies Meta<GettingStartedArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
