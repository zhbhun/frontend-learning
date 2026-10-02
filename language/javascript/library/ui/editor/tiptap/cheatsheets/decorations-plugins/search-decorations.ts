/**
 * 范例介绍：用 addDecorations() 声明三种装饰——同一搜索场景里对比 inline、widget、node。
 * 前置状态：编辑器装了一个 SearchHighlight 扩展（update: 'manual'），初始内容里
 *   有两处默认搜索词「装饰」；搜索词存在扩展 storage 里，属于文档之外的外部状态。
 * 操作：改「搜索词」会写回 storage 并调 updateDecorations 重建；直接在编辑器里
 *   打字则观察装饰只做位置映射（跟随文字移动、不重建）。
 * 预期结果：命中的文字包上 inline 高亮并前置一枚 widget 徽章，命中所在的块获得
 *   node 轮廓；getHTML() 输出里找不到任何装饰痕迹——装饰不进文档。
 * 阅读主线：storage.term（外部状态）→ create 扫描文档 → 三种 Decoration → 视图叠加。
 */
import { Decoration, Editor, Extension } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface SearchDecorationsArgs {
  term: string;
}

export interface SearchDecorationsSnapshot {
  term: string;
  counts: string;
  htmlTrace: string;
}

export interface SearchDecorationsInstance {
  update(args: SearchDecorationsArgs): void;
  dispose(): void;
}

/** 扩展私有状态：搜索词不属于文档，也不属于 schema。 */
export interface SearchHighlightStorage {
  term: string;
}

// editor.storage 的默认类型是各扩展 storage 的合表（空接口），
// 自定义扩展在这里登记自己的 storage 键，外部用 editor.storage.searchHighlight 才有类型
declare module '@tiptap/core' {
  interface Storage {
    searchHighlight: SearchHighlightStorage;
  }
}

interface MatchHit {
  from: number;
  to: number;
}

/** 全文小写扫描文本节点，收集搜索词的每一次命中。 */
function findMatches(doc: ProseMirrorNode, term: string): MatchHit[] {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const hits: MatchHit[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }
    const haystack = node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      hits.push({ from: pos + index, to: pos + index + needle.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
  });
  return hits;
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addStorage() {
    return { term: '装饰' } satisfies SearchHighlightStorage;
  },

  addDecorations() {
    return {
      // 搜索词是外部状态：manual 策略下只有初始化与 updateDecorations 命令重建，
      // 日常编辑只把现有装饰映射到新位置
      update: 'manual',
      create: ({ state }) => {
        const term = (this.storage as SearchHighlightStorage).term;
        const hits = findMatches(state.doc, term);
        const decorations: Decoration[] = [];
        // 用 Set 收集命中所在的顶层块，同一块多次命中只加一次 node 装饰
        const decoratedBlocks = new Set<number>();

        for (const { from, to } of hits) {
          // inline：给命中的文字包一层带 class 的 span
          decorations.push(Decoration.Inline(from, to, { class: 'dp-match' }));
          // widget：命中位置前插一枚徽章；side: -1 表示画在位置之前
          decorations.push(
            Decoration.Widget(
              from,
              () => {
                const badge = document.createElement('span');
                badge.className = 'dp-badge';
                badge.textContent = '★';
                return badge;
              },
              // 无状态的演示 widget 才允许位置派生 key；有状态请用业务 id
              { key: `dp-badge-${from}`, side: -1 },
            ),
          );
          // $pos.before(1)：doc 直接子节点（顶层块）开始前的位置
          decoratedBlocks.add(state.doc.resolve(from).before(1));
        }

        for (const blockStart of decoratedBlocks) {
          // node：给顶层块的 DOM 外层加属性，pos 与 pos + nodeSize 精确夹住一个节点
          decorations.push(
            Decoration.Node(blockStart, state.doc.resolve(blockStart).after(1), {
              class: 'dp-match-block',
            }),
          );
        }

        return decorations;
      },
    };
  },
});

const EXTENSIONS = [Document, Paragraph, Text, SearchHighlight];

const INITIAL_CONTENT = `
<p>装饰器改变文档的呈现，而不改变文档本身。</p>
<p>在这一段里再放一个装饰词，观察三种装饰如何叠加。</p>
`;

export function createSearchDecorationsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SearchDecorationsSnapshot) => void,
): SearchDecorationsInstance {
  const frame = document.createElement('div');
  frame.className = 'dp-lab';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'dp-hint';
  hint.textContent =
    '改「搜索词」或直接在编辑器里打字：已有装饰只做位置映射，跟随文字移动。';

  const columns = document.createElement('div');
  columns.className = 'dp-columns';

  // 左列：装了 SearchHighlight 扩展的可编辑编辑器
  const editorBox = document.createElement('div');
  editorBox.className = 'dp-editor';

  // 右列：getHTML 输出——装饰痕迹不应出现在这里
  const htmlBox = document.createElement('div');
  htmlBox.className = 'dp-htmlbox';
  const htmlLabel = document.createElement('p');
  htmlLabel.className = 'dp-box-label';
  htmlLabel.textContent = 'getHTML()（装饰不应出现在这里）';
  const htmlPre = document.createElement('pre');
  htmlPre.className = 'dp-pre';
  htmlBox.append(htmlLabel, htmlPre);

  columns.append(editorBox, htmlBox);
  frame.append(hint, columns);

  const editor = new Editor({
    element: { mount: editorBox },
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  function emitSnapshot(): void {
    // 装饰计数按同类扫描逻辑重新统计：inline 与 widget 每次命中各一个，node 按块去重
    const term = editor.storage.searchHighlight.term;
    const hits = findMatches(editor.state.doc, term);
    const blocks = new Set<number>();
    for (const { from } of hits) {
      blocks.add(editor.state.doc.resolve(from).before(1));
    }

    emit({
      term: term.trim() || '（空）',
      counts: `inline ${hits.length} · widget ${hits.length} · node ${blocks.size}`,
      htmlTrace: editor.getHTML().includes('dp-match') ? '有（异常）' : '无',
    });
    htmlPre.textContent = editor.getHTML();
  }

  // 每次事务（改词重建、打字映射、选区移动）后刷新读数与 HTML 输出
  editor.on('transaction', emitSnapshot);
  emitSnapshot();

  return {
    update(args) {
      // 外部状态先写回 storage，再用命令重建该扩展的装饰
      editor.storage.searchHighlight.term = args.term;
      editor.commands.updateDecorations('searchHighlight');
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
