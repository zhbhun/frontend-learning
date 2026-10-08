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
      ['插件用途', snapshot.purpose],
      ['一键安装', snapshot.addCommand],
      ['前端包', snapshot.frontendPackage],
      ['权限默认', snapshot.permissionDefault],
    ];
  },
});

const meta = {
  id: 'plugin-system',
  title: '插件与权限/插件体系',
  tags: ['!dev'],
  args: {
    variant: 'dialog',
  },
  argTypes: {
    variant: {
      name: '演示插件',
      description:
        '选择一个官方插件,观察前端包、核心包、注册与权限四个落点的安装形态。',
      control: {
        type: 'select',
      },
      options: [
        'dialog',
        'fs',
        'http',
        'opener',
        'clipboard-manager',
        'notification',
        'store',
        'log',
        'global-shortcut',
        'single-instance',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
