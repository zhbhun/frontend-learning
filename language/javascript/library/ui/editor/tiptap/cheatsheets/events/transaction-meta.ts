/**
 * 范例介绍：控制一次更新——emitUpdate 静默替换、setMeta 往事务里写自定义标记。
 * 前置状态：schema 只装 Document、Paragraph、Text；日志同时记录 transaction 与 update，
 *   「文档实际变化」按前后 JSON 是否不同统计，「update 次数」按事件计数。
 * 操作：点「setContent 预设 A」（默认）；点「预设 B（emitUpdate: false）」；
 *   点「setMeta 标记导入」；再连续点两次「预设 B」。
 * 预期结果：默认替换后 transaction 与 update 成对出现、两个计数同步加一；静默替换文档确实
 *   变了（字数变了、transaction 显示 doc ✓ 与 meta preventUpdate=true）但 update 不发，
 *   「文档实际变化」与「update 次数」开始分岔；setMeta 导入时 update 行显示 imported 标记；
 *   连续两次预设 B 第二次文档未变，两个计数都不动。
 * 阅读主线：update 只看 preventUpdate meta；transaction 永远发出——需要「每次都收到」时监听它。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface MetaSnapshot {
  docChanges: number;
  updates: number;
  lastMeta: string;
}

export interface MetaInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text];
const INITIAL_CONTENT = '<p>点上方按钮替换或导入内容，观察右侧日志与读数。</p>';

const PRESET_A = '<p>预设 A：默认替换，update 照常发出。</p>';
const PRESET_B = '<p>预设 B：emitUpdate 为 false，文档变了但没有 update。</p>';
const IMPORT_HTML = '<p>这段内容由带 imported 标记的 transaction 导入。</p>';

const MAX_LINES = 24;

const flag = (value: boolean) => (value ? '✓' : '–');

export function createTransactionMeta(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MetaSnapshot) => void,
): MetaInstance {
  const frame = document.createElement('div');
  frame.className = 'ev-frame ev-columns ev-frame--captioned';
  canvas.replaceWith(frame);

  // 左列：编辑器与三个触发按钮
  const editorColumn = document.createElement('div');
  editorColumn.className = 'ev-column';
  const toolbar = document.createElement('div');
  toolbar.className = 'ev-toolbar';
  const editorLabel = document.createElement('p');
  editorLabel.className = 'ev-box-label';
  editorLabel.textContent = '编辑器（可输入）';
  const host = document.createElement('div');
  host.className = 'ev-editor ev-editor--edit';
  editorColumn.append(toolbar, editorLabel, host);

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

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  let seq = 0;
  let docChanges = 0;
  let updates = 0;
  let lastMeta = '—';
  let lastJson = JSON.stringify(editor.getJSON());

  function record(name: string, kindClass: string, detail: string): void {
    seq += 1;

    const line = document.createElement('div');
    line.className = 'ev-line';

    const seqEl = document.createElement('span');
    seqEl.className = 'ev-seq';
    seqEl.textContent = `#${seq}`;

    const nameEl = document.createElement('span');
    nameEl.className = `ev-name ${kindClass}`;
    nameEl.textContent = name;

    const detailEl = document.createElement('span');
    detailEl.className = 'ev-detail';
    detailEl.textContent = detail;

    line.append(seqEl, nameEl, detailEl);
    log.prepend(line);
    while (log.childElementCount > MAX_LINES) {
      log.lastElementChild?.remove();
    }
  }

  /** 列出本课关心的 meta：preventUpdate 与自定义的 imported。 */
  function describeMeta(transaction: { getMeta(key: string): unknown }): string {
    const parts: string[] = [];
    if (typeof transaction.getMeta('preventUpdate') === 'boolean') {
      parts.push(`preventUpdate=${transaction.getMeta('preventUpdate')}`);
    }
    if (transaction.getMeta('imported') !== undefined) {
      parts.push(`imported=${String(transaction.getMeta('imported'))}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'meta 无';
  }

  function emitSnapshot(): void {
    emit({ docChanges, updates, lastMeta });
  }

  // transaction 每次派发都发：静默更新时也在这里出现
  editor.on('transaction', ({ editor, transaction }) => {
    const json = JSON.stringify(editor.getJSON());
    if (json !== lastJson) {
      docChanges += 1;
      lastJson = json;
    }
    lastMeta = describeMeta(transaction);
    record(
      'transaction',
      'ev-name--transaction',
      `doc ${flag(transaction.docChanged)} · sel ${flag(transaction.selectionSet)} · ${lastMeta}`,
    );
    emitSnapshot();
  });

  // update 只在文档真变化且无 preventUpdate 时发出
  editor.on('update', ({ editor, transaction }) => {
    updates += 1;
    const imported = transaction.getMeta('imported');
    const before = transaction.before.textContent.length;
    const after = editor.state.doc.textContent.length;
    record(
      'update',
      'ev-name--update',
      `字数 ${before} → ${after}${imported !== undefined ? ` · 可读到 imported=${String(imported)}` : ''}`,
    );
    emitSnapshot();
  });

  function addToolbarButton(label: string, title: string, run: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ev-btn';
    button.textContent = label;
    button.title = title;
    // mousedown 会抢走编辑器选区：阻止默认行为，点按钮时选区原地保留
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => run());
    toolbar.append(button);
  }

  addToolbarButton('setContent 预设 A', '默认替换：发出 update', () => {
    editor.commands.setContent(PRESET_A);
  });
  addToolbarButton('预设 B（emitUpdate: false）', '静默替换：文档变了但 update 不发', () => {
    editor.commands.setContent(PRESET_B, { emitUpdate: false });
  });
  addToolbarButton('setMeta 标记导入', '在事务上写入 imported 标记后插入内容', () => {
    editor.chain().setMeta('imported', '外部导入').insertContent(IMPORT_HTML).run();
  });

  return {
    update() {
      // 本实例没有 Controls 输入：读者通过按钮触发
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
