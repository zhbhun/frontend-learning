/**
 * 范例介绍：CharacterCount 的 storage 读数与 limit 的事务层拦截。
 * 前置状态：schema 只装 Document、Paragraph、Text 与 CharacterCount（limit 默认 50、mode 默认 textSize）；
 *   初始为空段落；切换 Controls 会按新配置重建编辑器。
 * 主要操作：连点「插入 10 字」逼近上限；点「粘贴语义插入 40 字」「清空」；切换 limit 与 mode。
 * 预期结果：读数随每次事务实时变化；limit=50 时超限的插入被整体拦下（字数不变、无报错），
 *   粘贴语义的插入被裁剪到上限内塞入；mode 切到 nodeSize 后读数把结构开销也算进去。
 * 阅读主线：storage 读数每次调用都从当前文档现算；limit 在 filterTransaction 里拦截事务，
 *   粘贴（'paste' meta）走裁剪路径。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { CharacterCount } from '@tiptap/extensions';

export interface CharacterCountArgs {
  limit: number; // 0 表示不限（对应 limit: null）
  mode: 'textSize' | 'nodeSize';
}

export interface CharacterCountSnapshot {
  characters: number;
  words: number;
  note: string;
}

export interface CharacterCountInstance {
  update(args: CharacterCountArgs): void;
  dispose(): void;
}

const INSERT_TEXT = '一二三四五六七八九十'; // 恰好 10 字
const PASTE_TEXT = '粘贴'.repeat(20); // 40 字
const INITIAL_CONTENT = '<p></p>';
const DEFAULT_NOTE = '—';

export function createCharacterCountDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CharacterCountSnapshot) => void,
): CharacterCountInstance {
  const frame = document.createElement('div');
  frame.className = 'be-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'be-toolbar';
  const insertButton = document.createElement('button');
  insertButton.type = 'button';
  insertButton.className = 'be-btn';
  insertButton.textContent = '插入 10 字';
  const pasteButton = document.createElement('button');
  pasteButton.type = 'button';
  pasteButton.className = 'be-btn';
  pasteButton.textContent = '粘贴语义插入 40 字';
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'be-btn';
  clearButton.textContent = '清空';
  toolbar.append(insertButton, pasteButton, clearButton);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'be-box-label';
  hostLabel.textContent = '编辑器（limit 默认 50，打字也会被同一道闸拦下）';
  const host = document.createElement('div');
  host.className = 'be-editor';

  const hint = document.createElement('p');
  hint.className = 'be-hint';
  hint.textContent =
    '粘贴语义 = 真实粘贴被打上的 paste 标记：超限粘贴走裁剪路径，普通插入走拦截路径';

  frame.append(toolbar, hostLabel, host, hint);

  let editor: Editor | null = null;
  let current: CharacterCountArgs = { limit: 50, mode: 'textSize' };
  let note = DEFAULT_NOTE;

  function count(): number {
    return editor?.storage.characterCount.characters() ?? 0;
  }

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    const { characters, words } = editor.storage.characterCount;
    emit({
      characters: characters(),
      words: words(),
      note,
    });
  }

  function createEditor(): void {
    // 切换 Controls 时保留当前内容，让 mode / limit 的对照建立在同一份文档上
    const previousDoc = editor?.getJSON();
    editor?.destroy();
    editor = new Editor({
      element: host,
      extensions: [
        Document,
        Paragraph,
        Text,
        CharacterCount.configure({
          limit: current.limit > 0 ? current.limit : null,
          mode: current.mode,
        }),
      ],
      content: previousDoc ?? INITIAL_CONTENT,
    });
    editor.on('update', emitSnapshot);
    emitSnapshot();
  }

  // 把光标移到文末，让按钮操作的位置可预测
  function moveCursorToEnd(): void {
    editor?.commands.setTextSelection(editor.state.doc.content.size);
  }

  insertButton.addEventListener('click', () => {
    if (!editor) {
      return;
    }
    const before = count();
    moveCursorToEnd();
    editor.commands.insertContent(INSERT_TEXT);
    note = count() > before ? '插入 10 字：已接受' : '插入 10 字：被拦截（达到 limit）';
    emitSnapshot();
  });

  pasteButton.addEventListener('click', () => {
    if (!editor) {
      return;
    }
    const before = count();
    const limit = current.limit;
    moveCursorToEnd();
    const { view } = editor;
    // 真实粘贴由 prosemirror-view 打上 'paste' meta；这里用同一标记模拟粘贴路径
    view.dispatch(view.state.tr.insertText(PASTE_TEXT).setMeta('paste', true));
    const after = count();
    if (after > before && limit > 0 && after === limit) {
      note = `粘贴 40 字：裁剪到上限 ${limit}`;
    } else if (after > before) {
      note = '粘贴 40 字：已接受';
    } else {
      note = '粘贴 40 字：未进入文档';
    }
    emitSnapshot();
  });

  clearButton.addEventListener('click', () => {
    if (!editor) {
      return;
    }
    note = '清空：已接受（减少不受限）';
    editor.commands.clearContent();
    emitSnapshot();
  });

  createEditor();

  return {
    update(args) {
      current = args;
      note = DEFAULT_NOTE;
      createEditor();
    },
    dispose() {
      editor?.destroy();
      editor = null;
      frame.remove();
    },
  };
}
