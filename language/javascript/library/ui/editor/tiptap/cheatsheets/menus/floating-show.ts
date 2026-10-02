/**
 * 范例介绍：FloatingMenu 的默认显示条件与 placement——光标停在顶层空段落时出现，默认在右侧。
 * 前置状态：装 Heading、Blockquote 与 FloatingMenu（菜单元素由本范例创建）；
 *   文档含空段落、有文字的段落、引用块内的空段三种文本块。
 * 操作：把光标点进不同段落；切换「placement」；点菜单上的按钮；在空段落里打字。
 * 预期结果：「光标位置」读数为 depth 1 · 空 时菜单出现（默认右侧）；非空段落与
 *   depth 2 的嵌套空段不出现；切 placement 菜单换侧；点「引用」后空段落变 depth 2，菜单随之隐藏。
 * 阅读主线：默认条件 = 空选区 + 顶层（depth 1）空文本块；placement 决定菜单贴参照矩形的哪一侧。
 */
import { Editor } from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Document } from '@tiptap/extension-document';
import { FloatingMenu, type FloatingMenuOptions } from '@tiptap/extension-floating-menu';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type Placement = 'right' | 'top' | 'bottom' | 'left';

export interface FloatingShowArgs {
  placement: Placement;
}

export interface FloatingShowSnapshot {
  visible: boolean;
  cursor: string;
}

export interface FloatingShowInstance {
  update(args: FloatingShowArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p></p><p>这一段有文字，点进来不会有菜单。</p><blockquote><p></p></blockquote>';

export function createFloatingShowDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FloatingShowSnapshot) => void,
): FloatingShowInstance {
  const frame = document.createElement('div');
  frame.className = 'mn-frame';
  canvas.replaceWith(frame);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'mn-box-label';
  hostLabel.textContent = '编辑器（点空段落弹出浮动菜单）';
  const host = document.createElement('div');
  host.className = 'mn-editor';

  frame.append(hostLabel, host);

  let editor: Editor | null = null;
  let menuEl: HTMLElement | null = null;
  let visible = false;

  function buildMenuElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'mn-menu';

    const headingButton = document.createElement('button');
    headingButton.type = 'button';
    headingButton.textContent = '标题';
    const quoteButton = document.createElement('button');
    quoteButton.type = 'button';
    quoteButton.textContent = '引用';
    el.append(headingButton, quoteButton);

    headingButton.addEventListener('click', () => {
      editor?.chain().focus().toggleHeading({ level: 2 }).run();
    });
    quoteButton.addEventListener('click', () => {
      // 空段落被包进引用块后 depth 变为 2，默认条件不再满足，菜单会隐藏
      editor?.chain().focus().toggleBlockquote().run();
    });
    return el;
  }

  // 读数直接对应默认条件里的三个判断：聚焦、顶层（depth 1）与空文本块
  function cursorLabel(): string {
    const editorInstance = editor;
    if (!editorInstance || !editorInstance.view.hasFocus()) {
      return '未聚焦';
    }
    const { $anchor } = editorInstance.state.selection;
    const emptyTextBlock = $anchor.parent.isTextblock && !$anchor.parent.textContent;
    return `depth ${$anchor.depth} · ${emptyTextBlock ? '空' : '非空'}`;
  }

  function emitSnapshot(): void {
    emit({ visible, cursor: cursorLabel() });
  }

  function applyArgs(args: FloatingShowArgs): void {
    editor?.destroy();
    host.replaceChildren();

    menuEl = buildMenuElement();
    visible = false;

    const options: FloatingMenuOptions = {
      element: menuEl,
      // 类型上必填；显式写默认值 'floatingMenu'，与省略时的运行时行为一致
      pluginKey: 'floatingMenu',
      options: {
        placement: args.placement,
        onShow: () => {
          visible = true;
          emitSnapshot();
        },
        onHide: () => {
          visible = false;
          emitSnapshot();
        },
      },
    };

    editor = new Editor({
      element: host,
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading,
        Blockquote,
        FloatingMenu.configure(options),
      ],
      content: CONTENT,
    });

    editor.on('transaction', emitSnapshot);
    emitSnapshot();
  }

  applyArgs({ placement: 'right' });

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
