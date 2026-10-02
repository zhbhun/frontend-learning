/**
 * 范例介绍：TrailingNode 在文档末尾补一个可落光标的段落。
 * 前置状态：StarterKit（默认含 TrailingNode），可切换开关；结尾预设：标题 / 段落 / 表格；
 *   切换开关或预设都会重建编辑器。
 * 主要操作：选不同结尾预设，点进编辑区或点「光标移到文末」（任何事务都会触发检查）。
 * 预期结果：开关打开且结尾不是段落时，任意事务后文档末尾补出段落（子节点数 +1）；
 *   以段落结尾不补（paragraph 在 notAfter 里）；开关关闭时文档保持原样。
 * 阅读主线：appendTransaction 挂在每一次事务上，检查最后一个节点并按需追加。
 */
import { Editor } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';

export interface TrailingNodeArgs {
  enabled: boolean;
  ending: 'heading' | 'paragraph' | 'table';
}

export interface TrailingNodeSnapshot {
  lastNode: string;
  docChildren: number;
}

export interface TrailingNodeInstance {
  update(args: TrailingNodeArgs): void;
  dispose(): void;
}

const CONTENTS: Record<TrailingNodeArgs['ending'], string> = {
  heading: '<h2>以标题结尾的文档</h2>',
  paragraph: '<p>以段落结尾的文档。</p>',
  table:
    '<table><tbody><tr><th>名称</th><th>数量</th></tr><tr><td>苹果</td><td>3</td></tr></tbody></table>',
};

export function createTrailingNodeDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TrailingNodeSnapshot) => void,
): TrailingNodeInstance {
  const frame = document.createElement('div');
  frame.className = 'be-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'be-toolbar';
  const moveCursorButton = document.createElement('button');
  moveCursorButton.type = 'button';
  moveCursorButton.className = 'be-btn';
  moveCursorButton.textContent = '光标移到文末';
  toolbar.append(moveCursorButton);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'be-box-label';
  hostLabel.textContent = '编辑器（StarterKit 默认启用 TrailingNode）';
  const host = document.createElement('div');
  host.className = 'be-editor';

  const hint = document.createElement('p');
  hint.className = 'be-hint';
  hint.textContent =
    '补段检查挂在每一次事务上——点进编辑区（只移动光标也算）或点按钮即可触发';

  frame.append(toolbar, hostLabel, host, hint);

  let editor: Editor | null = null;
  let current: TrailingNodeArgs = { enabled: true, ending: 'heading' };

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    const lastChild = editor.state.doc.lastChild;
    emit({
      lastNode: lastChild?.type.name ?? '—',
      docChildren: editor.state.doc.childCount,
    });
  }

  function createEditor(): void {
    editor?.destroy();
    editor = new Editor({
      element: host,
      // 关闭时从 StarterKit 排除 trailingNode；默认开启无需任何配置
      extensions: [
        current.enabled ? StarterKit : StarterKit.configure({ trailingNode: false }),
        TableKit,
      ],
      content: CONTENTS[current.ending],
    });
    // 选区事务也会触发补段检查，所以监听 transaction 而不只是 update
    editor.on('transaction', emitSnapshot);
    emitSnapshot();
  }

  moveCursorButton.addEventListener('click', () => {
    // focus('end') 是一次选区事务：足以触发 appendTransaction 检查
    editor?.commands.focus('end');
  });

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
