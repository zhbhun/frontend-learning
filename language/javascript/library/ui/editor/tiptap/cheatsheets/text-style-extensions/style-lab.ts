/**
 * 范例介绍：样式叠加后的文档形态——多个 mark 共存，text-style 家族合并进同一个 span。
 * 前置状态：装 Document、Paragraph、Text、Bold、Italic、Underline、Highlight(multicolor)、
 *   TextStyle、Color、FontSize、BackgroundColor；编辑器可编辑，初始两段文字。
 * 操作：选中文字后点工具条按钮；光标停在文字之间（空选区）再点按钮，观察「下一次输入」的格式；
 *   切换「颜色」控件后点「文字颜色」换色；对比「高亮」与「背景色」按钮的读数差异。
 * 预期结果：加粗、斜体、下划线、高亮各自是独立 mark；颜色、字号、背景色写进同一个
 *   textStyle mark 的属性，渲染合并成一个 <span style>；读数给出选区 marks、textStyle 属性与 span 标签。
 * 阅读主线：Highlight 与 BackgroundColor 都给文字上底色——一个新增 mark，一个写进 span 属性。
 */
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Highlight } from '@tiptap/extension-highlight';
import { Italic } from '@tiptap/extension-italic';
import { Paragraph } from '@tiptap/extension-paragraph';
import { TextStyle, Color, FontSize, BackgroundColor } from '@tiptap/extension-text-style';
import { Text } from '@tiptap/extension-text';
import { Underline } from '@tiptap/extension-underline';

export interface StyleLabArgs {
  color: string;
}

export interface StyleLabSnapshot {
  marks: string;
  textStyleAttrs: string;
  spanTag: string;
}

export interface StyleLabInstance {
  update(args: StyleLabArgs): void;
  dispose(): void;
}

const HIGHLIGHT_COLOR = '#ffe08a';
const BACKGROUND_COLOR = '#dbeafe';
const FONT_SIZE = '20px';

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Underline,
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
  FontSize,
  BackgroundColor,
];

const CONTENT =
  '<p>选中一段文字，再点上方按钮应用样式。</p>' +
  '<p>样式可以叠加：加粗、颜色、字号同时生效。</p>';

// 当前选区挂在哪些 mark 上：空选区时读 storedMarks（下一次输入的格式）
function markNames(editor: Editor): string {
  const selection = editor.state.selection;
  const stored = selection.empty ? editor.state.storedMarks : null;
  const marks = stored ?? selection.$from.marks();
  const names = marks.map((mark) => mark.type.name);
  return names.length > 0 ? names.join('、') : '（无）';
}

// textStyle mark 的全部属性：家族命令的写入结果都在这里
function textStyleAttrs(editor: Editor): string {
  const attrs = editor.getAttributes('textStyle');
  const entries = Object.entries(attrs).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );
  return entries.length > 0
    ? entries.map(([key, value]) => `${key}:${value}`).join('；')
    : '—';
}

// 渲染产物：家族属性合并进同一个 span 的 style
function spanTag(editor: Editor): string {
  const match = editor.getHTML().match(/<span[^>]*>/);
  return match ? match[0] : '—';
}

export function createStyleLabDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StyleLabSnapshot) => void,
): StyleLabInstance {
  const frame = document.createElement('div');
  frame.className = 'tse-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'tse-toolbar';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'tse-box-label';
  hostLabel.textContent = '编辑器（选中文字后点按钮，读数实时更新）';
  const host = document.createElement('div');
  host.className = 'tse-editor tse-editor--edit';

  frame.append(toolbar, hostLabel, host);

  let currentColor = '#e06c6c';
  let editor: Editor | null = null;

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    emit({
      marks: markNames(editor),
      textStyleAttrs: textStyleAttrs(editor),
      spanTag: spanTag(editor),
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

  editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: CONTENT,
  });

  // 选区与文档的每次变化都触发 transaction，读数随之刷新
  editor.on('transaction', () => emitSnapshot());

  // 标记类扩展：set / toggle / unset 三件套
  addToolbarButton('加粗', () => editor?.commands.toggleBold());
  addToolbarButton('斜体', () => editor?.commands.toggleItalic());
  addToolbarButton('下划线', () => editor?.commands.toggleUnderline());
  addToolbarButton('高亮', () =>
    editor?.commands.toggleHighlight({ color: HIGHLIGHT_COLOR }),
  );

  // text-style 家族：属性写进 textStyle mark，unset 自动清理空 span
  addToolbarButton('文字颜色', () => editor?.commands.setColor(currentColor));
  addToolbarButton('清除颜色', () => editor?.commands.unsetColor());
  addToolbarButton('字号 20px', () => editor?.commands.setFontSize(FONT_SIZE));
  addToolbarButton('背景色', () => {
    if (!editor) {
      return;
    }
    // BackgroundColor 只有 set / unset，没有 toggle：先读当前值再决定
    const current = editor.getAttributes('textStyle').backgroundColor;
    if (current === BACKGROUND_COLOR) {
      editor.commands.unsetBackgroundColor();
    } else {
      editor.commands.setBackgroundColor(BACKGROUND_COLOR);
    }
  });
  addToolbarButton('清除全部', () => editor?.commands.unsetAllMarks());

  emitSnapshot();

  return {
    update(args) {
      currentColor = args.color;
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
