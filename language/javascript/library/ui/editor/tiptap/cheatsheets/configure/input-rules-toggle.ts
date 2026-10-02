/**
 * 范例：enableInputRules 全局开关对 Markdown 式输入转换的影响。
 * 前置状态：编辑器以 StarterKit 创建；切换开关会以对应选项重建编辑器。
 * 操作：在空行行首输入 “# ” 或 “1. ” 加空格，观察是否自动转换；切换开关后对比。
 * 预期结果：开启时 “# ” 转为一级标题、“1. ” 转为有序列表；关闭后保持普通文字。
 * 阅读主线：读数「输入规则」「光标所在块」与编辑区的即时转换效果。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export interface InputRulesArgs {
  enabled: boolean;
}

export interface InputRulesSnapshot {
  enabledLabel: string;
  blockType: string;
}

export interface InputRulesInstance {
  update(args: InputRulesArgs): void;
  dispose(): void;
}

const CONTENT = '<p>在空行行首输入 “# ” 或 “1. ” 加空格。</p>';

export function createInputRulesDemo(
  stage: HTMLElement,
  emit: (snapshot: InputRulesSnapshot) => void,
): InputRulesInstance {
  const frame = document.createElement('div');
  frame.className = 'cfg-frame';
  const label = document.createElement('p');
  label.className = 'cfg-box-label';
  label.textContent = '编辑区（可输入）';
  const host = document.createElement('div');
  host.className = 'cfg-box';
  frame.append(label, host);
  stage.append(frame);

  let editor: Editor | null = null;
  let current: boolean | null = null;

  function snapshot(): InputRulesSnapshot {
    if (!editor) {
      return { enabledLabel: '—', blockType: '—' };
    }
    const blockType = editor.state.selection.$from.parent.type.name;
    return {
      enabledLabel: current ? '开启（默认）' : '关闭',
      blockType,
    };
  }

  function mount(enabled: boolean) {
    editor?.destroy();
    editor = new Editor({
      element: host,
      extensions: [StarterKit],
      content: CONTENT,
      // 默认 true：执行所有扩展声明的输入规则；false 全部关闭
      enableInputRules: enabled,
    });
    editor.on('transaction', () => emit(snapshot()));
    current = enabled;
    emit(snapshot());
  }

  mount(true);

  return {
    update(args) {
      if (args.enabled === current) {
        // 同一取值不重建，但仍刷新读数（首次渲染时读数元素可能尚未就绪）
        emit(snapshot());
        return;
      }
      mount(args.enabled);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
