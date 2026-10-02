/**
 * 范例介绍：看清 Tiptap 注入编辑区的 ARIA 底座，并演示 aria-label 怎么补。
 * 前置状态：StarterKit 编辑器。role="textbox" 由 @tiptap/core 在创建视图和应用属性时
 *   并入 editorProps.attributes；tabindex="0" 来自核心扩展 Tabindex（可编辑时才有）；
 *   contenteditable 随 editable 选项由 prosemirror-view 写入。
 * 主要操作：在控件里输入或清空 aria-label，运行期经 setOptions 更新编辑区属性。
 * 预期结果：role 恒为 textbox；aria-label 随输入出现、清空后从 DOM 移除；
 *   tabindex 与 contenteditable 全程不变。
 * 阅读主线：editor.view.dom 的实际属性 → 核心注入与你补的属性如何共存。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export interface AriaAttributesArgs {
  ariaLabel: string;
}

export interface AriaAttributesSnapshot {
  role: string;
  tabindex: string;
  contenteditable: string;
  ariaLabel: string;
}

export interface AriaAttributesInstance {
  update(args: AriaAttributesArgs): void;
  dispose(): void;
}

export function createAriaAttributesDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AriaAttributesSnapshot) => void,
): AriaAttributesInstance {
  const frame = document.createElement('div');
  frame.className = 'ax-frame';

  const hint = document.createElement('p');
  hint.className = 'ax-hint';
  hint.textContent =
    '编辑区可输入；role / tabindex / contenteditable 三项由 Tiptap 注入，aria-label 随控件变化。';

  const container = document.createElement('div');
  container.className = 'ax-editor';
  frame.append(hint, container);
  canvas.replaceWith(frame);

  const editor = new Editor({
    element: container,
    extensions: [StarterKit],
    content: '<p>一页有多个编辑器时，读屏用户靠 aria-label 区分它们。</p>',
  });

  function snapshot(): AriaAttributesSnapshot {
    const dom = editor.view.dom;
    return {
      role: dom.getAttribute('role') ?? '—',
      tabindex: dom.getAttribute('tabindex') ?? '—',
      contenteditable: dom.getAttribute('contenteditable') ?? '—',
      ariaLabel: dom.getAttribute('aria-label') ?? '未设置',
    };
  }

  function applyAttributes(args: AriaAttributesArgs): void {
    const label = args.ariaLabel.trim();
    editor.setOptions({
      editorProps: {
        // setOptions 会整体替换 editorProps；attributes 传 undefined 即移除自定义属性，
        // role="textbox" 由核心在下次应用属性时重新并入，不会丢
        attributes: label ? { 'aria-label': label } : undefined,
      },
    });
    emit(snapshot());
  }

  emit(snapshot());

  return {
    update(args) {
      applyAttributes(args);
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
