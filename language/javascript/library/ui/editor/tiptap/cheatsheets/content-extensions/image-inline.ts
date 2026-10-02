/**
 * 范例介绍：Image 的 inline 配置是 schema 级开关——决定图片是块级节点还是行内节点。
 * 前置状态：装 Image.configure({ inline, allowBase64: true })（范例图片是内嵌 data URI，
 *   所以显式开启 allowBase64；inline 由控件开关传入）；两种配置输入同一份 HTML。
 * 操作：切换「inline」开关重建编辑器，对比同一份输入解析出的文档结构。
 * 预期结果：inline 关——img 被 schema 抬升为 doc 的直接子节点（块级，段落被切开）；
 *   inline 开——img 留在段落里（行内，与文字同行）。
 * 阅读主线：「img 父节点」读数来自 getJSON 的层级，与渲染结果互相印证。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Image } from '@tiptap/extension-image';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import './demo.css';

export type ImageMode = 'block' | 'inline';

export interface ImageInlineArgs {
  inline: boolean;
}

export interface ImageInlineSnapshot {
  modeLabel: string;
  imgParent: string;
}

export interface ImageInlineInstance {
  update(args: ImageInlineArgs): void;
  dispose(): void;
}

// 内嵌 SVG 图片：不依赖网络；data URI 需要 allowBase64: true 才能被解析
const SVG_ICON =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80">' +
      '<rect width="220" height="80" rx="10" fill="#dbe7ff"/>' +
      '<text x="110" y="46" font-family="sans-serif" font-size="16" fill="#3b5bd9" text-anchor="middle">示例图片</text>' +
      '</svg>',
  );

const CONTENT = [
  '<p>独立的段落文字。</p>',
  `<p>行内文字<img src="${SVG_ICON}" alt="示例图片" title="示例">续接的文字。</p>`,
].join('');

const EXTENSIONS_LABELS: Record<ImageMode, string> = {
  block: 'inline: false（块级，默认）',
  inline: 'inline: true（行内）',
};

// 从 getJSON 里找 image 节点挂在谁身上：doc 直接子节点，还是 paragraph 的行内内容
function findImageParent(json: JSONContent, parent: string): string | null {
  if (json.type === 'image') {
    return parent;
  }
  for (const child of json.content ?? []) {
    // JSONContent.type 允许缺省，向下传父级类型时兜底为空串
    const found = findImageParent(child, json.type ?? '');
    if (found) {
      return found;
    }
  }
  return null;
}

export function createImageInlineDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ImageInlineSnapshot) => void,
): ImageInlineInstance {
  const frame = document.createElement('div');
  frame.className = 'ce-frame';
  canvas.replaceWith(frame);

  const modeLabel = document.createElement('p');
  modeLabel.className = 'ce-box-label';
  const host = document.createElement('div');
  host.className = 'ce-editor';

  frame.append(modeLabel, host);

  let editor: Editor | null = null;

  function applyMode(args: ImageInlineArgs): void {
    editor?.destroy();
    host.replaceChildren();

    editor = new Editor({
      element: host,
      extensions: [
        Document,
        Paragraph,
        Text,
        Image.configure({
          inline: args.inline,
          allowBase64: true, // 范例图片是 data URI，必须显式允许
        }),
      ],
      content: CONTENT, // 同一份 HTML 输入
      editable: false,
    });

    const parentType = findImageParent(editor.getJSON(), 'doc');

    modeLabel.textContent = `Image.configure({ inline: ${String(args.inline)} })`;
    const parentLabel =
      parentType === 'doc'
        ? 'doc（块级：独立成块）'
        : parentType === 'paragraph'
          ? 'paragraph（行内：与文字同行）'
          : '未解析到';
    emit({
      modeLabel: EXTENSIONS_LABELS[args.inline ? 'inline' : 'block'],
      imgParent: parentLabel,
    });
  }

  applyMode({ inline: false });

  return {
    update(args) {
      applyMode(args);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
