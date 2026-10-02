/**
 * 范例：看清 Tiptap 编辑器写入挂载元素的真实 DOM 与注入的引擎基线样式。
 * 前置状态：StarterKit 编辑器挂在页面盒子里（挂载方式见 1.3 第一个编辑器）。
 * 主要操作：在编辑区里打字、聚焦；读数持续显示根元素属性。
 * 预期结果：根元素 class 恒为 "tiptap ProseMirror" 开头，聚焦时多出
 *   ProseMirror-focused；white-space 计算值 break-spaces 来自 injectCSS 注入的样式。
 * 阅读主线：new Editor → editor.view.dom 读取 → 文档头里找 style[data-tiptap-style]。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export interface ViewDomSnapshot {
  rootClass: string;
  editableAttrs: string;
  whiteSpace: string;
  injectedStyle: string;
}

export interface ViewDomInstance {
  dispose(): void;
}

export function createViewDomDemo(
  stage: HTMLElement,
  emit: (snapshot: ViewDomSnapshot) => void,
): ViewDomInstance {
  const frame = document.createElement('div');
  frame.className = 'se-frame';

  const label = document.createElement('p');
  label.className = 'se-box-label';
  label.textContent = '挂载元素 .element（真实 Tiptap 编辑器）';

  const box = document.createElement('div');
  box.className = 'se-box';
  const host = document.createElement('div');
  box.append(host);

  const hint = document.createElement('p');
  hint.className = 'se-hint';
  hint.textContent = '点击输入试试：内容渲染成普通 HTML，聚焦时根元素多出 ProseMirror-focused';

  frame.append(label, box, hint);
  stage.append(frame);

  const editor = new Editor({
    element: host,
    extensions: [StarterKit],
    content: '<p>你好，Tiptap！<strong>样式</strong>写在普通 HTML 上。</p>',
  });

  function emitSnapshot() {
    const dom = editor.view.dom;
    const contenteditable = dom.getAttribute('contenteditable');
    const tabindex = dom.getAttribute('tabindex');
    emit({
      rootClass: dom.className,
      editableAttrs: `contenteditable=${contenteditable ?? '—'} · tabindex=${tabindex ?? '—'}`,
      // 引擎基线样式（injectCSS 默认注入）生效的痕迹：white-space 由它保证
      whiteSpace: getComputedStyle(dom).whiteSpace,
      injectedStyle: document.querySelector('style[data-tiptap-style]') ? '存在' : '不存在',
    });
  }

  // 聚焦/失焦会改变根元素 class（ProseMirror-focused），监听后读数保持最新
  editor.on('focus', emitSnapshot);
  editor.on('blur', emitSnapshot);
  emitSnapshot();

  return {
    dispose() {
      editor.destroy();
    },
  };
}
