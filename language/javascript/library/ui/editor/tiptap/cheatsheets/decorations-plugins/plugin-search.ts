/**
 * 范例介绍：同一个搜索高亮，用 addProseMirrorPlugins() 手写 ProseMirror 插件实现。
 * 前置状态：编辑器经 addProseMirrorPlugins 挂上一个原生 Plugin——PluginKey 命名、
 *   state.init/apply 维护插件状态、props.decorations 把 DecorationSet 交给视图。
 * 操作：改「搜索词」经 tr.setMeta 进入插件状态并重建装饰；在编辑器里打字，
 *   观察 apply 中的 DecorationSet.map 把旧装饰映射到新位置。
 * 预期结果：命中文字出现与 addDecorations 版一致的 inline 高亮；读数展示插件状态
 *   里的搜索词与 DecorationSet 装饰数的变化。
 * 阅读主线：setMeta（外部输入）→ apply 分支（重建或映射）→ props.decorations（交给视图）。
 */
import { Editor, Extension } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface PluginSearchArgs {
  term: string;
}

export interface PluginSearchSnapshot {
  term: string;
  decorationCount: string;
}

export interface PluginSearchInstance {
  update(args: PluginSearchArgs): void;
  dispose(): void;
}

/** 插件状态可以是任意结构：这里同时携带搜索词与它派生出的 DecorationSet。 */
interface SearchPluginState {
  term: string;
  set: DecorationSet;
}

/** 给插件一把"钥匙"：不持有插件实例，也能从任意 state 里取回它的状态。 */
export const searchPluginKey = new PluginKey<SearchPluginState>('dpSearchHighlight');

/** 扫描文档构建 DecorationSet；注意 DecorationSet.create 会消费 decorations 数组。 */
function buildDecorationSet(doc: ProseMirrorNode, term: string): DecorationSet {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return DecorationSet.empty;
  }
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }
    const haystack = node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      // PM 层工厂是小写 inline，与 Tiptap 层的 Decoration.Inline 是两个 API
      decorations.push(Decoration.inline(pos + index, pos + index + needle.length, { class: 'dp-match' }));
      index = haystack.indexOf(needle, index + needle.length);
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const SearchPlugin = Extension.create({
  name: 'searchPlugin',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,
        state: {
          // 初始插件状态：没有搜索词，装饰为空集
          init: () => ({ term: '', set: DecorationSet.empty }),
          // 每个事务都流经这里，纯函数地推进插件状态
          apply: (tr, previous) => {
            const meta = tr.getMeta(searchPluginKey) as { term?: string } | undefined;
            // 分支一：事务带着本插件的 meta——外部输入到达，按新词全量重建
            if (meta && typeof meta.term === 'string') {
              return { term: meta.term, set: buildDecorationSet(tr.doc, meta.term) };
            }
            // 分支二：普通事务——文档变了就把旧装饰映射到新位置；仅选区变化则原样保留
            if (tr.docChanged) {
              return { term: previous.term, set: previous.set.map(tr.mapping, tr.doc) };
            }
            return previous;
          },
        },
        // 装饰的唯一出口：视图每次重绘都来这个 prop 取 DecorationSet
        props: {
          decorations: (state) => searchPluginKey.getState(state)?.set ?? DecorationSet.empty,
        },
      }),
    ];
  },
});

/** 外部输入入口：把新搜索词经 setMeta 搭在事务上写进插件（命令与插件的通信通道）。 */
export function setSearchTerm(editor: Editor, term: string): void {
  const tr = editor.state.tr.setMeta(searchPluginKey, { term });
  editor.view.dispatch(tr);
}

const INITIAL_CONTENT = `
<p>装饰器改变文档的呈现，而不改变文档本身。</p>
<p>在这一段里再放一个装饰词，观察两种更新路径的差异。</p>
`;

export function createPluginSearchDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PluginSearchSnapshot) => void,
): PluginSearchInstance {
  const frame = document.createElement('div');
  frame.className = 'dp-lab';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'dp-hint';
  hint.textContent =
    '这个高亮来自手写插件：改「搜索词」走 setMeta 重建，打字走 DecorationSet.map 映射。';

  const editorBox = document.createElement('div');
  editorBox.className = 'dp-editor';
  frame.append(hint, editorBox);

  const editor = new Editor({
    element: { mount: editorBox },
    extensions: [Document, Paragraph, Text, SearchPlugin],
    content: INITIAL_CONTENT,
  });

  function emitSnapshot(): void {
    // 用 PluginKey 直接读插件状态：搜索词与它派生的 DecorationSet
    const pluginState = searchPluginKey.getState(editor.state);
    emit({
      term: pluginState?.term.trim() || '（空）',
      decorationCount: String(pluginState?.set.find().length ?? 0),
    });
  }

  editor.on('transaction', emitSnapshot);
  emitSnapshot();

  return {
    update(args) {
      setSearchTerm(editor, args.term);
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
