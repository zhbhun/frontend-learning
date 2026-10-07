import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import simSource from './dialog-sim.ts?raw';
import {
  createDialogSim,
  type DialogSimInstance,
  type DialogSimSnapshot,
  type FilterPreset,
} from './dialog-sim';

interface DialogSimArgs {
  filter: FilterPreset;
  multiSelect: boolean;
  openDirectory: boolean;
}

const renderInteractive = canvasStory({
  create: createDialogSim,
  apply(instance: DialogSimInstance, args: DialogSimArgs) {
    instance.update(args);
  },
  readout(snapshot: DialogSimSnapshot) {
    return [
      ['options.properties', snapshot.propertiesText],
      ['Promise', snapshot.promiseText],
      ['结果对象', snapshot.resultText],
      ['filePaths', snapshot.pathsText],
    ];
  },
});

const meta = {
  id: 'dialog-files',
  title: '原生能力/文件与对话框',
  tags: ['!dev'],
  args: {
    filter: '文本与数据',
    multiSelect: true,
    openDirectory: false,
  },
  argTypes: {
    filter: {
      name: 'filters',
      description: 'FileFilter 数组：限定对话框里哪些扩展名可选，「全部文件」对应 extensions: [\'*\']。',
      control: {
        type: 'radio',
        options: ['文本与数据', '图片', '全部文件'],
      },
    },
    multiSelect: {
      name: 'multiSelections',
      description: 'properties 加入 multiSelections：一次可选多个条目。',
      control: {
        type: 'boolean',
      },
    },
    openDirectory: {
      name: 'openDirectory',
      description: 'properties 加入 openDirectory：文件夹也可选中（macOS 行为，Windows/Linux 见正文）。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(simSource),
} satisfies Meta<DialogSimArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
