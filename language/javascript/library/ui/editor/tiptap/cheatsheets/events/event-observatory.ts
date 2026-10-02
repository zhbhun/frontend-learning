/**
 * 范例介绍：事件观测台——左侧真实编辑器，右侧把每一个事件按发生顺序记录在案（最新在上）。
 * 前置状态：schema 只装 Document、Paragraph、Text；生命周期事件经 options 注册，
 *   beforeTransaction 没有 options 形态，只能用 editor.on() 注册。
 * 操作：打开实例看顶部的 beforeCreate → mount → create 三行；在编辑区打字；
 *   只按方向键移动光标；点击实例外空白处再点回来；粘贴一段文字。
 * 预期结果：打字一次依次出现 beforeTransaction → transaction → selectionUpdate → update；
 *   方向键只有 selectionUpdate（update 不出现）；失焦/聚焦各一行 blur/focus；粘贴多出 paste。
 * 阅读主线：同一操作触发哪串事件、顺序如何，update 为什么只在文档变化时出现。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface ObservatorySnapshot {
  lastEvent: string;
  total: number;
  updates: number;
}

export interface ObservatoryInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text];
const INITIAL_CONTENT =
  '<p>在这里打字，或只按方向键移动光标。</p><p>点击实例外再点回来，试试失焦与聚焦。</p>';
const MAX_LINES = 24;

const KIND_CLASS: Record<string, string> = {
  beforeCreate: 'ev-name--lifecycle',
  mount: 'ev-name--lifecycle',
  create: 'ev-name--lifecycle',
  beforeTransaction: 'ev-name--beforeTransaction',
  transaction: 'ev-name--transaction',
  selectionUpdate: 'ev-name--selectionUpdate',
  update: 'ev-name--update',
  focus: 'ev-name--focus',
  blur: 'ev-name--focus',
  paste: 'ev-name--io',
  drop: 'ev-name--io',
  delete: 'ev-name--io',
};

export function createEventObservatory(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ObservatorySnapshot) => void,
): ObservatoryInstance {
  const frame = document.createElement('div');
  frame.className = 'ev-frame ev-columns ev-frame--captioned';
  canvas.replaceWith(frame);

  // 左列：真实可输入的编辑器
  const editorColumn = document.createElement('div');
  editorColumn.className = 'ev-column';
  const editorLabel = document.createElement('p');
  editorLabel.className = 'ev-box-label';
  editorLabel.textContent = '编辑器（可输入）';
  const host = document.createElement('div');
  host.className = 'ev-editor ev-editor--edit';
  editorColumn.append(editorLabel, host);

  // 右列：事件日志，最新在最上
  const logColumn = document.createElement('div');
  logColumn.className = 'ev-column';
  const logLabel = document.createElement('p');
  logLabel.className = 'ev-box-label';
  logLabel.textContent = '事件日志（最新在上）';
  const log = document.createElement('div');
  log.className = 'ev-log';
  logColumn.append(logLabel, log);

  frame.append(editorColumn, logColumn);

  let seq = 0;
  let total = 0;
  let updates = 0;

  /** 记录一行事件：序号 + 事件名 + 关键读数。 */
  function record(name: string, detail: string): void {
    seq += 1;
    total += 1;

    const line = document.createElement('div');
    line.className = 'ev-line';

    const seqEl = document.createElement('span');
    seqEl.className = 'ev-seq';
    seqEl.textContent = `#${seq}`;

    const nameEl = document.createElement('span');
    nameEl.className = `ev-name ${KIND_CLASS[name] ?? ''}`;
    nameEl.textContent = name;

    const detailEl = document.createElement('span');
    detailEl.className = 'ev-detail';
    detailEl.textContent = detail;

    line.append(seqEl, nameEl, detailEl);
    log.prepend(line);
    while (log.childElementCount > MAX_LINES) {
      log.lastElementChild?.remove();
    }

    emit({ lastEvent: name, total, updates });
  }

  const flag = (value: boolean) => (value ? '✓' : '–');

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
    // 生命周期早期事件只能在 options 里接：beforeCreate 在构造函数内同步发出
    onBeforeCreate() {
      record('beforeCreate', '构造函数内同步发出');
    },
    onMount() {
      record('mount', '视图已挂载（同步）');
    },
    onCreate() {
      record('create', '异步发出 · isInitialized = true');
    },
    onUpdate({ editor, transaction }) {
      updates += 1;
      // editor 已指向新状态；transaction.before 是旧文档
      const before = transaction.before.textContent.length;
      const after = editor.state.doc.textContent.length;
      record('update', `文档真变化 · 字数 ${before} → ${after}`);
    },
    onSelectionUpdate({ transaction }) {
      const { from, to } = transaction.selection;
      record('selectionUpdate', `选区变化 · 位置 ${from}–${to}`);
    },
    onTransaction({ transaction }) {
      record(
        'transaction',
        `doc ${flag(transaction.docChanged)} · sel ${flag(transaction.selectionSet)} · steps ${transaction.steps.length}`,
      );
    },
    onFocus({ event }) {
      record('focus', `原生 ${event.type}`);
    },
    onBlur({ event }) {
      record('blur', `原生 ${event.type}`);
    },
    onPaste(_event, slice) {
      record('paste', `切片大小 ${slice.content.size}`);
    },
    onDrop(_event, slice, moved) {
      record('drop', `切片大小 ${slice.content.size} · moved=${moved}`);
    },
    onDelete(props) {
      record(
        'delete',
        `${props.type === 'node' ? '节点' : '标记'}被删除 · partial=${props.partial}`,
      );
    },
  });

  // beforeTransaction 没有 options 形态：只能用 on() 注册
  editor.on('beforeTransaction', () => {
    record('beforeTransaction', '事务应用前 · editor.state 仍是旧状态');
  });

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接操作编辑器
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
