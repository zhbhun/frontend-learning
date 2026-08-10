import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSerialization,
  type SerializationInstance,
  type SerializationSnapshot,
} from './example';

interface SerializationArgs {
  shapeCount: number;
  view: 'source' | 'restored';
}

const renderInteractive = canvasStory({
  create: createSerialization,
  apply(instance: SerializationInstance, args: SerializationArgs) {
    instance.update(args);
  },
  readout(snapshot: SerializationSnapshot) {
    return [
      ['JSON 字符长度', snapshot.jsonLength],
      ['顶层 className', snapshot.topClassName],
      ['JSON 节点总数', snapshot.restoredNodes],
      ['首个圆 fill', snapshot.firstFill],
    ];
  },
});

const meta = {
  id: 'serialization',
  title: '数据与导出/序列化',
  tags: ['!dev'],
  args: {
    shapeCount: 3,
    view: 'source',
  },
  argTypes: {
    shapeCount: {
      name: '圆数',
      description: '源舞台中圆的数量，改变它会让序列化产出的 JSON 内容随之变化。',
      control: {
        type: 'range',
        min: 0,
        max: 6,
        step: 1,
      },
    },
    view: {
      name: '显示模式',
      description:
        'source 显示源舞台；restored 销毁源舞台后用 Konva.Node.create 从 toJSON 的 JSON 还原。',
      control: {
        type: 'radio',
      },
      options: ['source', 'restored'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SerializationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
