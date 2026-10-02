/**
 * 范例介绍：BubbleMenu 的默认显示条件与 shouldShow 接管——选中文字才出现，点击菜单不丢选区。
 * 前置状态：装 Bold、Italic 与 BubbleMenu（菜单元素由本范例创建）；菜单按钮执行 chain().focus() 命令。
 * 操作：选中或取消选中文字；切换「shouldShow 预设」与「updateDelay」；点菜单上的按钮。
 * 预期结果：选中文字约 updateDelay 毫秒后菜单出现在选区上方；空选区与失焦不显示；
 *   「仅加粗选区」预设下只有选中加粗文字才出现；点按钮格式翻转且菜单保持可见。
 * 阅读主线：显示与否完全由 shouldShow 的返回值决定，默认条件只是它的缺省实现。
 */
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { BubbleMenu, type BubbleMenuOptions } from '@tiptap/extension-bubble-menu';
import { Document } from '@tiptap/extension-document';
import { Italic } from '@tiptap/extension-italic';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type ShouldShowPreset = 'default' | 'bold-only';

export interface BubbleShowArgs {
  preset: ShouldShowPreset;
  updateDelay: number;
}

export interface BubbleShowSnapshot {
  visible: boolean;
  selection: string;
  boldActive: boolean;
}

export interface BubbleShowInstance {
  update(args: BubbleShowArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>选中这段文字试试气泡菜单，其中<strong>已有加粗</strong>。</p><p>第二段文字，也选中试试。</p>';

export function createBubbleShowDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BubbleShowSnapshot) => void,
): BubbleShowInstance {
  const frame = document.createElement('div');
  frame.className = 'mn-frame';
  canvas.replaceWith(frame);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'mn-box-label';
  hostLabel.textContent = '编辑器（选中文字弹出气泡菜单）';
  const host = document.createElement('div');
  // 菜单默认挂载点是编辑器的父元素；relative 让 absolute 菜单以它为定位基准
  host.className = 'mn-editor';

  frame.append(hostLabel, host);

  let editor: Editor | null = null;
  let menuEl: HTMLElement | null = null;
  let visible = false;

  // 菜单 DOM 由使用者创建：扩展不提供任何 UI，只接管显隐与定位
  function buildMenuElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'mn-menu';

    const boldButton = document.createElement('button');
    boldButton.type = 'button';
    boldButton.textContent = '加粗';
    const italicButton = document.createElement('button');
    italicButton.type = 'button';
    italicButton.textContent = '斜体';
    el.append(boldButton, italicButton);

    // 点击按钮会把焦点移给按钮，链首 focus() 把焦点送回编辑器
    boldButton.addEventListener('click', () => {
      editor?.chain().focus().toggleBold().run();
    });
    italicButton.addEventListener('click', () => {
      editor?.chain().focus().toggleItalic().run();
    });
    return el;
  }

  function emitSnapshot(): void {
    const editorInstance = editor;
    const selection = editorInstance?.state.selection;
    emit({
      visible,
      selection: !editorInstance || !selection || selection.empty
        ? '空'
        : `${selection.from}–${selection.to}`,
      boldActive: editorInstance?.isActive('bold') ?? false,
    });
  }

  function applyArgs(args: BubbleShowArgs): void {
    editor?.destroy();
    host.replaceChildren();

    menuEl = buildMenuElement();
    visible = false;

    const options: BubbleMenuOptions = {
      element: menuEl,
      // 类型上必填；显式写默认值 'bubbleMenu'，与省略时的运行时行为一致
      pluginKey: 'bubbleMenu',
      updateDelay: args.updateDelay,
      // onShow / onHide 由插件的 show() / hide() 触发，用来推送「菜单可见」读数
      options: {
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
    if (args.preset === 'bold-only') {
      // 完全接管：只看这个返回值，默认条件不再参与
      options.shouldShow = ({ editor: instance }) => instance.isActive('bold');
    }

    editor = new Editor({
      element: host,
      extensions: [Document, Paragraph, Text, Bold, Italic, BubbleMenu.configure(options)],
      content: CONTENT,
    });

    // 选区与格式读数跟随事务刷新；菜单可见性由 onShow / onHide 推送
    editor.on('transaction', emitSnapshot);
    emitSnapshot();
  }

  applyArgs({ preset: 'default', updateDelay: 250 });

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
