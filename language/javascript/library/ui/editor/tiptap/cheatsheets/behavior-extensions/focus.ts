/**
 * 范例介绍：Focus 按 mode 把 has-focus 类挂到「包含光标的节点」的不同层级。
 * 前置状态：schema 装 Document、Paragraph、Text、BulletList、ListItem 与 Focus；
 *   内容是一个两层列表（ul > li > p）；切换 mode 会按新配置重建编辑器。
 * 主要操作：点进列表项文字；切换 mode（all / deepest / shallowest）；点编辑区外让其失焦。
 * 预期结果：聚焦且可编辑时，all 给 ul、li、p 三层都挂类，deepest 只有 p，shallowest 只有
 *   ul；失焦或只读时类整体消失。
 * 阅读主线：Focus 用 node decoration 挂类（样式由 demo.css 提供），mode 决定取到哪几层。
 */
import { Editor } from '@tiptap/core';
import { BulletList, ListItem } from '@tiptap/extension-list';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Focus } from '@tiptap/extensions';

export interface FocusArgs {
  mode: 'all' | 'deepest' | 'shallowest';
}

export interface FocusSnapshot {
  chain: string;
}

export interface FocusInstance {
  update(args: FocusArgs): void;
  dispose(): void;
}

const CONTENT =
  '<ul><li><p>第一项：把光标点进这行文字</p></li><li><p>第二项：对比 mode</p></li></ul>';

export function createFocusDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FocusSnapshot) => void,
): FocusInstance {
  const frame = document.createElement('div');
  frame.className = 'be-frame';
  canvas.replaceWith(frame);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'be-box-label';
  hostLabel.textContent = '编辑器（两层列表：ul > li > p，虚线框 = has-focus）';
  const host = document.createElement('div');
  host.className = 'be-editor';

  const hint = document.createElement('p');
  hint.className = 'be-hint';
  hint.textContent =
    '切换 mode 会重建编辑器（未聚焦），需再点进列表项观察；失焦后类整体消失';

  frame.append(hostLabel, host, hint);

  let editor: Editor | null = null;
  let current: FocusArgs = { mode: 'all' };

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    if (!editor.isFocused) {
      emit({ chain: '未聚焦（类整体消失）' });
      return;
    }
    // document order = 外层在前：ul › li › p
    const chain = Array.from(editor.view.dom.querySelectorAll('.has-focus'))
      .map((el) => el.tagName.toLowerCase())
      .join(' › ');
    emit({ chain: chain || '—' });
  }

  function createEditor(): void {
    editor?.destroy();
    editor = new Editor({
      element: host,
      extensions: [
        Document,
        Paragraph,
        Text,
        BulletList,
        ListItem,
        Focus.configure({ mode: current.mode }),
      ],
      content: CONTENT,
    });
    // 类的挂撤跟随聚焦与选区：任何事务都可能改变结果
    editor.on('transaction', emitSnapshot);
    editor.view.dom.addEventListener('focusin', emitSnapshot);
    editor.view.dom.addEventListener('focusout', emitSnapshot);
    emitSnapshot();
  }

  createEditor();

  return {
    update(args) {
      current = args;
      createEditor();
    },
    dispose() {
      editor?.destroy();
      editor = null;
      frame.remove();
    },
  };
}
