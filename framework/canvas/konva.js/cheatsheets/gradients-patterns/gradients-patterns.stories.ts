import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGradients,
  type GradientsInstance,
  type GradientsSnapshot,
} from './example';

type FillPriority = 'color' | 'linear-gradient' | 'radial-gradient' | 'pattern';

interface GradientsArgs {
  /** 填充总开关：决定四套填充数据里哪一套生效。 */
  fillPriority: FillPriority;
}

const renderInteractive = canvasStory({
  create: createGradients,
  apply(instance: GradientsInstance, args: GradientsArgs) {
    instance.update(args);
  },
  readout(snapshot: GradientsSnapshot) {
    return [
      ['fillPriority', snapshot.fillPriority],
      ['生效填充', snapshot.activeFill],
    ];
  },
});

const meta = {
  id: 'gradients-patterns',
  title: '形状与样式/样式/渐变与图案',
  tags: ['!dev'],
  args: {
    fillPriority: 'color',
  },
  argTypes: {
    fillPriority: {
      name: 'fillPriority',
      description:
        '决定四套填充数据里哪一套生效。默认 color：同时设了 fill 颜色与渐变属性时，不显式切换则纯色赢。',
      control: { type: 'select' },
      options: ['color', 'linear-gradient', 'radial-gradient', 'pattern'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GradientsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
