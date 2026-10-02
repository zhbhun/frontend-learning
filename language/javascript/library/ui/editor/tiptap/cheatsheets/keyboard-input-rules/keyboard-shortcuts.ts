/**
 * 范例介绍：addKeyboardShortcuts 的三种写法——新增绑定、覆盖内置快捷键、返回 false 放行。
 * 前置状态：编辑器装了 Bold；自定义快捷键扩展排在扩展数组末尾（同优先级下先执行）。
 * 操作：点击编辑器获得焦点，按 Ctrl/Cmd+Shift+9（新增绑定），或 Ctrl/Cmd+B（覆盖 / 放行）。
 * 预期结果：新增预设插入当天日期并返回 true；覆盖预设拦截 Mod-b、插入占位文本（不再加粗）；
 *   放行预设的 handler 返回 false，Bold 扩展接手，文本照常加粗——读数同步记录每次触发的返回值。
 * 阅读主线：handler 返回 true 拦截、返回 false 放行；同优先级下后注册的扩展先执行。
 */
import {
  Editor,
  Extension,
  type Extensions,
  type KeyboardShortcutCommand,
} from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type ShortcutPreset = 'add' | 'override' | 'passthrough';

export interface KeyboardShortcutsArgs {
  preset: ShortcutPreset;
}

export interface KeyboardShortcutsSnapshot {
  html: string;
  log: string;
}

export interface KeyboardShortcutsInstance {
  update(args: KeyboardShortcutsArgs): void;
  dispose(): void;
}

/** 所有预设共用的基础扩展集：自定义扩展必须排在 Bold 之后才会先拿到按键。 */
const BASE_EXTENSIONS: Extensions = [Document, Paragraph, Text, Bold];

function formatDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function createKeyboardShortcutsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: KeyboardShortcutsSnapshot) => void,
): KeyboardShortcutsInstance {
  const frame = document.createElement('div');
  frame.className = 'kir-frame';

  const hint = document.createElement('p');
  hint.className = 'kir-hint';

  const container = document.createElement('div');
  container.className = 'kir-editor';
  frame.append(hint, container);
  canvas.replaceWith(frame);

  let currentLog = '（尚未触发快捷键）';
  let editor: Editor | null = null;
  let currentPreset: ShortcutPreset | null = null;

  // 自定义扩展：闭包记录 preset 与日志，addKeyboardShortcuts 返回"键名 → handler"映射
  function buildExtensions(preset: ShortcutPreset): Extensions {
    const customShortcut = Extension.create({
      name: 'customShortcut',
      // 显式标注返回类型：多个分支返回不同键位的映射，逐分支对照索引签名检查
      addKeyboardShortcuts(): Record<string, KeyboardShortcutCommand> {
        if (preset === 'add') {
          return {
            // 数字键没有大小写问题；字母键建议像 Bold 一样同时注册 Mod-b 与 Mod-B
            'Mod-Shift-9': () => {
              currentLog = '自定义 Mod-Shift-9 → true（插入日期）';
              return this.editor.commands.insertContent(formatDate());
            },
          };
        }
        if (preset === 'override') {
          return {
            // 先注册先执行：这里返回 true，事件被吃掉，Bold 的 Mod-b 不会再跑
            'Mod-b': () => {
              currentLog = '自定义 Mod-b → true（拦截，Bold 未执行）';
              return this.editor.commands.insertContent('【已拦截】');
            },
          };
        }
        return {
          // 返回 false：放行给后续 keymap 插件，Bold 接手执行 toggleBold
          'Mod-b': () => {
            currentLog = '自定义 Mod-b → false（放行，Bold 接手）';
            return false;
          },
        };
      },
    });
    return [...BASE_EXTENSIONS, customShortcut];
  }

  function mount(preset: ShortcutPreset): void {
    editor?.destroy();
    currentPreset = preset;
    currentLog = '（尚未触发快捷键）';

    const next = new Editor({
      element: container,
      extensions: buildExtensions(preset),
      content: '<p>点击这里获得焦点，然后按快捷键。</p>',
    });
    editor = next;

    // 无论哪个扩展改了文档（包括内置 Bold），都把最新 HTML 发给读数
    next.on('update', () => {
      emit({ html: next.getHTML(), log: currentLog });
    });

    hint.textContent =
      preset === 'add'
        ? '按 Ctrl/Cmd+Shift+9：新增绑定插入当天日期，返回 true。'
        : preset === 'override'
          ? '选中或输入文字后按 Ctrl/Cmd+B：自定义 handler 返回 true，加粗被拦截。'
          : '选中或输入文字后按 Ctrl/Cmd+B：自定义 handler 返回 false，Bold 接手加粗。';

    emit({ html: next.getHTML(), log: currentLog });
  }

  return {
    update(nextArgs) {
      // 预设变化时重建编辑器，让不同绑定从一个干净状态开始
      if (nextArgs.preset !== currentPreset) {
        mount(nextArgs.preset);
      }
    },
    dispose() {
      editor?.destroy();
      editor = null;
      frame.remove();
    },
  };
}
