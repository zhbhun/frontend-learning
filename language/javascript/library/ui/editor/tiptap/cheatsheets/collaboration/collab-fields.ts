/**
 * 范例介绍：同一个 Y.Doc 用不同 field 分出两个互不相通的正文片段。
 * 前置状态：一个 Y.Doc；编辑器 A 接 field: 'title'，编辑器 B 接 field: 'body'。
 * 操作：在两个编辑区分别打字，对照读数里 Y.Doc 上的片段名单。
 * 预期结果：两边内容独立演化、互不同步；Y.Doc 上的片段恰好是 title 与 body 两个。
 * 阅读主线：field 决定正文存进 Y.Doc 的哪个片段——一个文档承载多个字段时用它区分。
 */
import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import * as Y from 'yjs';

import './demo.css';

export interface CollabFieldsSnapshot {
  fragments: string;
  inSync: string;
}

export interface CollabFieldsInstance {
  update(): void;
  dispose(): void;
}

const BASE_EXTENSIONS = [Document, Paragraph, Text];

export function createCollabFieldsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CollabFieldsSnapshot) => void,
): CollabFieldsInstance {
  const frame = document.createElement('div');
  frame.className = 'col-frame col-columns';
  canvas.replaceWith(frame);

  const columns = [
    { name: 'A', field: 'title', content: '<p>这是标题字段。</p>' },
    { name: 'B', field: 'body', content: '<p>这是正文字段。</p>' },
  ].map((config) => {
    const column = document.createElement('div');
    column.className = 'col-column';
    const label = document.createElement('p');
    label.className = 'col-label';
    label.textContent = `编辑器 ${config.name} · field: '${config.field}'`;
    const host = document.createElement('div');
    host.className = 'col-editor col-editor--edit';
    column.append(label, host);
    frame.append(column);
    return { ...config, host };
  });

  const ydoc = new Y.Doc();
  const editors: Editor[] = [];

  function emitSnapshot(): void {
    if (editors.length < 2) {
      return;
    }
    emit({
      // share 是 Y.Doc 的片段注册表：getXmlFragment(field) 会在这里登记
      fragments: [...ydoc.share.keys()].sort().join('、'),
      inSync: editors[0].getText() === editors[1].getText() ? '是' : '否',
    });
  }

  columns.forEach((column, index) => {
    const editor = new Editor({
      element: column.host,
      extensions: [
        ...BASE_EXTENSIONS,
        // 同一个 Y.Doc，field 不同 → 接的是不同的片段
        Collaboration.configure({ document: ydoc, field: column.field }),
      ],
      content: column.content,
    });
    editor.on('update', emitSnapshot);
    editors.push(editor);
  });

  emitSnapshot();

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接在两个编辑区里操作
    },
    dispose() {
      editors.forEach((editor) => editor.destroy());
      ydoc.destroy();
      frame.remove();
    },
  };
}
