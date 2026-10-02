/**
 * 范例介绍：焦点与选区是两件事——blur 只带走浏览器焦点，state.selection 原地保留。
 * 前置状态：可编辑编辑器，装 Document、Paragraph、Text、Bold。
 * 操作：先拖选第一行文字，依次点「toggleBold() 普通按钮」「toggleBold() + focus()」
 *   「blur()」「focus('end')」，对比 isFocused 与 from/to 两列读数。
 * 预期结果：普通按钮让文字变粗但抢走焦点（isFocused 变 false）；补上 focus() 焦点不丢；
 *   blur() 后光标高亮消失但 from/to 不变；focus('end') 把光标移到文末并聚焦。
 * 阅读主线：isFocused 怎么变、from/to 为什么原地不动。
 */
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { AllSelection, NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Selection } from '@tiptap/pm/state';

export interface FocusDemoSnapshot {
  focused: string;
  fromTo: string;
  typeLabel: string;
}

export interface FocusDemoInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Bold];

const INITIAL_CONTENT =
  '<p>先拖选这行文字，再点上方按钮对比焦点行为。</p>' +
  '<p>focus() 会把光标搬回原位。</p>';

function selectionTypeLabel(selection: Selection): string {
  if (selection instanceof AllSelection) {
    return 'AllSelection';
  }
  if (selection instanceof NodeSelection) {
    return 'NodeSelection';
  }
  if (selection instanceof TextSelection) {
    return selection.empty ? 'TextSelection 光标' : 'TextSelection';
  }
  return 'Selection';
}

export function createFocusDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FocusDemoSnapshot) => void,
): FocusDemoInstance {
  const frame = document.createElement('div');
  frame.className = 'sel-frame';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'sel-hint';
  hint.textContent = '普通按钮（mousedown 不拦截）会像真实工具栏一样抢走焦点';
  const toolbar = document.createElement('div');
  toolbar.className = 'sel-toolbar';
  const host = document.createElement('div');
  host.className = 'sel-editor';
  frame.append(hint, toolbar, host);

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  function snapshot(): FocusDemoSnapshot {
    const selection = editor.state.selection;
    return {
      focused: editor.isFocused ? '是' : '否',
      fromTo: `${selection.from} – ${selection.to}`,
      typeLabel: selectionTypeLabel(selection),
    };
  }

  // 焦点变化由 focus / blur 事件带来，命令由 transaction 事件带来
  const refresh = () => emit(snapshot());
  editor.on('focus', refresh);
  editor.on('blur', refresh);
  editor.on('transaction', refresh);
  editor.on('selectionUpdate', refresh);
  emit(snapshot());

  function addButton(label: string, title: string, run: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sel-btn';
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', () => run());
    toolbar.append(button);
  }

  // 经典工具栏 bug：点击按钮 → 浏览器把焦点给按钮 → 文字变粗但光标消失
  addButton('toggleBold() 普通按钮', '不拦截 mousedown，焦点会被按钮抢走', () => {
    editor.commands.toggleBold();
  });
  // 修复版：命令链补上 focus()，执行完焦点回到编辑器
  addButton('toggleBold() + focus()', '命令链末尾用 focus() 把焦点送回编辑器', () => {
    editor.chain().focus().toggleBold().run();
  });
  addButton('blur()', '移除焦点：高亮消失，state.selection 原地保留', () => {
    editor.commands.blur();
  });
  addButton("focus('end')", '聚焦并把光标移到文档末尾', () => {
    editor.commands.focus('end');
  });

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接操作编辑器与按钮
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
