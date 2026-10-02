/**
 * 范例介绍：调用扩展注册的命令——toggle 家族翻转格式，isActive 读激活状态，can() 预检能否执行。
 * 前置状态：装 Heading、Bold、Highlight、Blockquote、BulletList、ListItem、CodeBlockLowlight；
 *   文档含标题、段落、引用、列表、代码块各一块。
 * 操作：切换「光标位置」选中不同块内的文字；点工具条按钮执行对应的 toggle 命令。
 * 预期结果：激活读数随选中位置变化；代码块里 can().toggleBold() 为 false，
 *   点「加粗」看不到效果且 run() 返回 false。
 * 阅读主线：命令是否存在由扩展安装决定，能否执行用 can() 预检，当前状态用 isActive 读取。
 */
import { Editor } from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Bold } from '@tiptap/extension-bold';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Highlight } from '@tiptap/extension-highlight';
import { BulletList, ListItem } from '@tiptap/extension-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { common, createLowlight } from 'lowlight';

export type CursorTarget =
  | 'heading'
  | 'paragraph'
  | 'blockquote'
  | 'list-item'
  | 'code-block';

export interface ExtensionCommandsArgs {
  position: CursorTarget;
}

export interface ExtensionCommandsSnapshot {
  boldActive: boolean;
  headingActive: boolean;
  blockquoteActive: boolean;
  bulletListActive: boolean;
  canToggleBold: boolean;
  lastRunResult: boolean | null;
}

export interface ExtensionCommandsInstance {
  update(args: ExtensionCommandsArgs): void;
  dispose(): void;
}

const lowlight = createLowlight(common);

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Heading,
  Bold,
  Highlight,
  Blockquote,
  BulletList,
  ListItem,
  CodeBlockLowlight.configure({ lowlight }),
];

const CONTENT = [
  '<h2>二级标题</h2>',
  '<p>普通段落里有<strong>加粗文字</strong>。</p>',
  '<blockquote><p>引用里的段落</p></blockquote>',
  '<ul><li><p>列表项文字</p></li></ul>',
  '<pre><code>const inCode = true</code></pre>',
].join('');

// 每个位置用一个唯一的文字锚点定位光标
const CURSOR_TARGETS: Record<CursorTarget, string> = {
  heading: '二级标题',
  paragraph: '普通段落',
  blockquote: '引用里的段落',
  'list-item': '列表项文字',
  'code-block': 'const inCode',
};

// 工具条：每个按钮是一条扩展注册的命令，调用方式与 core 命令一致
const BUTTONS: Array<{ label: string; run: (editor: Editor) => boolean }> = [
  { label: 'toggleBold', run: (editor) => editor.chain().focus().toggleBold().run() },
  {
    label: 'toggleHighlight',
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
  },
  {
    label: 'toggleHeading',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'toggleBlockquote',
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'toggleBulletList',
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
];

export function createExtensionCommandsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExtensionCommandsSnapshot) => void,
): ExtensionCommandsInstance {
  const frame = document.createElement('div');
  frame.className = 'cmd-frame cmd-frame--roomy';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'cmd-toolbar';
  for (const button of BUTTONS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'cmd-btn';
    el.textContent = button.label;
    toolbar.append(el);
  }

  const hostLabel = document.createElement('p');
  hostLabel.className = 'cmd-box-label';
  hostLabel.textContent = '编辑器（可编辑，切换光标位置会重置内容）';
  const host = document.createElement('div');
  host.className = 'cmd-editor cmd-editor--edit';

  frame.append(toolbar, hostLabel, host);

  let editor: Editor | null = null;

  // 选中指定文字锚点：带选区的 toggle 行为只取决于文档本身，读数最稳定
  function selectAnchorText(needle: string): void {
    let from = -1;
    editor?.state.doc.descendants((node, pos) => {
      if (from >= 0) {
        return false;
      }
      if (node.isText && node.text?.includes(needle)) {
        from = pos + node.text.indexOf(needle);
        return false;
      }
      return true;
    });
    if (from >= 0 && editor) {
      editor.commands.setTextSelection({ from, to: from + needle.length });
    }
  }

  function emitSnapshot(lastRunResult: boolean | null): void {
    emit({
      boldActive: editor?.isActive('bold') ?? false,
      headingActive: editor?.isActive('heading', { level: 2 }) ?? false,
      blockquoteActive: editor?.isActive('blockquote') ?? false,
      bulletListActive: editor?.isActive('bulletList') ?? false,
      canToggleBold: editor?.can().toggleBold() ?? false,
      lastRunResult,
    });
  }

  function applyArgs(args: ExtensionCommandsArgs): void {
    editor?.destroy();
    host.replaceChildren();

    editor = new Editor({
      element: host,
      extensions: EXTENSIONS,
      content: CONTENT,
    });

    selectAnchorText(CURSOR_TARGETS[args.position]);
    emitSnapshot(null);
  }

  BUTTONS.forEach((button, index) => {
    const el = toolbar.children[index] as HTMLButtonElement;
    el.addEventListener('click', () => {
      if (!editor) {
        return;
      }
      const result = button.run(editor);
      emitSnapshot(result);
    });
  });

  applyArgs({ position: 'paragraph' });

  return {
    update(args) {
      applyArgs(args);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
