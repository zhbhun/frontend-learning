/**
 * 范例介绍：默认挂载点落在带 overflow: hidden 的容器里时菜单会被裁剪——strategy: fixed 或 appendTo 修复。
 * 前置状态：编辑器放在一个 overflow: hidden 的矮容器顶部；BubbleMenu 用默认 placement: top。
 * 操作：选中容器顶部第一段的文字；切换「溢出处理」为默认 / strategy fixed / appendTo body。
 * 预期结果：默认配置下「菜单可见」已是「是」，但菜单被容器上边缘裁掉；
 *   fixed 后菜单相对视口定位、完整显示；appendTo body 后菜单挂到 body，同样完整显示——
 *   「菜单挂载点」读数给出菜单元素的真实挂载位置。
 * 阅读主线：absolute 菜单的定位坐标系在挂载点里，被裁剪不是 z-index 问题，换 strategy 或换挂载点。
 */
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { BubbleMenu, type BubbleMenuOptions } from '@tiptap/extension-bubble-menu';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type OverflowFix = 'none' | 'fixed' | 'append-body';

export interface MenuClippingArgs {
  fix: OverflowFix;
}

export interface MenuClippingSnapshot {
  visible: boolean;
  mount: string;
}

export interface MenuClippingInstance {
  update(args: MenuClippingArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>容器顶部的第一段文字，选中试试。</p><p>第二段文字。</p><p>第三段文字，容器装不下的部分被裁掉。</p>';

export function createMenuClippingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MenuClippingSnapshot) => void,
): MenuClippingInstance {
  const frame = document.createElement('div');
  frame.className = 'mn-frame mn-frame--roomy';
  canvas.replaceWith(frame);

  const boxLabel = document.createElement('p');
  boxLabel.className = 'mn-box-label';
  boxLabel.textContent = '带 overflow: hidden 的容器（模拟卡片、侧栏）';

  const clipBox = document.createElement('div');
  clipBox.className = 'mn-clip-box';

  const host = document.createElement('div');
  host.className = 'mn-editor mn-editor--plain';
  clipBox.append(host);

  const hint = document.createElement('p');
  hint.className = 'mn-box-label';
  hint.textContent = '选中第一段文字后，切换「溢出处理」观察菜单的裁剪与挂载点。';

  frame.append(boxLabel, clipBox, hint);

  let editor: Editor | null = null;
  let menuEl: HTMLElement | null = null;
  let visible = false;

  function buildMenuElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'mn-menu';
    const boldButton = document.createElement('button');
    boldButton.type = 'button';
    boldButton.textContent = '加粗';
    boldButton.addEventListener('click', () => {
      editor?.chain().focus().toggleBold().run();
    });
    el.append(boldButton);
    return el;
  }

  // 挂载点决定 absolute 菜单的定位基准与裁剪上下文
  function mountLabel(): string {
    const parent = menuEl?.parentElement;
    if (!parent) {
      return '未挂载';
    }
    if (parent === host) {
      return '编辑器父元素（容器内）';
    }
    if (parent === document.body) {
      return 'body';
    }
    return parent.tagName.toLowerCase();
  }

  function emitSnapshot(): void {
    emit({ visible, mount: mountLabel() });
  }

  function applyArgs(args: MenuClippingArgs): void {
    editor?.destroy();
    host.replaceChildren();

    menuEl = buildMenuElement();
    visible = false;

    const options: BubbleMenuOptions = {
      element: menuEl,
      // 类型上必填；显式写默认值 'bubbleMenu'，与省略时的运行时行为一致
      pluginKey: 'bubbleMenu',
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
    if (args.fix === 'fixed') {
      // fixed 相对视口定位，不受容器 overflow 裁剪影响
      options.options = { ...options.options, strategy: 'fixed' };
    }
    if (args.fix === 'append-body') {
      // 换挂载点：菜单脱离容器，不再被裁剪
      options.appendTo = document.body;
    }

    editor = new Editor({
      element: host,
      extensions: [Document, Paragraph, Text, Bold, BubbleMenu.configure(options)],
      content: CONTENT,
    });

    editor.on('transaction', emitSnapshot);
    emitSnapshot();
  }

  applyArgs({ fix: 'none' });

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
