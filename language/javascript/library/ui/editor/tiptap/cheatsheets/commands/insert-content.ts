/**
 * 范例介绍：insertContent / insertContentAt 在不同位置插入不同形态的内容，updateSelection 决定光标去哪。
 * 前置状态：schema 只装 Document、Paragraph、Text、Heading、Bold；基准文档是一段文字加一个空段落；
 *   编辑器为只读，插入全部由命令完成。
 * 操作：选「插入内容」预设（纯文本 / 行内 HTML / 块级 JSON）、「插入位置」（当前选区 / 空段落 / 文档末尾）
 *   与「updateSelection」开关。
 * 预期结果：编辑器显示插入结果；读数给出顶层节点序列与光标 from–to——块级内容替换空段、
 *   段中插入把段落切开、光标默认移到插入内容末尾。
 * 阅读主线：同样的内容换个位置插入、或关掉 updateSelection，读数怎么变。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type ContentPreset = 'text' | 'inline-html' | 'block-json';
export type InsertPosition = 'selection' | 'empty-paragraph' | 'doc-end';

export interface InsertContentArgs {
  preset: ContentPreset;
  position: InsertPosition;
  updateSelection: boolean;
}

export interface InsertContentSnapshot {
  nodeTypes: string;
  cursor: string;
}

export interface InsertContentInstance {
  update(args: InsertContentArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading, Bold];

const BASELINE_TEXT = '第一段文字，等待插入内容。';
const BASELINE = `<p>${BASELINE_TEXT}</p><p></p>`;

// 三种内容形态表达不同的插入物；JSON 数组须符合 schema（见 2.1）
const PRESETS: Record<ContentPreset, string | JSONContent[]> = {
  text: '插入的文本',
  'inline-html': '<strong>加粗</strong>文字',
  'block-json': [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '插入的标题' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '插入的段落' }],
    },
  ],
};

export function createInsertContentDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InsertContentSnapshot) => void,
): InsertContentInstance {
  const frame = document.createElement('div');
  frame.className = 'cmd-frame';
  canvas.replaceWith(frame);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'cmd-box-label';
  hostLabel.textContent = '编辑器（插入结果）';
  const host = document.createElement('div');
  host.className = 'cmd-editor';

  frame.append(hostLabel, host);

  let editor: Editor | null = null;

  function applyArgs(args: InsertContentArgs): void {
    editor?.destroy();
    host.replaceChildren();

    editor = new Editor({
      element: host,
      extensions: EXTENSIONS,
      content: BASELINE,
      editable: false,
    });

    const value = PRESETS[args.preset];
    const options = { updateSelection: args.updateSelection };

    if (args.position === 'doc-end') {
      // 定位插入：position 也可以是 { from, to } 范围
      editor.commands.insertContentAt(
        editor.state.doc.content.size,
        value,
        options,
      );
    } else {
      // insertContent = insertContentAt(当前选区)
      if (args.position === 'selection') {
        // 第一段文字的中间位置
        editor.commands.setTextSelection(
          1 + Math.floor(BASELINE_TEXT.length / 2),
        );
      } else {
        // 空段落内部
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      }
      editor.commands.insertContent(value, options);
    }

    const nodeTypes =
      editor.getJSON().content?.map((node) => node.type).join('、') ?? '';
    const { from, to } = editor.state.selection;
    emit({ nodeTypes, cursor: `${from}–${to}` });
  }

  applyArgs({
    preset: 'block-json',
    position: 'empty-paragraph',
    updateSelection: true,
  });

  return {
    update(args) {
      applyArgs(args);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
