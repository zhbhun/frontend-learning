/**
 * 范例：extensions 选项怎样决定编辑器的能力。
 * 前置状态：用真实 @tiptap/core 创建编辑器并挂载，可正常输入。
 * 操作：切换「extensions 预设」（会以新列表重建编辑器），在编辑区输入文字、
 *       在空行输入 “## 文字” 或 “#### 文字”，输入后按 Ctrl/Cmd+Z 撤销。
 * 预期结果：禁用 undoRedo 后撤销命令不存在，Ctrl/Cmd+Z 不再回退；
 *           heading 限定 [1,2,3] 后 “#### 文字” 不再转为标题，“## 文字” 正常转换。
 * 阅读主线：读数「注册扩展」「undo 命令」「heading 等级」对照编辑区实际行为。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export type ExtensionPreset = 'default' | 'no-undo-redo' | 'heading-123';

export interface ExtensionPresetArgs {
  preset: ExtensionPreset;
}

export interface ExtensionPresetSnapshot {
  extensionCount: number;
  undoCommand: string;
  headingLevels: string;
}

export interface ExtensionPresetInstance {
  update(args: ExtensionPresetArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>在这里输入文字，再试试单独输入 “## 文字” 或 “#### 文字”，然后 Ctrl/Cmd+Z 撤销。</p>';

// 同一个 StarterKit 通过 configure 产出不同的扩展列表；
// extensions 就是普通数组，官方扩展与自定义扩展可以任意组合。
function buildExtensions(preset: ExtensionPreset) {
  switch (preset) {
    // 子项传 false：该扩展不注册，它带来的命令与规则一并消失
    case 'no-undo-redo':
      return [StarterKit.configure({ undoRedo: false })];
    // 子项传对象：深合并进该扩展的默认 options
    case 'heading-123':
      return [StarterKit.configure({ heading: { levels: [1, 2, 3] } })];
    default:
      return [StarterKit];
  }
}

export function createExtensionPresetDemo(
  stage: HTMLElement,
  emit: (snapshot: ExtensionPresetSnapshot) => void,
): ExtensionPresetInstance {
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
  let current: ExtensionPreset | null = null;

  function snapshot(): ExtensionPresetSnapshot {
    if (!editor) {
      return { extensionCount: 0, undoCommand: '—', headingLevels: '—' };
    }
    // 命令由扩展注册：扩展被禁用后命令对象上就没有这个方法，先判断再调用
    const can = editor.can() as unknown as Record<string, unknown>;
    let undoCommand: string;
    if (typeof can.undo !== 'function') {
      undoCommand = '不存在（undoRedo 未注册）';
    } else {
      undoCommand = (can.undo as () => boolean)()
        ? '可执行'
        : '不可执行（无可撤销历史）';
    }
    const heading = editor.extensionManager.extensions.find(
      (extension) => extension.name === 'heading',
    );
    const levels = heading?.options?.levels as number[] | undefined;
    return {
      extensionCount: editor.extensionManager.extensions.length,
      undoCommand,
      headingLevels: levels ? levels.join(' / ') : '未注册',
    };
  }

  function mount(preset: ExtensionPreset) {
    editor?.destroy();
    // 选项在构造时读取：换预设必须重建编辑器
    editor = new Editor({
      element: host,
      extensions: buildExtensions(preset),
      content: CONTENT,
    });
    editor.on('transaction', () => emit(snapshot()));
    current = preset;
    emit(snapshot());
  }

  mount('default');

  return {
    update(args) {
      if (args.preset === current) {
        // 同一预设不重建，但仍刷新读数（首次渲染时读数元素可能尚未就绪）
        emit(snapshot());
        return;
      }
      mount(args.preset);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
