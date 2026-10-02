/**
 * 范例介绍：读写选区的完整闭环——命令写入选区，读数面板实时显示 state.selection。
 * 前置状态：schema 装了 Document、Paragraph、Text、Heading、Image；初始内容为
 *   标题 + 段落 + 图片 + 段落（JSON 输入，data: URI 的图片不走 HTML 解析）。
 * 操作：切换「选区命令」并调整 from/to；也可以直接在编辑器里拖选文字、点图片。
 * 预期结果：左下读数同步显示选区类型、from/to、anchor/head、empty、isFocused；
 *   右侧「位置地图」列出每个顶层节点的位置区间，是 from/to 数字的参照。
 * 阅读主线：同一份读数如何印证「读模型」，以及三种写入命令的差别。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Image } from '@tiptap/extension-image';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { AllSelection, NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Selection } from '@tiptap/pm/state';
// PMNode 指的是 ProseMirror 文档节点，类型定义在 @tiptap/pm/model 而不是 pm/state
import type { Node as PMNode } from '@tiptap/pm/model';

export type SelectionCommand = 'cursor' | 'range' | 'node' | 'all';

export interface SelectionLabArgs {
  command: SelectionCommand;
  from: number;
  to: number;
}

export interface SelectionLabSnapshot {
  typeLabel: string;
  fromTo: string;
  anchor: number;
  head: number;
  empty: string;
  focused: string;
}

export interface SelectionLabInstance {
  update(args: SelectionLabArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading, Image];

// 内联 SVG 转成 data: URI，实例不依赖外部网络
const IMG_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64">' +
      '<rect width="96" height="64" rx="6" fill="#cbd5e1"/>' +
      '<circle cx="30" cy="32" r="14" fill="#4f7cff" opacity="0.7"/>' +
      '<rect x="52" y="18" width="30" height="28" rx="4" fill="#172033" opacity="0.65"/>' +
      '</svg>',
  );

// 初始内容用 JSON 表达：heading(0–7) + 段落(7–27) + 图片(27–28) + 段落(28–46)
const INITIAL_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '选区与焦点' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '拖选这段文字，或用左侧控件写入选区。' }],
    },
    { type: 'image', attrs: { src: IMG_SRC, alt: '示例图片' } },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '点击上面图片会直接产生节点选区。' }],
    },
  ],
};

/** 运行时判断选区类型：三个类都来自 @tiptap/pm/state。 */
function selectionTypeLabel(selection: Selection): string {
  if (selection instanceof AllSelection) {
    return 'AllSelection';
  }
  if (selection instanceof NodeSelection) {
    return `NodeSelection（${selection.node.type.name}）`;
  }
  if (selection instanceof TextSelection) {
    return selection.empty ? 'TextSelection 光标' : 'TextSelection';
  }
  return 'Selection';
}

/** 遍历 doc 顶层子节点，找出图片的位置（即节点开头的文档位置）。 */
function findImagePos(doc: PMNode): number | null {
  let imagePos: number | null = null;
  doc.forEach((child, offset) => {
    if (child.type.name === 'image') {
      imagePos = offset;
    }
  });
  return imagePos;
}

export function createSelectionLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SelectionLabSnapshot) => void,
): SelectionLabInstance {
  const frame = document.createElement('div');
  frame.className = 'sel-frame sel-frame--tall';
  canvas.replaceWith(frame);

  const columns = document.createElement('div');
  columns.className = 'sel-columns';

  // 左列：真实可输入的编辑器
  const editorColumn = document.createElement('div');
  editorColumn.className = 'sel-column';
  const editorLabel = document.createElement('p');
  editorLabel.className = 'sel-box-label';
  editorLabel.textContent = '编辑器（可拖选、点图片）';
  const host = document.createElement('div');
  host.className = 'sel-editor';
  editorColumn.append(editorLabel, host);

  // 右列：位置地图——每个顶层节点的 from – to，作为命令数字的参照
  const mapColumn = document.createElement('div');
  mapColumn.className = 'sel-column';
  const mapLabel = document.createElement('p');
  mapLabel.className = 'sel-box-label';
  mapLabel.textContent = '位置地图（节点 from – to）';
  const mapPre = document.createElement('pre');
  mapPre.className = 'sel-map';
  mapColumn.append(mapLabel, mapPre);

  columns.append(editorColumn, mapColumn);
  frame.append(columns);

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  function renderMap(): void {
    const lines = [`doc 0 – ${editor.state.doc.content.size}`];
    editor.state.doc.forEach((child, offset) => {
      lines.push(`${child.type.name} ${offset} – ${offset + child.nodeSize}`);
    });
    mapPre.textContent = lines.join('\n');
  }

  function snapshot(): SelectionLabSnapshot {
    const selection = editor.state.selection;
    return {
      typeLabel: selectionTypeLabel(selection),
      fromTo: `${selection.from} – ${selection.to}`,
      anchor: selection.anchor,
      head: selection.head,
      empty: selection.empty ? '是（光标）' : '否',
      focused: editor.isFocused ? '是' : '否',
    };
  }

  // 任何事务（含只改选区的）都刷新读数与位置地图
  editor.on('transaction', () => {
    renderMap();
    emit(snapshot());
  });
  renderMap();
  emit(snapshot());

  /** 把 Controls 的选择翻译成对应命令。node / all 忽略 from/to。 */
  function applyCommand(args: SelectionLabArgs): void {
    switch (args.command) {
      case 'cursor':
        editor.commands.setTextSelection(args.from);
        break;
      case 'range':
        editor.commands.setTextSelection({ from: args.from, to: args.to });
        break;
      case 'node': {
        // 位置必须指向可选节点的开头：先查出图片位置，不手数数字
        const pos = findImagePos(editor.state.doc);
        if (pos !== null) {
          editor.commands.setNodeSelection(pos);
        }
        break;
      }
      case 'all':
        editor.commands.selectAll();
        break;
    }
  }

  return {
    update(args) {
      applyCommand(args);
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
