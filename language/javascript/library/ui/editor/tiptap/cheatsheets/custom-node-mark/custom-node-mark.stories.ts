import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import extensionSource from './custom-extensions.ts?raw';
import './demo.css';
import { createEditorLab, type EditorLabSnapshot } from './editor-lab';

const editorLabRender = canvasStory({
  create: createEditorLab,
  apply() {
    // 本课输入由界面按钮提供（点按钮执行自定义命令），不经过 args
  },
  readout(snapshot: EditorLabSnapshot) {
    return [
      ['已注册的自定义命令', snapshot.registeredCommands],
      ['光标处', snapshot.cursorLabel],
      ['can().setCalloutType', snapshot.canSetCallout],
    ];
  },
});

const meta = {
  id: 'custom-node-mark',
  title: '原理与自定义/自定义 Node 与 Mark',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const EditorLab = {
  name: '扩展实验台',
  render: editorLabRender,
  parameters: storySource(extensionSource),
} satisfies StoryObj;
