import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTextEditorDemo,
  type TextEditorDemoInstance,
  type TextEditorDemoSnapshot,
  type TextEditorDemoOptions,
} from './example';

interface TextEditorArgs extends TextEditorDemoOptions {}

const renderInteractive = canvasStory({
  create: createTextEditorDemo,
  apply(instance: TextEditorDemoInstance, args: TextEditorArgs) {
    instance.update(args);
  },
  readout(snapshot: TextEditorDemoSnapshot) {
    return [
      ['内联编辑', snapshot.editing ? '进行中' : '空闲'],
      ['内部编辑器', snapshot.innerEditorTag],
      ['文字内容', snapshot.textContent],
      ['textEditing 标志', snapshot.textEditingFlag ? 'true' : 'false'],
    ];
  },
});

const meta = {
  id: 'text-editor',
  title: '编辑器/文字与内部编辑/文字编辑器',
  tags: ['!dev'],
  args: {
    editState: 'close',
    selectAll: true,
  },
  argTypes: {
    editState: {
      name: '编辑状态',
      description:
        '编程式进入或结束内联编辑：选「进入编辑」会先选中文字再调用 editor.openInnerEditor()（与双击流程一致）；选「结束编辑」调用 editor.closeInnerEditor()。也可直接双击画布中的文字。',
      control: { type: 'radio' },
      options: ['open', 'close'],
    },
    selectAll: {
      name: '全选模式',
      description:
        '对应 TextEditor.config.selectAll。进入编辑前设置，决定打开输入框时是否自动全选文字；true 全选，false 把光标放到文字末尾。仅在下次进入编辑时生效。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TextEditorArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
