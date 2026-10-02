/**
 * 范例介绍：parseHTML 决定收下哪些 HTML，renderHTML 决定输出哪些 HTML——多进一出。
 * 前置状态：编辑器装了 Bold、Underline、Strike 三种标记，各自带多条 parseHTML 规则。
 * 操作：切换「content 预设」，观察哪些写法被识别成标记、getHTML 统一输出成什么标签。
 * 预期结果：strong、b、font-weight 样式都收成 bold，输出统一为 strong；
 *   u 与 text-decoration 样式收成 underline，输出 u；s、del 收成 strike，输出 s；
 *   「edge」预设里 font-weight: normal 的 b 被规则拦下，按普通文本收下。
 * 阅读主线：左侧输入形态各异，右侧输出只有一套规范标签。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';
import { Underline } from '@tiptap/extension-underline';

export type ParsePreset = 'tags' | 'styles' | 'legacy' | 'edge';

export interface ParseRenderArgs {
  preset: ParsePreset;
}

export interface ParseRenderSnapshot {
  marksInDoc: string;
  outputTags: string;
}

export interface ParseRenderInstance {
  update(args: ParseRenderArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Bold, Underline, Strike];

const PRESETS: Record<ParsePreset, string> = {
  // 同一个 bold 标记的两条标签规则：strong 与 b
  tags: '<p><strong>语义加粗</strong>与<b>旧式加粗</b></p>',
  // 样式规则：font-weight 收成 bold，text-decoration 收成 underline
  styles:
    '<p><span style="font-weight: bold">样式加粗</span>与<span style="text-decoration: underline">样式下划线</span></p>',
  // 同一个 strike 标记的三条标签规则：s、del、strike
  legacy: '<p><u>下划线标签</u>、<s>删除线标签</s>、<del>旧式删除线</del></p>',
  // b 规则的 getAttrs 检查 font-weight !== normal：写法匹配但内容不算加粗
  edge: '<p><b style="font-weight: normal">假装加粗</b>与<b>真加粗</b></p>',
};

/** 统计 getJSON 里各标记类型的出现次数，如 bold × 2。 */
function collectMarks(node: JSONContent, counts: Map<string, number>): void {
  node.marks?.forEach((mark) => {
    counts.set(mark.type, (counts.get(mark.type) ?? 0) + 1);
  });
  node.content?.forEach((child) => collectMarks(child, counts));
}

/** 从 getHTML 里收集段落标签以外的输出标签名。 */
function collectTags(html: string): string[] {
  const tags = new Set<string>();
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)[ />]/g)) {
    if (match[1] !== 'p') {
      tags.add(match[1]);
    }
  }
  return [...tags];
}

export function createParseRenderDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ParseRenderSnapshot) => void,
): ParseRenderInstance {
  const frame = document.createElement('div');
  frame.className = 'snm-frame snm-columns';
  canvas.replaceWith(frame);

  // 左列：喂给编辑器的 HTML
  const inputColumn = document.createElement('div');
  inputColumn.className = 'snm-column';
  const inputLabel = document.createElement('p');
  inputLabel.className = 'snm-box-label';
  inputLabel.textContent = 'content 输入（多种写法）';
  const inputPre = document.createElement('pre');
  inputPre.className = 'snm-pre';
  inputColumn.append(inputLabel, inputPre);

  // 右列：编辑器实际收下并输出的 HTML
  const outputColumn = document.createElement('div');
  outputColumn.className = 'snm-column';
  const outputLabel = document.createElement('p');
  outputLabel.className = 'snm-box-label';
  outputLabel.textContent = '编辑器实际收下并输出的内容（getHTML）';
  const outputPre = document.createElement('pre');
  outputPre.className = 'snm-pre';
  outputColumn.append(outputLabel, outputPre);

  frame.append(inputColumn, outputColumn);

  let editor: Editor | null = null;

  function apply(args: ParseRenderArgs): void {
    editor?.destroy();

    const html = PRESETS[args.preset];
    inputPre.textContent = html;

    // content 是构造选项：每次切换都重新 new Editor，走一遍完整解析
    editor = new Editor({
      extensions: EXTENSIONS,
      content: html,
      editable: false,
    });

    outputPre.textContent = editor.getHTML() || '（空文档）';

    const counts = new Map<string, number>();
    collectMarks(editor.getJSON(), counts);
    const marksInDoc =
      [...counts.entries()]
        .map(([type, count]) => (count > 1 ? `${type} × ${count}` : type))
        .join('、') || '（无标记）';

    emit({
      marksInDoc,
      outputTags: collectTags(editor.getHTML()).join('、') || '（无）',
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
