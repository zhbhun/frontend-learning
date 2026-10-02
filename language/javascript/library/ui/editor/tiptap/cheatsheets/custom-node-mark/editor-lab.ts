/**
 * 范例介绍：把 Annotation 与 Callout 两个自定义扩展装进编辑器，验证注册、状态与输出。
 * 前置状态：初始 content 里有一段文字和一个 data-callout="info" 的 div，
 *   走扩展的 parseHTML 规则被收进文档。
 * 操作：点命令按钮（批注命令作用于当前选区，需先在编辑器里选中一段文字）。
 * 预期结果：读数列出已注册的自定义命令；「光标处」随命令变化；光标不在 callout
 *   内时 can().setCalloutType 显示 false——命令返回值决定的可用性；getHTML
 *   输出 data-annotation 与 data-callout 属性。
 * 阅读主线：按钮调用命令 → 读数与 HTML 输出变化，就是扩展能力的完整验证回路。
 *   视觉样式（底色、边框）来自页面 CSS：扩展只负责 DOM 结构与行为。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Annotation, Callout, type CalloutType } from './custom-extensions';

export interface EditorLabSnapshot {
  registeredCommands: string;
  cursorLabel: string;
  canSetCallout: string;
}

export interface EditorLabInstance {
  dispose(): void;
}

/** 预期出现在 editor.commands 上的自定义命令名，逐一核对注册结果。 */
const CUSTOM_COMMANDS = [
  'setAnnotation',
  'unsetAnnotation',
  'insertCallout',
  'toggleCallout',
  'setCalloutType',
] as const;

const CALLOUT_TYPES: CalloutType[] = ['info', 'warning', 'success'];

const INITIAL_CONTENT = `
<p>选中这段文字的一部分，再点「添加批注」。</p>
<div data-callout="info"><p>这是一个 callout 节点：初始 HTML 走 parseHTML 规则被收进文档。</p></div>
`;

export function createEditorLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EditorLabSnapshot) => void,
): EditorLabInstance {
  const frame = document.createElement('div');
  frame.className = 'cnm-lab';
  canvas.replaceWith(frame);

  // 顶部：操作提示 + 命令按钮行
  const hint = document.createElement('p');
  hint.className = 'cnm-hint';
  hint.textContent = '批注命令作用于当前选区：先在编辑器里选中一段文字，再点按钮。';

  const toolbar = document.createElement('div');
  toolbar.className = 'cnm-toolbar';

  // 主区：左列编辑器，右列 getHTML 输出
  const columns = document.createElement('div');
  columns.className = 'cnm-columns';

  const editorBox = document.createElement('div');
  editorBox.className = 'cnm-editor';

  const htmlBox = document.createElement('div');
  htmlBox.className = 'cnm-htmlbox';
  const htmlLabel = document.createElement('p');
  htmlLabel.className = 'cnm-box-label';
  htmlLabel.textContent = 'getHTML()';
  const htmlPre = document.createElement('pre');
  htmlPre.className = 'cnm-pre';
  htmlBox.append(htmlLabel, htmlPre);

  columns.append(editorBox, htmlBox);
  frame.append(hint, toolbar, columns);

  const editor = new Editor({
    element: { mount: editorBox },
    extensions: [Document, Paragraph, Text, Annotation, Callout],
    content: INITIAL_CONTENT,
  });

  let annotationCount = 0;

  function emitSnapshot(): void {
    // 注册验证：addCommands 执行后命令才会出现在 editor.commands 上
    const commandTable = editor.commands as unknown as Record<string, unknown>;
    const registered = CUSTOM_COMMANDS.filter(
      (name) => typeof commandTable[name] === 'function',
    );

    // 状态验证：isActive + getAttributes 读取光标处的节点与标记
    const parts: string[] = [];
    if (editor.isActive('callout')) {
      const type = editor.getAttributes('callout').type as CalloutType | undefined;
      parts.push(`callout(type=${type ?? '?'})`);
    }
    if (editor.isActive('annotation')) {
      const id = editor.getAttributes('annotation').id as string | null;
      parts.push(`annotation(${id ?? '?'})`);
    }
    if (parts.length === 0) {
      parts.push('paragraph');
    }

    // 可用性验证：can() 以 dispatch = undefined 试运行命令
    emit({
      registeredCommands: registered.join(' · ') || '（无）',
      cursorLabel: parts.join(' + '),
      canSetCallout: String(editor.can().setCalloutType({ type: 'warning' })),
    });
    htmlPre.textContent = editor.getHTML();
  }

  function addToolbarButton(label: string, onClick: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cnm-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    toolbar.append(button);
  }

  addToolbarButton('添加批注', () => {
    annotationCount += 1;
    editor.chain().focus().setAnnotation({ id: `note-${annotationCount}` }).run();
  });

  addToolbarButton('移除批注', () => {
    editor.chain().focus().extendMarkRange('annotation').unsetAnnotation().run();
  });

  addToolbarButton('插入 callout', () => {
    editor.chain().focus().insertCallout().run();
  });

  addToolbarButton('切换类型', () => {
    const current = editor.getAttributes('callout').type as CalloutType | undefined;
    const index = CALLOUT_TYPES.indexOf(current ?? 'info');
    const next = CALLOUT_TYPES[(index + 1) % CALLOUT_TYPES.length];
    editor.chain().focus().setCalloutType({ type: next }).run();
  });

  // 每次事务（内容或选区变化）后刷新读数与 HTML 输出
  editor.on('transaction', emitSnapshot);
  emitSnapshot();

  return {
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
