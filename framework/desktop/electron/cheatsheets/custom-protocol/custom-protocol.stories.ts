import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './protocol-sim.ts?raw';
import {
  createProtocolSim,
  type ProtocolSimInstance,
  type ProtocolSimOptions,
  type ProtocolSimSnapshot,
} from './protocol-sim';

type ProtocolArgs = ProtocolSimOptions;

const renderInteractive = canvasStory({
  create: createProtocolSim,
  apply(instance: ProtocolSimInstance, args: ProtocolArgs) {
    instance.update(args);
  },
  readout(snapshot: ProtocolSimSnapshot) {
    return [
      ['页面地址', snapshot.pageUrlLabel],
      ['相对资源', snapshot.relativeLabel],
      ['fetch API', snapshot.fetchLabel],
      ['Web 存储', snapshot.storageLabel],
    ];
  },
});

const meta = {
  id: 'custom-protocol',
  title: 'Web 内容/自定义协议',
  tags: ['!dev'],
  args: {
    standard: true,
    supportFetchAPI: true,
  },
  argTypes: {
    standard: {
      name: 'privileges.standard',
      description:
        '注册协议时是否声明 standard 特权：决定页面相对资源解析与 Web 存储是否可用。',
      control: {
        type: 'boolean',
      },
    },
    supportFetchAPI: {
      name: 'privileges.supportFetchAPI',
      description:
        '注册协议时是否声明 supportFetchAPI 特权：决定页面内 fetch 能否请求该协议。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<ProtocolArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
