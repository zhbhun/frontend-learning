/**
 * 范例介绍：直接调用与链式执行对事务的影响——同样的两条命令，update 事件次数不同。
 * 前置状态：schema 只装 Document、Paragraph、Text、Bold、Highlight；编辑器可编辑。
 * 操作：两个按钮各执行同样的三步（选中整段、toggleBold、toggleHighlight）——一个直接调用，一个链式执行。
 * 预期结果：直接调用触发 2 次 update 事件，链式执行只触发 1 次；两种方式的最终格式状态相同。
 * 阅读主线：为什么链式执行只计 1 次——链把多条命令合并进同一个事务，run() 时一次提交。
 */
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Highlight } from '@tiptap/extension-highlight';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface ChainTransactionSnapshot {
  updateCount: number;
  boldActive: boolean;
  highlightActive: boolean;
}

export interface ChainTransactionInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Bold, Highlight];
const CONTENT = '<p>链式调用把多条命令合并进同一个事务。</p>';

export function createChainTransactionDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChainTransactionSnapshot) => void,
): ChainTransactionInstance {
  const frame = document.createElement('div');
  frame.className = 'cmd-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'cmd-toolbar';
  const directButton = document.createElement('button');
  directButton.type = 'button';
  directButton.className = 'cmd-btn';
  directButton.textContent = '直接调用两条命令';
  const chainedButton = document.createElement('button');
  chainedButton.type = 'button';
  chainedButton.className = 'cmd-btn';
  chainedButton.textContent = '链式执行两条命令';
  toolbar.append(directButton, chainedButton);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'cmd-box-label';
  hostLabel.textContent = '编辑器（点按钮后观察加粗、高亮读数）';
  const host = document.createElement('div');
  host.className = 'cmd-editor cmd-editor--edit';

  frame.append(toolbar, hostLabel, host);

  let editor: Editor | null = null;

  function createEditor(): void {
    editor = new Editor({
      element: host,
      extensions: EXTENSIONS,
      content: CONTENT,
    });
  }

  function emitSnapshot(updateCount: number): void {
    emit({
      updateCount,
      boldActive: editor?.isActive('bold') ?? false,
      highlightActive: editor?.isActive('highlight') ?? false,
    });
  }

  // update 事件只在文档变化时触发；统计一次操作期间触发的次数
  function countUpdateEvents(action: () => void): number {
    let count = 0;
    const handler = () => {
      count += 1;
    };
    editor?.on('update', handler);
    action();
    editor?.off('update', handler);
    return count;
  }

  // 选中整段文字：空选区时 toggle 命令只改「下一次输入」的格式，不改变文档
  function paragraphRange(): { from: number; to: number } {
    const doc = editor!.state.doc;
    return { from: 1, to: doc.content.size - 1 };
  }

  directButton.addEventListener('click', () => {
    if (!editor) {
      return;
    }
    const count = countUpdateEvents(() => {
      // 直接调用：每条命令立即提交一个事务
      editor!.commands.setTextSelection(paragraphRange());
      editor!.commands.toggleBold();
      editor!.commands.toggleHighlight();
    });
    emitSnapshot(count);
  });

  chainedButton.addEventListener('click', () => {
    if (!editor) {
      return;
    }
    const count = countUpdateEvents(() => {
      // 链式执行：所有命令共享同一个事务，run() 时一次提交
      editor!
        .chain()
        .focus()
        .setTextSelection(paragraphRange())
        .toggleBold()
        .toggleHighlight()
        .run();
    });
    emitSnapshot(count);
  });

  createEditor();

  return {
    update() {
      emitSnapshot(0);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
