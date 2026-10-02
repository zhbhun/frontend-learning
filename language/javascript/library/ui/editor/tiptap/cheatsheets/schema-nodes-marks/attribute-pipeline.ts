/**
 * 范例介绍：addAttributes 定义的属性的三段链路——parseHTML 收、attrs 存、renderHTML 出。
 * 前置状态：Highlight 开启 multicolor，color 属性 default 为 null；
 *   属性级 parseHTML 从 data-color 或内联 background-color 取值，
 *   属性级 renderHTML 输出 data-color 与 style。
 * 操作：切换「content 预设」，对照同一颜色的三种传入方式。
 * 预期结果：data-color 与 style 两种输入都存进 getJSON 的 attrs.color，
 *   getHTML 统一输出 data-color + style；不带颜色信息的 mark 属性为 null，
 *   JSON 与 HTML 里都不出现该属性。
 * 阅读主线：输入形态不同 → attrs 相同 → 输出形态统一。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Highlight } from '@tiptap/extension-highlight';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type AttrPreset = 'data-color' | 'style' | 'plain';

export interface AttributePipelineArgs {
  preset: AttrPreset;
}

export interface AttributePipelineSnapshot {
  color: string;
  dataColor: string;
}

export interface AttributePipelineInstance {
  update(args: AttributePipelineArgs): void;
  dispose(): void;
}

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Highlight.configure({ multicolor: true }),
];

const PRESETS: Record<AttrPreset, string> = {
  // 属性级 parseHTML 第一优先级：data-color
  'data-color': '<p><mark data-color="#fde047">data 属性传入</mark></p>',
  // 取不到 data-color 时回退到内联样式的 background-color
  style: '<p><mark style="background-color: #86efac">内联样式传入</mark></p>',
  // 两种来源都没有：属性保持默认值 null，输出时不产生附加属性
  plain: '<p><mark>没有颜色信息</mark></p>',
};

/** 从 getJSON 里找出第一个 highlight 标记的 color 属性值。 */
function findHighlightColor(json: JSONContent): string | null {
  for (const mark of json.marks ?? []) {
    if (mark.type === 'highlight') {
      const color = mark.attrs?.color;
      return typeof color === 'string' ? color : null;
    }
  }
  for (const child of json.content ?? []) {
    const found = findHighlightColor(child);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

export function createAttributePipelineDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AttributePipelineSnapshot) => void,
): AttributePipelineInstance {
  const frame = document.createElement('div');
  frame.className = 'snm-frame snm-columns';
  canvas.replaceWith(frame);

  // 左列：喂给编辑器的 HTML
  const inputColumn = document.createElement('div');
  inputColumn.className = 'snm-column';
  const inputLabel = document.createElement('p');
  inputLabel.className = 'snm-box-label';
  inputLabel.textContent = 'content 输入';
  const inputPre = document.createElement('pre');
  inputPre.className = 'snm-pre';
  inputColumn.append(inputLabel, inputPre);

  // 右列：attrs 存了什么、renderHTML 又输出了什么
  const outputColumn = document.createElement('div');
  outputColumn.className = 'snm-column';
  const jsonLabel = document.createElement('p');
  jsonLabel.className = 'snm-box-label';
  jsonLabel.textContent = 'getJSON() 输出（看 marks 里的 attrs）';
  const jsonPre = document.createElement('pre');
  jsonPre.className = 'snm-pre snm-pre--half';
  const htmlLabel = document.createElement('p');
  htmlLabel.className = 'snm-box-label';
  htmlLabel.textContent = 'getHTML() 输出（renderHTML 渲染）';
  const htmlPre = document.createElement('pre');
  htmlPre.className = 'snm-pre snm-pre--half';
  outputColumn.append(jsonLabel, jsonPre, htmlLabel, htmlPre);

  frame.append(inputColumn, outputColumn);

  let editor: Editor | null = null;

  function apply(args: AttributePipelineArgs): void {
    editor?.destroy();

    const html = PRESETS[args.preset];
    inputPre.textContent = html;

    // content 是构造选项：每次切换都重新 new Editor，走一遍完整解析
    editor = new Editor({
      extensions: EXTENSIONS,
      content: html,
      editable: false,
    });

    const json = editor.getJSON();
    jsonPre.textContent = JSON.stringify(json, null, 2);
    htmlPre.textContent = editor.getHTML();

    const color = findHighlightColor(json);
    const markTag = /<mark[^>]*>/.exec(editor.getHTML())?.[0] ?? '（无 mark）';
    const dataColor = /data-color="([^"]*)"/.exec(markTag)?.[1] ?? null;

    emit({
      color: color ?? 'null（默认值）',
      dataColor: dataColor ?? '（无附加属性）',
    });
  }

  return {
    update(nextArgs) {
      apply(nextArgs);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
