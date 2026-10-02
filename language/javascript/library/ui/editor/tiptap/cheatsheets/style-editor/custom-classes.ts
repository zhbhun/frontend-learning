/**
 * 范例：对比自定义类进入 DOM 的三个入口——根元素、节点属性、renderHTML 换标签。
 * 前置状态：演示内容包含普通段落与加粗文字；切入口时编辑器按新模式重建。
 * 主要操作：切换「类入口」（root / node / tag）。
 * 预期结果：root 模式根 class 多出 lesson-editor；node 模式每个段落挂 lead；
 *   tag 模式加粗标记从 <strong> 变成 <b>。
 * 阅读主线：classMode → buildEditor(mode) → 读数对照根元素、段落、加粗标签。
 */
import { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Paragraph from '@tiptap/extension-paragraph';
import StarterKit from '@tiptap/starter-kit';

export type ClassMode = 'root' | 'node' | 'tag';

export interface CustomClassesArgs {
  classMode: ClassMode;
}

export interface CustomClassesSnapshot {
  rootClass: string;
  firstParagraphClass: string;
  boldTag: string;
}

export interface CustomClassesInstance {
  update(args: CustomClassesArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>段落由 schema 渲染成 &lt;p&gt;。</p><p>加粗的<strong>样式钩子</strong>也在这。</p>';

// 入口 2：节点属性——给段落扩展补一个默认 class
const LeadParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: { default: 'lead' },
    };
  },
});

// 入口 3：renderHTML 换标签——加粗标记输出 <b> 而不是 <strong>
const BoldAsB = Bold.extend({
  renderHTML({ HTMLAttributes }) {
    // 0 是内容占位符，表示子节点渲染到这里
    return ['b', HTMLAttributes, 0];
  },
});

function buildEditor(element: HTMLElement, mode: ClassMode): Editor {
  if (mode === 'root') {
    // 入口 1：editorProps.attributes.class 落在根元素上
    return new Editor({
      element,
      extensions: [StarterKit],
      content: CONTENT,
      editorProps: {
        attributes: { class: 'lesson-editor' },
      },
    });
  }
  if (mode === 'node') {
    // 同名扩展会冲突：先从 StarterKit 排除 paragraph，再放自定义版本
    return new Editor({
      element,
      extensions: [StarterKit.configure({ paragraph: false }), LeadParagraph],
      content: CONTENT,
    });
  }
  return new Editor({
    element,
    extensions: [StarterKit.configure({ bold: false }), BoldAsB],
    content: CONTENT,
  });
}

export function createCustomClassesDemo(
  stage: HTMLElement,
  emit: (snapshot: CustomClassesSnapshot) => void,
): CustomClassesInstance {
  const frame = document.createElement('div');
  frame.className = 'se-frame';

  const label = document.createElement('p');
  label.className = 'se-box-label';
  label.textContent = '编辑区（真实 Tiptap 编辑器）';

  const box = document.createElement('div');
  box.className = 'se-box';
  const host = document.createElement('div');
  box.append(host);

  const hint = document.createElement('p');
  hint.className = 'se-hint';
  hint.textContent = '切换「类入口」控件，对照读数里三层的 class 变化';

  frame.append(label, box, hint);
  stage.append(frame);

  let editor: Editor | null = null;
  let current: CustomClassesArgs = { classMode: 'root' };

  function emitSnapshot() {
    if (!editor) {
      return;
    }
    const dom = editor.view.dom;
    emit({
      rootClass: dom.className,
      firstParagraphClass: dom.querySelector('p')?.className || '（无）',
      boldTag: dom.querySelector('strong, b')?.tagName ?? '—',
    });
  }

  function render() {
    editor?.destroy();
    editor = buildEditor(host, current.classMode);
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
