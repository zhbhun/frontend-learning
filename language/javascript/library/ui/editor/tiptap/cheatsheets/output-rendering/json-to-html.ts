/**
 * 范例介绍：没有编辑器实例时，用 generateHTML / generateText 把存储的 JSON 转成 HTML 与纯文本。
 * 前置状态：转换用 extensions 只装 Document、Paragraph、Text、Heading、Bold 五个成员。
 * 操作：切换「JSON 预设」——合法文档 / 渲染端未安装 image 扩展的文档。
 * 预期结果：合法预设下 generateHTML 与只读编辑器 getHTML() 输出逐字符一致；未注册节点预设下
 * generateHTML、generateText 直接抛 RangeError，只读编辑器却降级为空文档继续工作。
 * 阅读主线：两条路径共用同一份 schema，但离线转换没有编辑器的静默降级兜底。
 */
import { Editor, generateHTML, generateText, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type JsonPreset = 'valid' | 'unknown-node';

export interface JsonToHtmlArgs {
  preset: JsonPreset;
}

export interface JsonToHtmlSnapshot {
  presetLabel: string;
  htmlStatus: string;
  textPreview: string;
  editorMatches: string;
  errorMessage: string;
}

export interface JsonToHtmlInstance {
  update(args: JsonToHtmlArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading, Bold];

const PRESET_LABELS: Record<JsonPreset, string> = {
  valid: '合法文档',
  'unknown-node': '含未注册节点（image）',
};

// 存储中的文档：一段标题加一个含加粗的段落
const VALID_DOC: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '发布记录' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '本周发布' },
        { type: 'text', text: '三个功能', marks: [{ type: 'bold' }] },
        { type: 'text', text: '，详情见下文。' },
      ],
    },
  ],
};

// 存储端装过 image 扩展，渲染端没有：image 是这份 schema 不认识的节点
const UNKNOWN_NODE_DOC: JSONContent = {
  type: 'doc',
  content: [
    { type: 'image', attrs: { src: '/cover.png', alt: '封面' } },
    { type: 'paragraph', content: [{ type: 'text', text: '首行是图片节点，schema 不认识它。' }] },
  ],
};

const DOCS: Record<JsonPreset, JSONContent> = {
  valid: VALID_DOC,
  'unknown-node': UNKNOWN_NODE_DOC,
};

export function createJsonToHtmlDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: JsonToHtmlSnapshot) => void,
): JsonToHtmlInstance {
  // 本例只做字符串转换，不需要画布：用 div 替换 canvasStory 提供的画布
  const frame = document.createElement('div');
  frame.className = 'or-frame';
  canvas.replaceWith(frame);

  const columns = document.createElement('div');
  columns.className = 'or-columns';
  const buildColumn = (label: string) => {
    const column = document.createElement('div');
    column.className = 'or-column';
    const title = document.createElement('p');
    title.className = 'or-box-label';
    title.textContent = label;
    const pre = document.createElement('pre');
    pre.className = 'or-pre';
    column.append(title, pre);
    columns.append(column);
    return pre;
  };
  const generatedPre = buildColumn('generateHTML(doc, extensions)');
  const editorPre = buildColumn('只读编辑器 getHTML()');

  const errorBox = document.createElement('p');
  errorBox.className = 'or-error';

  frame.append(columns, errorBox);

  function applyPreset(preset: JsonPreset): void {
    const doc = DOCS[preset];

    // 离线路径：直接从 extensions 推导 schema，不创建编辑器；schema 外节点会抛错
    let generatedHtml: string | null = null;
    let text: string | null = null;
    let errorMessage: string | null = null;
    try {
      generatedHtml = generateHTML(doc, EXTENSIONS);
      text = generateText(doc, EXTENSIONS);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    generatedPre.textContent = errorMessage ?? generatedHtml ?? '';
    generatedPre.classList.toggle('or-pre--error', errorMessage !== null);

    // 编辑器路径：同一份 schema，但编辑器把非法 JSON 降级为空文档而不是抛错
    let editorHtml: string | null = null;
    let editorDowngraded = false;
    try {
      const editor = new Editor({ extensions: EXTENSIONS, content: doc, editable: false });
      editorHtml = editor.getHTML();
      // 2.1 讲过：单个空段落也算空，因此 isEmpty 为 true 即降级成了空文档
      editorDowngraded = editor.isEmpty;
      editor.destroy();
    } catch (error) {
      editorHtml = error instanceof Error ? error.message : String(error);
    }
    editorPre.textContent = editorDowngraded ? '（降级为空文档）' : (editorHtml ?? '');

    errorBox.textContent = errorMessage ?? '本次转换没有抛错';
    errorBox.classList.toggle('or-error--none', errorMessage === null);

    emit({
      presetLabel: PRESET_LABELS[preset],
      htmlStatus: errorMessage ? '抛错' : '成功',
      textPreview: text === null ? '抛错' : preview(text),
      editorMatches:
        generatedHtml === null
          ? '—（离线路径抛错）'
          : generatedHtml === editorHtml
            ? '是'
            : '否',
      errorMessage: errorMessage ?? '无',
    });
  }

  // 纯文本读数预览：换行符换成可见符号，超出部分截断
  function preview(value: string): string {
    const flat = value.replace(/\n/g, '␤');
    return flat.length > 30 ? `${flat.slice(0, 30)}…` : flat;
  }

  applyPreset('valid');

  return {
    update(args) {
      applyPreset(args.preset);
    },
    dispose() {
      frame.remove();
    },
  };
}
