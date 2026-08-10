import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createEditorBasic,
  type EditorBasicsInstance,
  type EditorBasicsSnapshot,
  type EditorBasicsOptions,
} from './example';

interface EditorBasicsArgs extends EditorBasicsOptions {}

const renderInteractive = canvasStory({
  create: createEditorBasic,
  apply(instance: EditorBasicsInstance, args: EditorBasicsArgs) {
    instance.update(args);
  },
  readout(snapshot: EditorBasicsSnapshot) {
    return [
      ['编辑器已挂载', snapshot.mounted ? '是' : '否'],
      ['编辑中', snapshot.editing ? '是' : '否'],
      ['选中元素', snapshot.selectedTag],
      ['选中数量', snapshot.selectedCount],
    ];
  },
});

const meta = {
  id: 'editor-basics',
  title: '编辑器/编辑器基础/启用编辑器',
  tags: ['!dev'],
  args: {
    selectTarget: 'rect',
  },
  argTypes: {
    selectTarget: {
      name: '选中元素',
      description:
        '调用 editor.select() 选中场景中的元素，选中框会移动到目标；选「无选中」调用 editor.cancel() 清空选中。',
      control: {
        type: 'select',
      },
      options: ['rect', 'ellipse', 'text', 'none'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EditorBasicsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
