/**
 * 范例介绍：insertTable 的建表参数与表格编辑命令全家福。
 * 前置状态：装 Table（resizable 由控件开关）、TableRow、TableHeader、TableCell；
 *   每次参数变化都重建一张新表，光标落在表内（命令以「光标所在的表格」为作用对象）。
 * 操作：调整「行数 / 列数 / 含表头行 / resizable」重建表格；点工具条命令编辑；
 *   mergeOrSplit 前先拖选两个单元格。
 * 预期结果：「表格尺寸」「含表头行」读数与表格一致；resizable 开启后拖列边界可改列宽。
 * 阅读主线：表格命令都围绕光标所在表格工作，Tab 在表格内是跳格命令。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Text } from '@tiptap/extension-text';
import type { Node as PMNode } from '@tiptap/pm/model';
import './demo.css';

export interface TableLabArgs {
  rows: number;
  cols: number;
  withHeaderRow: boolean;
  resizable: boolean;
}

export interface TableLabSnapshot {
  sizeLabel: string;
  hasHeader: string;
  inTable: string;
}

export interface TableLabInstance {
  update(args: TableLabArgs): void;
  dispose(): void;
}

const BUTTONS: Array<{ label: string; run: (editor: Editor) => boolean }> = [
  {
    label: 'addRowAfter',
    run: (ed) => ed.chain().focus().addRowAfter().run(),
  },
  {
    label: 'addColumnAfter',
    run: (ed) => ed.chain().focus().addColumnAfter().run(),
  },
  { label: 'deleteRow', run: (ed) => ed.chain().focus().deleteRow().run() },
  {
    label: 'deleteColumn',
    run: (ed) => ed.chain().focus().deleteColumn().run(),
  },
  {
    label: 'toggleHeaderRow',
    run: (ed) => ed.chain().focus().toggleHeaderRow().run(),
  },
  {
    label: 'mergeOrSplit',
    run: (ed) => ed.chain().focus().mergeOrSplit().run(),
  },
  {
    label: 'deleteTable',
    run: (ed) => ed.chain().focus().deleteTable().run(),
  },
];

export function createTableLabDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TableLabSnapshot) => void,
): TableLabInstance {
  const frame = document.createElement('div');
  frame.className = 'ce-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'ce-toolbar';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'ce-box-label';
  hostLabel.textContent = '编辑器（可编辑，mergeOrSplit 前先拖选两个单元格）';
  const host = document.createElement('div');
  host.className = 'ce-editor';

  frame.append(toolbar, hostLabel, host);

  let editor: Editor | null = null;

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }

    // 找文档里的第一张表：本范例始终只有一张表（deleteTable 后为 null）
    let table: PMNode | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'table') {
        table = node;
        return false; // 不再深入表格内部
      }
      return true;
    });
    // 回调里的赋值不参与外层控制流分析，这里显式还原 table 的类型
    table = table as PMNode | null;

    const { $from } = editor.state.selection;
    let inTable = false;
    for (let d = $from.depth; d > 0; d -= 1) {
      if ($from.node(d).type.name === 'table') {
        inTable = true;
        break;
      }
    }

    if (!table) {
      emit({ sizeLabel: '—（表已删除）', hasHeader: '—', inTable: '否' });
      return;
    }

    // 表头行 = 首行首格是 tableHeader 节点（th）
    const firstRow = table.firstChild;
    const firstCellName = firstRow?.firstChild?.type.name ?? '';

    emit({
      sizeLabel: `${table.childCount} 行 × ${firstRow?.childCount ?? 0} 列`,
      hasHeader: firstCellName === 'tableHeader' ? '是' : '否',
      inTable: inTable ? '是' : '否',
    });
  }

  for (const button of BUTTONS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ce-btn';
    el.textContent = button.label;
    el.addEventListener('click', () => {
      if (editor) {
        button.run(editor);
      }
    });
    toolbar.append(el);
  }

  function rebuild(args: TableLabArgs): void {
    editor?.destroy();
    host.replaceChildren();

    editor = new Editor({
      element: host,
      extensions: [
        Document,
        Paragraph,
        Text,
        Table.configure({ resizable: args.resizable }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: '', // 空文档起步
    });
    editor.on('transaction', emitSnapshot);

    // 与正文一致：用 insertTable 命令建表（不传参时默认 3×3 含表头行）
    editor
      .chain()
      .insertTable({
        rows: args.rows,
        cols: args.cols,
        withHeaderRow: args.withHeaderRow,
      })
      .run();
    emitSnapshot();
  }

  rebuild({ rows: 3, cols: 3, withHeaderRow: true, resizable: false });

  return {
    update(args) {
      rebuild(args);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
