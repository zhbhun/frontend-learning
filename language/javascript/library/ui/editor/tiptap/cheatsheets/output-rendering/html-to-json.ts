/**
 * 范例介绍：没有编辑器实例时，用 generateJSON 把 HTML 转成可入库的 JSON 文档，再用 generateHTML 往返验证。
 * 前置状态：转换用 extensions 只装 Document、Paragraph、Text、Heading、Bold 五个成员。
 * 操作：切换「HTML 预设」——合法 HTML / 含未注册标签（marquee、img）的 HTML。
 * 预期结果：合法预设产出完整 JSON；未注册标签连同内容被静默过滤，doc 子节点从 4 个减到 2 个，全程无报错。
 * 阅读主线：HTML 方向按标签名静默过滤，与上一实例「JSON 方向直接抛错」形成方向不对称。
 */
import { generateHTML, generateJSON, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type HtmlPreset = 'valid' | 'unknown-tag';

export interface HtmlToJsonArgs {
  preset: HtmlPreset;
}

export interface HtmlToJsonSnapshot {
  presetLabel: string;
  generateStatus: string;
  childCount: string;
  roundTrip: string;
  errorMessage: string;
}

export interface HtmlToJsonInstance {
  update(args: HtmlToJsonArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading, Bold];

const PRESET_LABELS: Record<HtmlPreset, string> = {
  valid: '合法 HTML（2 个块级元素）',
  'unknown-tag': '含未注册标签（4 个块级元素）',
};

// marquee 是历史遗留标签；img 需要渲染端安装 image 扩展才会被 schema 接纳
const PRESETS: Record<HtmlPreset, string> = {
  valid: '<h2>发布记录</h2><p>本周发布<strong>三个功能</strong>。</p>',
  'unknown-tag':
    '<h2>发布记录</h2><marquee>已下线的促销文案</marquee><p>本周发布<strong>三个功能</strong>。</p><img src="/photo.png" alt="照片">',
};

export function createHtmlToJsonDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HtmlToJsonSnapshot) => void,
): HtmlToJsonInstance {
  // 本例只做字符串转换，不需要画布：用 div 替换 canvasStory 提供的画布
  const frame = document.createElement('div');
  frame.className = 'or-frame';
  canvas.replaceWith(frame);

  const column = document.createElement('div');
  column.className = 'or-column';
  const title = document.createElement('p');
  title.className = 'or-box-label';
  title.textContent = 'generateJSON(html, extensions) 的返回值';
  const jsonPre = document.createElement('pre');
  jsonPre.className = 'or-pre';
  column.append(title, jsonPre);

  const errorBox = document.createElement('p');
  errorBox.className = 'or-error';

  frame.append(column, errorBox);

  function applyPreset(preset: HtmlPreset): void {
    const html = PRESETS[preset];

    // HTML 方向：DOMParser 按 schema 解析，未注册标签静默过滤，不会抛错
    let doc: JSONContent | null = null;
    let roundTripHtml: string | null = null;
    let errorMessage: string | null = null;
    try {
      doc = generateJSON(html, EXTENSIONS);
      jsonPre.textContent = JSON.stringify(doc, null, 2);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      jsonPre.textContent = errorMessage;
      jsonPre.classList.toggle('or-pre--error', true);
    }
    if (errorMessage === null) {
      jsonPre.classList.remove('or-pre--error');
    }

    // 往返验证：生成的 JSON 交给 generateHTML，能直接渲染说明是合法文档
    if (doc) {
      try {
        roundTripHtml = generateHTML(doc, EXTENSIONS);
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
    }

    const childCount = doc?.content?.length ?? 0;

    emit({
      presetLabel: PRESET_LABELS[preset],
      generateStatus: doc ? '成功' : '抛错',
      childCount: `${childCount} 个`,
      roundTrip: roundTripHtml === null ? '抛错' : '成功',
      errorMessage: errorMessage ?? '无',
    });

    errorBox.textContent = errorMessage ?? '本次转换没有抛错';
    errorBox.classList.toggle('or-error--none', errorMessage === null);
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
