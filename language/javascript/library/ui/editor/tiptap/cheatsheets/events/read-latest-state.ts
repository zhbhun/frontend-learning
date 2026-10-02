/**
 * 范例介绍：update 回调里读取最新文档状态——editor 已指向新状态，旧文档从 transaction.before 读。
 * 前置状态：schema 只装 Document、Paragraph、Text；右侧模拟保存面板由 editor.on('update') 驱动刷新。
 * 操作：在编辑区打字、删除、回车另起一段。
 * 预期结果：每次文档变化，「更新前字数」读自 transaction.before（旧），「更新后字数」读自
 *   editor.state（新）；保存面板同步记录最新 getJSON() 快照、isEmpty 与段落数。
 * 阅读主线：同一个回调里的两种读法拿到新旧两份状态——判断「本次改了什么」用 before，
 *   写存储用 editor 上的最新状态。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface ReadStateSnapshot {
  beforeLabel: string;
  afterLabel: string;
  isEmpty: boolean;
  paragraphs: number;
}

export interface ReadStateInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text];
const INITIAL_CONTENT = '<p>在这里打字、删除、回车。</p><p>右侧面板随 update 事件刷新。</p>';

function formatTime(date: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function createReadLatestState(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ReadStateSnapshot) => void,
): ReadStateInstance {
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

  // 右列：模拟保存面板——持久化的标准形态
  const panelColumn = document.createElement('div');
  panelColumn.className = 'ev-column';
  const panelLabel = document.createElement('p');
  panelLabel.className = 'ev-box-label';
  panelLabel.textContent = '模拟保存面板 · update 回调内读取';
  const statsLine = document.createElement('p');
  statsLine.className = 'ev-stats';
  const snapshotPre = document.createElement('pre');
  snapshotPre.className = 'ev-pre';
  panelColumn.append(panelLabel, statsLine, snapshotPre);

  frame.append(editorColumn, panelColumn);

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  function renderPanel(beforeChars: number | null): void {
    const json = editor.getJSON();
    const isEmpty = editor.isEmpty;
    const paragraphs = editor.state.doc.childCount;
    const after = editor.state.doc.textContent.length;

    // 初始渲染没有 transaction：保存时间与更新前字数显示「—」
    statsLine.textContent = `保存于 ${beforeChars === null ? '—' : formatTime(new Date())} · isEmpty ${isEmpty} · 段落 ${paragraphs}`;
    snapshotPre.textContent = JSON.stringify(json, null, 2);

    emit({
      beforeLabel: beforeChars === null ? '—' : `${beforeChars} 字`,
      afterLabel: `${after} 字`,
      isEmpty,
      paragraphs,
    });
  }

  renderPanel(null);

  editor.on('update', ({ editor, transaction }) => {
    // editor 已是新状态；transaction.before 是本次变化前的文档
    renderPanel(transaction.before.textContent.length);
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
