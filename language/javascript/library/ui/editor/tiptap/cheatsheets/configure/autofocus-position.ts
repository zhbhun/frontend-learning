/**
 * 范例：autofocus 各取值把初始光标/选区放在哪里。
 * 前置状态：编辑器含两段文字；切换取值会以对应 autofocus 重建编辑器。
 * 操作：切换「autofocus 取值」观察光标与选区；切到 false 后用鼠标点击编辑区对比。
 * 预期结果：'start' 光标在开头，'end' 在末尾，'all' 全选整篇，false 不自动聚焦；
 *           只有编辑区获得焦点时，「聚焦元素」读数才是编辑区本体。
 * 阅读主线：读数「聚焦元素」「选区范围」与编辑区内可见的光标/蓝色选区。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export type AutofocusMode = 'false' | 'start' | 'end' | 'all';

export interface AutofocusArgs {
  mode: AutofocusMode;
}

export interface AutofocusSnapshot {
  focused: string;
  selection: string;
}

export interface AutofocusInstance {
  update(args: AutofocusArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>autofocus 决定初始光标落点。</p><p>这是第二段，用来观察 “end” 与 “all” 的效果。</p>';

// FocusPosition 完整取值：'start' | 'end' | 'all' | 位置数字 | true | false | null
// true 等价 'start'；false 与 null 都表示不自动聚焦
function toFocusPosition(mode: AutofocusMode): 'start' | 'end' | 'all' | false {
  return mode === 'false' ? false : mode;
}

export function createAutofocusDemo(
  stage: HTMLElement,
  emit: (snapshot: AutofocusSnapshot) => void,
): AutofocusInstance {
  const frame = document.createElement('div');
  frame.className = 'cfg-frame';
  const label = document.createElement('p');
  label.className = 'cfg-box-label';
  label.textContent = '编辑区（观察光标与选区）';
  const host = document.createElement('div');
  host.className = 'cfg-box';
  frame.append(label, host);
  stage.append(frame);

  let editor: Editor | null = null;
  let current: AutofocusMode | null = null;

  function snapshot(): AutofocusSnapshot {
    if (!editor) {
      return { focused: '—', selection: '—' };
    }
    const dom = editor.view.dom;
    const active = document.activeElement;
    const focused =
      active === dom ? '编辑区（已聚焦）' : '其他元素（编辑区未聚焦）';
    const selection = editor.state.selection;
    return {
      focused,
      selection: `from ${selection.from} → to ${selection.to}`,
    };
  }

  function mount(mode: AutofocusMode) {
    editor?.destroy();
    // autofocus 只在初始化（挂载）时生效：换取值必须重建编辑器
    editor = new Editor({
      element: host,
      extensions: [StarterKit],
      content: CONTENT,
      autofocus: toFocusPosition(mode),
    });
    // 挂载后光标在 setTimeout 中异步设置，focus / blur / transaction 都会刷新读数
    editor.on('create', () => emit(snapshot()));
    editor.on('focus', () => emit(snapshot()));
    editor.on('blur', () => emit(snapshot()));
    editor.on('transaction', () => emit(snapshot()));
    current = mode;
    emit(snapshot());
  }

  mount('start');

  return {
    update(args) {
      if (args.mode === current) {
        // 同一取值不重建，但仍刷新读数（首次渲染时读数元素可能尚未就绪）
        emit(snapshot());
        return;
      }
      mount(args.mode);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
