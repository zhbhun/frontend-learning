/**
 * 范例介绍：UndoRedo 的命令与分组撤销——一次 undo 回退多少由分组决定。
 * 前置状态：schema 装 Document、Paragraph、Text、UndoRedo（默认 depth 100、newGroupDelay 500）。
 * 主要操作：「连续插入三句」同拍提交三次插入；「逐句插入（间隔 700ms）」每次间隔超过
 *   newGroupDelay；之后各点一次「撤销」，再用「重做」恢复。
 * 预期结果：连续插入的三句相邻且间隔趋近 0——合为一组，一次撤销全部回退；
 *   间隔 700ms 的插入各自成组，一次撤销只回退最后一句；重做按原分组逐组恢复。
 * 阅读主线：undo/redo 命令直接调用 prosemirror-history；分组规则是「相邻 + 间隔 < newGroupDelay」。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';

export interface UndoRedoSnapshot {
  text: string;
  canUndo: boolean;
  canRedo: boolean;
}

export interface UndoRedoInstance {
  update(): void;
  dispose(): void;
}

const SENTENCES = ['第一句。', '第二句。', '第三句。'];
const INITIAL_CONTENT = '<p>先插入句子，再撤销对比。</p>';
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createUndoRedoDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: UndoRedoSnapshot) => void,
): UndoRedoInstance {
  const frame = document.createElement('div');
  frame.className = 'be-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'be-toolbar';
  const burstButton = document.createElement('button');
  burstButton.type = 'button';
  burstButton.className = 'be-btn';
  burstButton.textContent = '连续插入三句';
  const pacedButton = document.createElement('button');
  pacedButton.type = 'button';
  pacedButton.className = 'be-btn';
  pacedButton.textContent = '逐句插入（间隔 700ms）';
  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'be-btn';
  undoButton.textContent = '撤销';
  const redoButton = document.createElement('button');
  redoButton.type = 'button';
  redoButton.className = 'be-btn';
  redoButton.textContent = '重做';
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'be-btn';
  resetButton.textContent = '重置';
  toolbar.append(burstButton, pacedButton, undoButton, redoButton, resetButton);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'be-box-label';
  hostLabel.textContent = '编辑器（打字同样遵守分组：停顿超过 500ms 就自成一组）';
  const host = document.createElement('div');
  host.className = 'be-editor';

  const hint = document.createElement('p');
  hint.className = 'be-hint';
  hint.textContent =
    '撤销 / 重做等价于快捷键 Mod-z / Shift-Mod-z；逐句插入请等三句都出现后再撤销';

  frame.append(toolbar, hostLabel, host, hint);

  let editor: Editor | null = null;
  let busy = false;

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    const raw = editor.state.doc.textContent;
    emit({
      text: raw.length > 26 ? `${raw.slice(0, 26)}…` : raw,
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    });
  }

  function createEditor(): void {
    editor = new Editor({
      element: host,
      extensions: [Document, Paragraph, Text, UndoRedo],
      content: INITIAL_CONTENT,
    });
    editor.on('update', emitSnapshot);
    emitSnapshot();
  }

  // 在文末插入一句：位置与上一次变更相邻，满足分组的「相邻」条件
  function appendSentence(sentence: string): void {
    editor!.commands.focus('end');
    editor!.commands.insertContent(sentence);
  }

  burstButton.addEventListener('click', () => {
    if (!editor || busy) {
      return;
    }
    // 同拍连续提交：间隔趋近 0，三句合为一个历史组
    SENTENCES.forEach(appendSentence);
    emitSnapshot();
  });

  pacedButton.addEventListener('click', () => {
    if (!editor || busy) {
      return;
    }
    busy = true;
    burstButton.disabled = true;
    void (async () => {
      for (const sentence of SENTENCES) {
        // 实例可能在等待期间被销毁（离开 Docs 页）
        if (!editor) {
          break;
        }
        appendSentence(sentence);
        // 间隔 700ms > newGroupDelay 500ms：每次插入都开启新组
        await delay(700);
      }
      busy = false;
      burstButton.disabled = false;
      emitSnapshot();
    })();
  });

  undoButton.addEventListener('click', () => {
    editor?.commands.undo();
    emitSnapshot();
  });

  redoButton.addEventListener('click', () => {
    editor?.commands.redo();
    emitSnapshot();
  });

  resetButton.addEventListener('click', () => {
    // setContent 同样是一次可撤销的事务
    editor?.commands.setContent(INITIAL_CONTENT);
    emitSnapshot();
  });

  createEditor();

  return {
    update() {
      emitSnapshot();
    },
    dispose() {
      editor?.destroy();
      editor = null;
      frame.remove();
    },
  };
}
