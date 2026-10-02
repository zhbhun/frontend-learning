/**
 * 范例介绍：schema 之外的两种去向——默认静默过滤；enableContentCheck 开启后经 contentError 事件报告。
 * 前置状态：schema 只装 Document、Paragraph、Text、Bold，不认识 marquee 这样的标签。
 * 操作：切换「content 预设」与「enableContentCheck」开关。
 * 预期结果：默认下，未注册标签的 HTML 无警告消失、未注册类型的 JSON 降级为空文档并 console.warn；
 *   开启检查后，错误框给出 contentError 信息，编辑器降级重建、合法部分保留。
 * 阅读主线：同一份非法内容在两种模式下的读数差异。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type GuardPreset = 'valid-html' | 'unknown-tag-html' | 'unknown-node-json';

export interface SchemaGuardArgs {
  preset: GuardPreset;
  contentCheck: boolean;
}

export interface SchemaGuardSnapshot {
  checkLabel: string;
  errorOccurred: boolean;
  docChildren: number;
  isEmpty: boolean;
}

export interface SchemaGuardInstance {
  update(args: SchemaGuardArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Bold];

const PRESETS: Record<GuardPreset, string | JSONContent> = {
  'valid-html': '<p>两个段落</p><p><strong>全部合法</strong></p>',
  // marquee 标签未注册：默认模式静默丢弃；检查模式报 Invalid HTML content
  'unknown-tag-html': '<p>合法段落保留</p><marquee>未注册标签</marquee>',
  // marquee 节点类型未注册：默认模式 console.warn 后降级为空文档；检查模式报 Invalid JSON content
  'unknown-node-json': {
    type: 'doc',
    content: [
      { type: 'marquee', content: [{ type: 'text', text: '未注册的节点类型' }] },
    ],
  },
};

export function createSchemaGuardDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SchemaGuardSnapshot) => void,
): SchemaGuardInstance {
  const frame = document.createElement('div');
  frame.className = 'cm-frame cm-columns cm-frame--captioned';
  canvas.replaceWith(frame);

  // 左列：content 输入与检查结果
  const inputColumn = document.createElement('div');
  inputColumn.className = 'cm-column';
  const inputLabel = document.createElement('p');
  inputLabel.className = 'cm-box-label';
  inputLabel.textContent = 'content 输入';
  const inputPre = document.createElement('pre');
  inputPre.className = 'cm-pre';
  const errorLabel = document.createElement('p');
  errorLabel.className = 'cm-box-label';
  errorLabel.textContent = 'contentError 事件';
  const errorBox = document.createElement('p');
  errorBox.className = 'cm-error cm-error--none';
  errorBox.textContent = '（无）';
  inputColumn.append(inputLabel, inputPre, errorLabel, errorBox);

  // 右列：编辑器实际收下的内容
  const editorColumn = document.createElement('div');
  editorColumn.className = 'cm-column';
  const editorLabel = document.createElement('p');
  editorLabel.className = 'cm-box-label';
  editorLabel.textContent = '编辑器实际收下的内容（getHTML）';
  const host = document.createElement('div');
  host.className = 'cm-editor';
  const resultPre = document.createElement('pre');
  resultPre.className = 'cm-pre';
  editorColumn.append(editorLabel, host, resultPre);

  frame.append(inputColumn, editorColumn);

  let editor: Editor | null = null;

  function apply(args: SchemaGuardArgs): void {
    editor?.destroy();
    host.replaceChildren();

    const preset = PRESETS[args.preset];
    inputPre.textContent =
      typeof preset === 'string' ? preset : JSON.stringify(preset, null, 2);

    // content 是构造选项：每次切换都重新 new Editor
    const captured: { error: Error | null } = { error: null };
    editor = new Editor({
      element: host,
      extensions: EXTENSIONS,
      content: preset,
      editable: false,
      enableContentCheck: args.contentCheck,
      // 默认的 onContentError 会把错误重新抛出：这里改为捕获展示，避免实例创建中断
      onContentError: ({ error }) => {
        captured.error = error;
      },
    });

    if (captured.error) {
      errorBox.textContent = captured.error.message;
      errorBox.className = 'cm-error';
    } else {
      errorBox.textContent = '（无）';
      errorBox.className = 'cm-error cm-error--none';
    }

    resultPre.textContent = editor.getHTML() || '（空文档）';
    const json = editor.getJSON();

    emit({
      checkLabel: args.contentCheck ? 'contentError 事件' : '静默过滤',
      errorOccurred: captured.error !== null,
      docChildren: json.content?.length ?? 0,
      isEmpty: editor.isEmpty,
    });
  }

  return {
    update(nextArgs) {
      apply(nextArgs);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
