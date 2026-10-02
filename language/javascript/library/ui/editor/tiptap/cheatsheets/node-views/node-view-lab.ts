/**
 * 范例介绍：计数卡实验台——把 CounterCard 装进编辑器，观察 node view 的生命周期。
 * 前置状态：初始 content 里有一张计数卡，走 parseHTML 规则被收进文档；
 *   右侧事件日志由扩展的 onEvent 回调流入。
 * 操作：点卡片头部的 +1 / 归零按钮改属性；点工具栏「插入计数卡」「选中计数卡」；
 *   切换 Controls 的「定义 update 方法」会重建实验台再对照。
 * 预期结果：读数实时显示 count、update / destroy 次数与节点选区状态；事件日志
 *   按序记录创建、复用、重建与选中。定义 update 时点 +1 只多一行 update()；
 *   不定义时点 +1 出现 destroy() + create() 一对——属性变化触发整棵重建。
 * 阅读主线：属性变化 → update（复用）或 destroy + create（重建），就是
 *   node view 生命周期最核心的可观察证据。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import {
  CounterCard,
  counterCardStats,
  type CounterCardEvent,
} from './counter-card';

export interface NodeViewLabArgs {
  withUpdate: boolean;
}

export interface NodeViewLabSnapshot {
  count: string;
  updates: number;
  destroys: number;
  selected: string;
}

export interface NodeViewLabInstance {
  update(args: NodeViewLabArgs): void;
  dispose(): void;
}

const INITIAL_CONTENT = `
<p>点卡片头部的按钮改属性；点进卡片的内容区可以直接编辑文字。</p>
<div data-counter-card data-count="3"><p>这段文字装在 contentDOM 槽位里，由 ProseMirror 托管。</p></div>
<p>卡片之外是普通段落。</p>
`;

const EVENT_LABELS: Record<CounterCardEvent, string> = {
  create: 'create()　　　渲染函数被调用，返回 dom 与 contentDOM',
  update: 'update()　　　属性变化，返回 true 复用现有 DOM',
  destroy: 'destroy()　　节点被移除或编辑器销毁',
  selectNode: 'selectNode()　节点选区选中卡片',
  deselectNode: 'deselectNode() 节点选区移除',
};

export function createNodeViewLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NodeViewLabSnapshot) => void,
): NodeViewLabInstance {
  const frame = document.createElement('div');
  frame.className = 'nv-lab';
  canvas.replaceWith(frame);

  // 顶部：工具按钮行
  const toolbar = document.createElement('div');
  toolbar.className = 'nv-toolbar';

  // 主区：左列编辑器，右列事件日志
  const columns = document.createElement('div');
  columns.className = 'nv-columns';

  const editorBox = document.createElement('div');
  editorBox.className = 'nv-editor';

  const logBox = document.createElement('div');
  logBox.className = 'nv-logbox';
  const logLabel = document.createElement('p');
  logLabel.className = 'nv-box-label';
  logLabel.textContent = 'node view 事件日志';
  const logPre = document.createElement('pre');
  logPre.className = 'nv-log';
  logBox.append(logLabel, logPre);

  columns.append(editorBox, logBox);
  frame.append(toolbar, columns);

  const logLines: string[] = [];

  function log(text: string): void {
    logLines.unshift(text);
    if (logLines.length > 12) {
      logLines.length = 12;
    }
    logPre.textContent = logLines.join('\n');
  }

  function addToolbarButton(label: string, onClick: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nv-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    toolbar.append(button);
  }

  let editor: Editor | undefined;

  function emitSnapshot(): void {
    if (!editor) return;
    // 从文档树读当前 count（文档是真源，别从 node view 的 DOM 里读）
    let count: number | undefined;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'counterCard') {
        count = node.attrs.count;
        return false;
      }
      return true;
    });

    emit({
      count: count === undefined ? '（无计数卡）' : String(count),
      updates: counterCardStats.updated,
      destroys: counterCardStats.destroyed,
      selected: counterCardStats.selected ? '是（节点选区）' : '否',
    });
  }

  function build(args: NodeViewLabArgs): void {
    editor?.destroy();
    logLines.length = 0;
    logPre.textContent = '';
    counterCardStats.created = 0;
    counterCardStats.updated = 0;
    counterCardStats.destroyed = 0;
    counterCardStats.selected = false;

    editor = new Editor({
      element: { mount: editorBox },
      extensions: [
        Document,
        Paragraph,
        Text,
        CounterCard.configure({
          withUpdate: args.withUpdate,
          onEvent: (event) => log(EVENT_LABELS[event]),
        }),
      ],
      content: INITIAL_CONTENT,
    });

    editor.on('transaction', emitSnapshot);
    emitSnapshot();
  }

  addToolbarButton('插入计数卡', () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'counterCard',
        attrs: { count: 0 },
        content: [{ type: 'paragraph' }],
      })
      .run();
  });

  addToolbarButton('选中计数卡', () => {
    if (!editor) return;
    // 制造一个节点选区，观察 selectNode / deselectNode 的触发
    let pos: number | undefined;
    editor.state.doc.descendants((node, nodePos) => {
      if (node.type.name === 'counterCard') {
        pos = nodePos;
        return false;
      }
      return true;
    });
    if (pos === undefined) return;
    editor.chain().focus().setNodeSelection(pos).run();
  });

  build({ withUpdate: true });

  return {
    update(nextArgs) {
      build(nextArgs);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
