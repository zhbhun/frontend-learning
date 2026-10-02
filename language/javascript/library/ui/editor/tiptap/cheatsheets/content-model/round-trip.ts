/**
 * 范例介绍：同一份文档分别用 HTML 字符串与 JSON 文档输入，输出完全一致——文档树是输入输出的中枢。
 * 前置状态：schema 只装 Document、Paragraph、Text、Heading、Bold 五个成员。
 * 操作：切换「content 输入格式」——两种预设表达同一份文档（一段标题加一个含加粗的段落）。
 * 预期结果：编辑器渲染相同；getJSON、getHTML、getText 与基准（HTML 输入的输出）逐项一致。
 * 阅读主线：切换输入格式时，三项「与基准一致」读数为什么纹丝不动。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type InputFormat = 'html' | 'json';

export interface RoundTripArgs {
  format: InputFormat;
}

export interface RoundTripSnapshot {
  formatLabel: string;
  htmlMatches: boolean;
  jsonMatches: boolean;
  textMatches: boolean;
}

export interface RoundTripInstance {
  update(args: RoundTripArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading, Bold];

const FORMAT_LABELS: Record<InputFormat, string> = {
  html: 'HTML 字符串',
  json: 'JSON 文档',
};

// 两种输入表达同一份文档：一段标题加一个含加粗的段落
const HTML_CONTENT =
  '<h2>会议纪要</h2><p>输入输出都经过<strong>文档树</strong>，格式只是投影。</p>';

const JSON_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '会议纪要' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '输入输出都经过' },
        { type: 'text', text: '文档树', marks: [{ type: 'bold' }] },
        { type: 'text', text: '，格式只是投影。' },
      ],
    },
  ],
};

const CONTENTS: Record<InputFormat, string | JSONContent> = {
  html: HTML_CONTENT,
  json: JSON_CONTENT,
};

export function createRoundTripDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RoundTripSnapshot) => void,
): RoundTripInstance {
  // 编辑器是普通 DOM 组件：用 div 作为挂载目标（element），替换 canvasStory 提供的画布
  const frame = document.createElement('div');
  frame.className = 'cm-frame';
  canvas.replaceWith(frame);

  const editorLabel = document.createElement('p');
  editorLabel.className = 'cm-box-label';
  editorLabel.textContent = '编辑器渲染结果（只读展示）';
  const host = document.createElement('div');
  host.className = 'cm-editor';

  const outputs = document.createElement('div');
  outputs.className = 'cm-outputs';
  const pres = (['getJSON()', 'getHTML()', 'getText()'] as const).map((label) => {
    const column = document.createElement('div');
    column.className = 'cm-column';
    const title = document.createElement('p');
    title.className = 'cm-box-label';
    title.textContent = label;
    const pre = document.createElement('pre');
    pre.className = 'cm-pre';
    column.append(title, pre);
    outputs.append(column);
    return pre;
  });
  const [jsonPre, htmlPre, textPre] = pres;

  frame.append(editorLabel, host, outputs);

  // 基准：HTML 输入得到的输出。若两种格式等价，与它逐项比较应恒等
  const reference = new Editor({ extensions: EXTENSIONS, content: HTML_CONTENT });
  const referenceJson = JSON.stringify(reference.getJSON());
  const referenceHtml = reference.getHTML();
  const referenceText = reference.getText();

  let editor: Editor | null = null;

  function applyFormat(format: InputFormat): void {
    editor?.destroy();
    host.replaceChildren();

    // content 是构造选项：每次切换都重新 new Editor，对应正文「解析只发生在创建时」
    editor = new Editor({
      element: host,
      extensions: EXTENSIONS,
      content: CONTENTS[format],
      editable: false,
    });

    // 同一棵树的三种序列化
    const json = editor.getJSON();
    const html = editor.getHTML();
    const text = editor.getText();

    jsonPre.textContent = JSON.stringify(json, null, 2);
    htmlPre.textContent = html;
    textPre.textContent = text;

    emit({
      formatLabel: FORMAT_LABELS[format],
      htmlMatches: html === referenceHtml,
      jsonMatches: JSON.stringify(json) === referenceJson,
      textMatches: text === referenceText,
    });
  }

  applyFormat('html');

  return {
    update(args) {
      applyFormat(args.format);
    },
    dispose() {
      editor?.destroy();
      reference.destroy();
      frame.remove();
    },
  };
}
