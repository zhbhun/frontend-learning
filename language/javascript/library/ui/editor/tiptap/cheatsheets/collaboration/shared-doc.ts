/**
 * 范例介绍：两个编辑器接同一个 Y.Doc，不开网络也能实时同步——验证 Y.Doc 才是协作真源。
 * 前置状态：schema 为 Document、Paragraph、Text、Heading、Bold；两个编辑器给了两份不同的初始 content。
 * 操作：在任一编辑区打字，观察另一侧；用「连接方式」切到「各自独立 Y.Doc」再对比。
 * 预期结果：共享模式下 A、B 始终一致，且双方都以先写入 Y.Doc 的那份初始内容为准
 *   （后建编辑器的 content 被忽略）；独立模式各改各的，clientId 也一分为二。
 *   「Y.Doc update 次数」在建好时就非 0——初始 content 被写进了 Y.Doc。
 * 阅读主线：同步来自共享 Y.Doc，而不是来自 provider——provider 只是把 update 搬到别处。
 */
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Collaboration } from '@tiptap/extension-collaboration';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import * as Y from 'yjs';

import './demo.css';

export type LinkMode = 'shared' | 'separate';

export interface SharedDocArgs {
  mode: LinkMode;
}

export interface SharedDocSnapshot {
  modeLabel: string;
  inSync: string;
  updateCount: string;
  clientId: string;
}

export interface SharedDocInstance {
  update(args: SharedDocArgs): void;
  dispose(): void;
}

const BASE_EXTENSIONS = [Document, Paragraph, Text, Heading, Bold];

// 两份初始 content 刻意不同：共享模式下只有先写入 Y.Doc 的那份能活下来
const CONTENT_A = '<h3>甲编辑器的初始内容</h3><p>这一份先写进 Y.Doc。</p>';
const CONTENT_B = '<h3>乙编辑器的初始内容</h3><p>片段非空时这份会被忽略。</p>';

export function createSharedDocDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SharedDocSnapshot) => void,
): SharedDocInstance {
  const frame = document.createElement('div');
  frame.className = 'col-frame col-columns';
  canvas.replaceWith(frame);

  const columns = ['A', 'B'].map((name) => {
    const column = document.createElement('div');
    column.className = 'col-column';
    const label = document.createElement('p');
    label.className = 'col-label';
    label.textContent = `编辑器 ${name}`;
    const host = document.createElement('div');
    host.className = 'col-editor col-editor--edit';
    column.append(label, host);
    frame.append(column);
    return { host };
  });

  let docs: Y.Doc[] = [];
  let editors: Editor[] = [];
  let updateCounts: number[] = [];
  let mode: LinkMode = 'shared';

  function emitSnapshot(): void {
    if (editors.length < 2) {
      return;
    }
    const shared = mode === 'shared';
    emit({
      modeLabel: shared ? '共享一个 Y.Doc' : '各自独立 Y.Doc',
      inSync: editors[0].getText() === editors[1].getText() ? '是' : '否',
      updateCount: shared
        ? `${updateCounts[0]} 次`
        : `A ${updateCounts[0]}、B ${updateCounts[1]} 次`,
      clientId: shared
        ? `${docs[0].clientID}（A、B 共用）`
        : `${docs[0].clientID} / ${docs[1].clientID}`,
    });
  }

  // 切换连接方式时整体重建：文档与编辑器都必须重开，才能对照两种接法
  function build(nextMode: LinkMode): void {
    editors.forEach((editor) => editor.destroy());
    docs.forEach((doc) => doc.destroy());
    editors = [];
    docs = [];
    mode = nextMode;

    // 共享模式只有一个文档、两个编辑器都接它；独立模式各建一份
    docs = mode === 'shared' ? [new Y.Doc()] : [new Y.Doc(), new Y.Doc()];
    updateCounts = docs.map(() => 0);

    docs.forEach((ydoc, index) => {
      // update 事件是变更离开 Y.Doc 的唯一出口：provider 搬运的就是它
      ydoc.on('update', () => {
        updateCounts[index] += 1;
        emitSnapshot();
      });
    });

    columns.forEach((column, index) => {
      const ydoc = mode === 'shared' ? docs[0] : docs[index];
      const editor = new Editor({
        element: column.host,
        extensions: [
          ...BASE_EXTENSIONS,
          // 每个编辑器都要自己的 Collaboration 实例，指向（可能共享的）文档
          Collaboration.configure({ document: ydoc }),
        ],
        content: index === 0 ? CONTENT_A : CONTENT_B,
      });
      editor.on('update', emitSnapshot);
      editors.push(editor);
    });

    emitSnapshot();
  }

  build('shared');

  return {
    update(args) {
      if (args.mode !== mode) {
        build(args.mode);
      }
    },
    dispose() {
      editors.forEach((editor) => editor.destroy());
      docs.forEach((doc) => doc.destroy());
      frame.remove();
    },
  };
}
