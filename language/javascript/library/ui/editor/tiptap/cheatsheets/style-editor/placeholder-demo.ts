/**
 * 范例：观察 Placeholder 扩展怎样把占位符落到空段落上。
 * 前置状态：初始为空文档（一个空段落）；Placeholder 已注册，显示 CSS 在 demo.css。
 * 主要操作：切换文案与 showOnlyCurrent；在编辑区输入、回车出新行、删空。
 * 预期结果：空段落挂 is-empty（整篇为空再加 is-editor-empty）与 data-placeholder
 *   属性，::before 显示文案；showOnlyCurrent 关闭后每个空段落都挂类。
 * 阅读主线：extensions 注册 Placeholder → 读 DOM 上实际挂的类与属性 → 对照编辑区视觉。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';

export interface PlaceholderArgs {
  placeholder: string;
  showOnlyCurrent: boolean;
}

export interface PlaceholderSnapshot {
  emptyClass: string;
  dataPlaceholder: string;
  isEmpty: string;
}

export interface PlaceholderInstance {
  update(args: PlaceholderArgs): void;
  dispose(): void;
}

export function createPlaceholderDemo(
  stage: HTMLElement,
  emit: (snapshot: PlaceholderSnapshot) => void,
): PlaceholderInstance {
  const frame = document.createElement('div');
  frame.className = 'se-frame';

  const label = document.createElement('p');
  label.className = 'se-box-label';
  label.textContent = '编辑区（真实 Tiptap 编辑器 + Placeholder）';

  const box = document.createElement('div');
  box.className = 'se-box';
  const host = document.createElement('div');
  box.append(host);

  const hint = document.createElement('p');
  hint.className = 'se-hint';
  hint.textContent = '输入文字、回车出新行、删空：占位符与读数跟着选区和文档状态走';

  frame.append(label, box, hint);
  stage.append(frame);

  let editor: Editor | null = null;
  let current: PlaceholderArgs = { placeholder: '写点什么吧…', showOnlyCurrent: true };

  function emitSnapshot() {
    if (!editor) {
      return;
    }
    const dom = editor.view.dom;
    const emptyEl = dom.querySelector<HTMLElement>('.is-empty, .is-editor-empty');
    emit({
      emptyClass: emptyEl?.className || '（无空段落）',
      dataPlaceholder: emptyEl?.getAttribute('data-placeholder') ?? '—',
      isEmpty: editor.isEmpty ? 'true（整篇为空）' : 'false',
    });
  }

  function render() {
    editor?.destroy();
    editor = new Editor({
      element: host,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: current.placeholder,
          showOnlyCurrent: current.showOnlyCurrent,
        }),
      ],
      content: '<p></p>',
    });
    // 占位符跟随文档与选区状态：输入、回车、移动光标都会改变挂类结果
    editor.on('update', emitSnapshot);
    editor.on('selectionUpdate', emitSnapshot);
    emitSnapshot();
  }

  render();

  return {
    update(args) {
      current = args;
      render();
    },
    dispose() {
      editor?.destroy();
      editor = null;
    },
  };
}
