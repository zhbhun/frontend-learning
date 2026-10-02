/**
 * 范例介绍：text-style 家族的宿主验证——只装 Color 不装 TextStyle 时 setColor 会怎样。
 * 前置状态：两台只读编辑器，A 只装 Color，B 装 TextStyle + Color，内容相同。
 * 操作：点「setColor」或「unsetColor」，两台执行同样的命令（异常被捕获后显示在编辑器下方的结果行里）。
 * 预期结果：A 抛出 “There is no mark type named 'textStyle'”，内容不变；B 正常写入
 *   <span style="color: ...">，unset 后结果行回到没有 span 的原始 HTML。
 * 阅读主线：家族扩展只是属性注入器，真正的 mark 与 <span> 由 TextStyle 提供。
 */
import { Editor, type Extensions } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Text } from '@tiptap/extension-text';

export interface SpanHostInstance {
  update(): void;
  dispose(): void;
}

const CONTENT = '<p>一段等待上色的文字。</p>';
const TEXT_COLOR = '#e06c6c';

// 两台编辑器的差别只有 TextStyle：家族命令写不写得进去，全看它
const EXTENSIONS_WITHOUT_HOST: Extensions = [Document, Paragraph, Text, Color];
const EXTENSIONS_WITH_HOST: Extensions = [
  Document,
  Paragraph,
  Text,
  TextStyle,
  Color,
];

interface HostSlot {
  host: HTMLElement;
  resultLine: HTMLElement;
  editor: Editor | null;
}

function createSlot(
  parent: HTMLElement,
  label: string,
  extensions: Extensions,
): HostSlot {
  const box = document.createElement('div');
  box.className = 'tse-host';

  const labelEl = document.createElement('p');
  labelEl.className = 'tse-box-label';
  labelEl.textContent = label;

  const host = document.createElement('div');
  host.className = 'tse-editor';

  const resultLine = document.createElement('code');
  resultLine.className = 'tse-result';

  box.append(labelEl, host, resultLine);
  parent.append(box);

  const editor = new Editor({
    element: host,
    extensions,
    content: CONTENT,
    editable: false,
  });

  return { host, resultLine, editor };
}

// 选中全部正文后执行命令；家族命令缺宿主时抛出的异常原样显示
function runCommand(slot: HostSlot, action: (editor: Editor) => void): void {
  const editor = slot.editor;
  if (!editor) {
    return;
  }
  try {
    editor.commands.setTextSelection({
      from: 1,
      to: editor.state.doc.content.size - 1,
    });
    action(editor);
    slot.resultLine.textContent = editor.getHTML();
  } catch (error) {
    slot.resultLine.textContent = `抛错：${(error as Error).message}`;
  }
}

export function createSpanHostDemo(
  canvas: HTMLCanvasElement,
): SpanHostInstance {
  const frame = document.createElement('div');
  frame.className = 'tse-frame tse-frame--narrow';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'tse-toolbar';
  const setColorButton = document.createElement('button');
  setColorButton.type = 'button';
  setColorButton.className = 'tse-btn';
  setColorButton.textContent = 'setColor';
  const unsetColorButton = document.createElement('button');
  unsetColorButton.type = 'button';
  unsetColorButton.className = 'tse-btn';
  unsetColorButton.textContent = 'unsetColor';
  toolbar.append(setColorButton, unsetColorButton);

  const hosts = document.createElement('div');
  hosts.className = 'tse-hosts';

  const slotWithoutHost = createSlot(
    hosts,
    '只有 Color（无 TextStyle）',
    EXTENSIONS_WITHOUT_HOST,
  );
  const slotWithHost = createSlot(
    hosts,
    'TextStyle + Color',
    EXTENSIONS_WITH_HOST,
  );

  frame.append(toolbar, hosts);

  function recreateEditor(slot: HostSlot, extensions: Extensions): void {
    slot.editor?.destroy();
    slot.host.replaceChildren();
    slot.editor = new Editor({
      element: slot.host,
      extensions,
      content: CONTENT,
      editable: false,
    });
  }

  // 每次点击都重建两台编辑器，保证结果可重复、两次操作互不残留
  function run(kind: 'set' | 'unset'): void {
    recreateEditor(slotWithoutHost, EXTENSIONS_WITHOUT_HOST);
    recreateEditor(slotWithHost, EXTENSIONS_WITH_HOST);
    const action =
      kind === 'set'
        ? (editor: Editor) => editor.commands.setColor(TEXT_COLOR)
        : (editor: Editor) => editor.commands.unsetColor();
    runCommand(slotWithoutHost, action);
    runCommand(slotWithHost, action);
  }

  setColorButton.addEventListener('click', () => run('set'));
  unsetColorButton.addEventListener('click', () => run('unset'));

  // 初始展示：两台都渲染同样内容
  slotWithoutHost.resultLine.textContent =
    slotWithoutHost.editor?.getHTML() ?? '';
  slotWithHost.resultLine.textContent = slotWithHost.editor?.getHTML() ?? '';

  return {
    update() {
      // 本实例没有 Controls 输入，update 保持空操作
    },
    dispose() {
      slotWithoutHost.editor?.destroy();
      slotWithHost.editor?.destroy();
      frame.remove();
    },
  };
}
