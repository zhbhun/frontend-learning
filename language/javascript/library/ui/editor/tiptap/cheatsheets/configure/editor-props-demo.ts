/**
 * 范例：editorProps.attributes 与 transformPastedText 怎样改变视图层行为。
 * 前置状态：编辑器已创建；本例通过运行期 setOptions 更新 editorProps，视图即时生效。
 * 操作：勾选「attributes 加 class」看编辑区类名与外观变化；从页面其他地方复制一段
 *       文字，勾选「粘贴文本转大写」后粘贴进编辑区。
 * 预期结果：勾选 class 后读数出现 cfg-demo-editor，编辑区左侧出现蓝色竖条背景；
 *           大写开启时粘贴进来的文字全部变为大写。
 * 阅读主线：读数「编辑区 class」「大写转换」与实际外观、粘贴结果。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export interface EditorPropsArgs {
  addClass: boolean;
  uppercasePaste: boolean;
}

export interface EditorPropsSnapshot {
  viewClass: string;
  uppercasePaste: string;
}

export interface EditorPropsInstance {
  update(args: EditorPropsArgs): void;
  dispose(): void;
}

const DEMO_CLASS = 'cfg-demo-editor';
const CONTENT = '<p>把别处的文字复制后粘贴到这里试试。</p>';

export function createEditorPropsDemo(
  stage: HTMLElement,
  emit: (snapshot: EditorPropsSnapshot) => void,
): EditorPropsInstance {
  const frame = document.createElement('div');
  frame.className = 'cfg-frame';
  const label = document.createElement('p');
  label.className = 'cfg-box-label';
  label.textContent = '编辑区（可输入、可粘贴）';
  const host = document.createElement('div');
  host.className = 'cfg-box';
  frame.append(label, host);
  stage.append(frame);

  // editorProps 的当前开关状态；构造时也可以直接传入初始 editorProps
  const state = { addClass: false, uppercasePaste: false };

  const editor = new Editor({
    element: host,
    extensions: [StarterKit],
    content: CONTENT,
  });

  function snapshot(): EditorPropsSnapshot {
    return {
      viewClass: `"${editor.view.dom.getAttribute('class') ?? ''}"`,
      uppercasePaste: state.uppercasePaste ? '开启' : '关闭',
    };
  }

  // attributes 也支持 (state) => 对象 的函数形式，按编辑器状态动态返回属性
  // Tiptap 会固定注入 role="textbox"，再合并你提供的属性
  function apply() {
    editor.setOptions({
      editorProps: {
        attributes: state.addClass ? { class: DEMO_CLASS } : undefined,
        // 返回新字符串即可替换本次粘贴的纯文本；粘贴 HTML 用 transformPastedHTML
        transformPastedText: (text) =>
          state.uppercasePaste ? text.toUpperCase() : text,
      },
    });
    emit(snapshot());
  }

  editor.on('transaction', () => emit(snapshot()));
  apply();

  return {
    update(args) {
      state.addClass = args.addClass;
      state.uppercasePaste = args.uppercasePaste;
      apply();
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
