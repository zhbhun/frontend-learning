/**
 * 范例介绍：链接的设置、读取与自动转换——setLink / unsetLink / autolink 与点击行为。
 * 前置状态：装 Document、Paragraph、Text、Link（openOnClick: false、enableClickSelection: true，
 *   避免演示点击时跳出页面）；初始内容含一个链接与一段纯文本。
 * 操作：点「为选区设置链接」把选区（选区为空时自动选中第二段）设为「链接地址」控件里的 URL；
 *   点「移除链接」；点「模拟输入网址」在文档末尾追加末尾带空白的 URL 文本触发 autolink；
 *   点编辑器里的链接，观察选区扩展到整个链接、href 读数变化。
 * 预期结果：href 读数随选区变化；autolink 在空白触发后把 URL 文本转为链接，链接计数加一。
 * 阅读主线：链接状态统一走 getAttributes('link') 读取，点击行为由 openOnClick / enableClickSelection 控制。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Link } from '@tiptap/extension-link';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface LinkBehaviorArgs {
  url: string;
}

export interface LinkBehaviorSnapshot {
  href: string;
  linkCount: number;
}

export interface LinkBehaviorInstance {
  update(args: LinkBehaviorArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>已有一个<a href="https://tiptap.dev">链接</a>。</p>' +
  '<p>选中这里的文字再点上方按钮。</p>';

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  // 演示环境：关掉「点击打开」避免跳出页面；开启「点击选中」便于观察链接范围
  Link.configure({ openOnClick: false, enableClickSelection: true }),
];

// 递归统计文档里的 link mark 数量
function countLinks(node: JSONContent): number {
  let count = (node.marks ?? []).some((mark) => mark.type === 'link') ? 1 : 0;
  for (const child of node.content ?? []) {
    count += countLinks(child);
  }
  return count;
}

export function createLinkBehaviorDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LinkBehaviorSnapshot) => void,
): LinkBehaviorInstance {
  const frame = document.createElement('div');
  frame.className = 'tse-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'tse-toolbar';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'tse-box-label';
  hostLabel.textContent = '编辑器（可编辑；点链接会选中整个链接而不是打开它）';
  const host = document.createElement('div');
  host.className = 'tse-editor tse-editor--edit';

  frame.append(toolbar, hostLabel, host);

  let currentUrl = 'https://tiptap.dev/docs';
  let editor: Editor | null = null;

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    emit({
      href: editor.getAttributes('link').href ?? '—',
      linkCount: countLinks(editor.getJSON()),
    });
  }

  function addToolbarButton(label: string, onClick: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tse-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    toolbar.append(button);
  }

  // 选区为空时，自动选中第二段的全部文字，保证操作可重复
  function ensureSelection(): void {
    if (!editor) {
      return;
    }
    if (!editor.state.selection.empty) {
      return;
    }
    const doc = editor.state.doc;
    const index = Math.min(1, doc.childCount - 1);
    let start = 1;
    for (let i = 0; i < index; i += 1) {
      start += doc.child(i).nodeSize;
    }
    const end = start + doc.child(index).nodeSize - 1;
    editor.commands.setTextSelection({ from: start + 1, to: end - 1 });
  }

  editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: CONTENT,
  });

  editor.on('transaction', () => emitSnapshot());

  addToolbarButton('为选区设置链接', () => {
    if (!editor) {
      return;
    }
    ensureSelection();
    editor.commands.setLink({ href: currentUrl });
  });
  addToolbarButton('移除链接', () => editor?.commands.unsetLink());
  addToolbarButton('模拟输入网址', () => {
    if (!editor) {
      return;
    }
    // autolink 的触发条件：URL 文本后面出现空白（空格或回车）
    editor.commands.focus('end');
    editor.commands.insertContent(' https://github.com ', {
      applyInputRules: true,
    });
  });

  emitSnapshot();

  return {
    update(args) {
      currentUrl = args.url;
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
