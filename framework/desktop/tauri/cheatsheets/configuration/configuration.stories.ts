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
      ['修改字段', snapshot.fieldPath],
      ['生效值', snapshot.newValue],
      ['生效位置', snapshot.surfaces],
      ['生效方式', snapshot.reload],
    ];
  },
  captions: ['tauri.conf.json（修改后）', '生效面（模拟 macOS 桌面与产物）'],
});

const meta = {
  id: 'configuration',
  title: '核心开发/配置与窗口/配置',
  tags: ['!dev'],
  args: {
    edit: 'productName',
  },
  argTypes: {
    edit: {
      name: '本次修改的字段',
      description:
        '选择在 tauri.conf.json 中改动的字段，观察左侧改动行与右侧被点亮的生效面。',
      control: {
        type: 'radio',
      },
      options: ['productName', 'windowTitle', 'identifier', 'bundleActive'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
