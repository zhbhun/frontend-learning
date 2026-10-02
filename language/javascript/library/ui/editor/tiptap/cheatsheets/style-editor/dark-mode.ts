/**
 * 范例：演示"主题类 + CSS 变量"的深色模式通行做法。
 * 前置状态：StarterKit 编辑器；全部配色定义在 demo.css 的 CSS 变量里。
 * 主要操作：切换「深色模式」，编辑器重建时经 editorProps.attributes.class
 *   在根元素上挂/撤 dark 类。
 * 预期结果：根元素 class 带 dark 时 --se-* 变量翻转，编辑区变为深色。
 * 阅读主线：editorProps.attributes.class → 根元素 class → 计算后的变量值。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export interface DarkModeArgs {
  dark: boolean;
}

export interface DarkModeSnapshot {
  rootClass: string;
  fgVariable: string;
  bgVariable: string;
}

export interface DarkModeInstance {
  update(args: DarkModeArgs): void;
  dispose(): void;
}

const CONTENT =
  '<h2>深浅主题由你决定</h2><p>正文里的<strong>强调文字</strong>、<code>代码</code>和背景色都走 CSS 变量。</p>';

export function createDarkModeDemo(
  stage: HTMLElement,
  emit: (snapshot: DarkModeSnapshot) => void,
): DarkModeInstance {
  const frame = document.createElement('div');
  frame.className = 'se-frame';

  const label = document.createElement('p');
  label.className = 'se-box-label';
  label.textContent = '编辑区（真实 Tiptap 编辑器，主题类挂在根元素上）';

  const box = document.createElement('div');
  box.className = 'se-box';
  const host = document.createElement('div');
  box.append(host);

  const hint = document.createElement('p');
  hint.className = 'se-hint';
  hint.textContent = '切换「深色模式」：变量取值翻转，选择器本身不变';

  frame.append(label, box, hint);
  stage.append(frame);

  let editor: Editor | null = null;
  let current: DarkModeArgs = { dark: false };

  function emitSnapshot() {
    if (!editor) {
      return;
    }
    const dom = editor.view.dom;
    emit({
      rootClass: dom.className,
      fgVariable: getComputedStyle(dom).getPropertyValue('--se-fg').trim(),
      bgVariable: getComputedStyle(dom).getPropertyValue('--se-bg').trim(),
    });
  }

  function render() {
    editor?.destroy();
    editor = new Editor({
      element: host,
      extensions: [StarterKit],
      content: CONTENT,
      editorProps: {
        // 主题类的官方入口：与 prose 类、业务类同一个落点
        attributes: { class: current.dark ? 'dark' : '' },
      },
    });
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
