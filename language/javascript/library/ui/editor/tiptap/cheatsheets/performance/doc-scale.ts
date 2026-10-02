/**
 * 范例介绍：全量读数成本随文档规模的增长——200 / 800 / 1600 段下各类
 * 「读整棵文档」操作的单次耗时。
 * 前置状态：只读编辑器，schema 只装 Document、Paragraph、Text；切换规模时重建编辑器。
 * 操作：切换「文档规模」；每项耗时用 performance.now 测量，预热 1 次后测 7 次取中位数。
 * 预期结果：getJSON / getHTML / getText / 全文遍历 / 全文取文本的耗时都随段落数近似线性增长。
 * 阅读主线：大文档下编辑本身依然流畅（视图只重绘变化的部分），贵的是全量读数——
 *   这类调用要按需、防抖，或只读需要的子树。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type DocSize = '200' | '800' | '1600';

export interface DocScaleArgs {
  docSize: DocSize;
}

export interface DocScaleSnapshot {
  paragraphCount: number;
  charCount: number;
  getJsonCost: number;
  getHtmlCost: number;
  getTextCost: number;
  traverseCost: number;
  textBetweenCost: number;
}

export interface DocScaleInstance {
  update(args: DocScaleArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text];

function buildContent(count: number): string {
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i += 1) {
    paragraphs.push(
      `<p>第 ${i + 1} 段：全量读数的耗时随文档规模线性增长，按需调用、防抖或只读子树。</p>`,
    );
  }
  return paragraphs.join('');
}

// 预热 1 次排除首次解析噪声，再测 runs 次取中位数
function medianCost(fn: () => void, runs = 7): number {
  fn();
  const samples: number[] = [];
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(runs / 2)];
}

export function createDocScaleDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DocScaleSnapshot) => void,
): DocScaleInstance {
  const frame = document.createElement('div');
  frame.className = 'perf-frame perf-frame--roomy';
  canvas.replaceWith(frame);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'perf-box-label';
  hostLabel.textContent = '编辑器（只读，切换规模后测量各类全量读数）';
  const host = document.createElement('div');
  host.className = 'perf-editor perf-editor--readonly';

  frame.append(hostLabel, host);

  let editor: Editor | null = null;
  let lastSize: DocSize | null = null;

  function measureAndEmit(size: DocSize): void {
    if (!editor) {
      return;
    }
    const doc = editor.state.doc;

    const getJsonCost = medianCost(() => editor!.getJSON());
    const getHtmlCost = medianCost(() => editor!.getHTML());
    const getTextCost = medianCost(() => editor!.getText());
    // 全文遍历：字数统计、自定义扫描等操作的共同形态
    const traverseCost = medianCost(() => {
      let nodes = 0;
      doc.descendants(() => {
        nodes += 1;
      });
    });
    // 全文取文本：CharacterCount 等扩展的底层调用
    const textBetweenCost = medianCost(() => {
      doc.textBetween(0, doc.content.size, ' ', ' ');
    });

    const fullText = doc.textBetween(0, doc.content.size, ' ', ' ');

    emit({
      paragraphCount: doc.childCount,
      charCount: fullText.length,
      getJsonCost,
      getHtmlCost,
      getTextCost,
      traverseCost,
      textBetweenCost,
    });
  }

  function applySize(size: DocSize): void {
    editor?.destroy();
    host.replaceChildren();

    editor = new Editor({
      element: host,
      extensions: EXTENSIONS,
      content: buildContent(Number(size)),
      editable: false,
    });

    lastSize = size;
    measureAndEmit(size);
  }

  applySize('800');

  return {
    update(args) {
      // 规模未变时（如同页其他控件触发重渲染）直接复用上次测量
      if (args.docSize === lastSize && editor) {
        return;
      }
      lastSize = args.docSize;
      applySize(args.docSize);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
