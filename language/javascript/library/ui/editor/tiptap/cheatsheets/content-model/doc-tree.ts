/**
 * 范例介绍：真实编辑器 + 实时文档树——看清打字、加粗、变标题时树如何生长。
 * 前置状态：schema 装了 Document、Paragraph、Text、Heading、Bold；初始内容是一个标题加一个段落。
 * 操作：在左侧编辑区打字、回车；选中文字点「加粗」；点「一级标题」切换段落与标题；
 *   点「setContent 重置」整体替换文档。
 * 预期结果：右侧文档树实时重绘——打字只改 text 节点；加粗往 text 的 marks 数组加一项，树不加深；
 *   回车在 doc 下新增 paragraph；变标题把 paragraph 换成 heading，level 存进 attrs。
 * 阅读主线：树上变化的位置与「文档树」小节的每个结论一一对应。
 */
import { Editor, type JSONContent } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export interface DocTreeSnapshot {
  docChildren: number;
  depth: number;
  markTypes: string;
}

export interface DocTreeInstance {
  update(): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text, Heading, Bold];

const INITIAL_CONTENT = '<h3>会议纪要</h3><p>选中一段文字，再点上方按钮。</p>';

/** 一行节点描述：类型 + 文本 + 标记 + 属性，与 JSON 字段一一对应。 */
function describeNode(node: JSONContent): string {
  const parts: string[] = [node.type ?? '?'];
  if (typeof node.text === 'string') {
    parts.push(JSON.stringify(node.text));
  }
  if (node.marks?.length) {
    parts.push(`[${node.marks.map((mark) => mark.type).join(' + ')}]`);
  }
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    parts.push(JSON.stringify(node.attrs));
  }
  return parts.join(' ');
}

/** 把文档树画成缩进枝干：doc → 块级节点 → 行内内容。 */
function renderTree(node: JSONContent): string {
  const lines: string[] = [describeNode(node)];

  function walk(children: JSONContent[], prefix: string): void {
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${describeNode(child)}`);
      walk(child.content ?? [], `${prefix}${isLast ? '   ' : '│  '}`);
    });
  }

  walk(node.content ?? [], '');
  return lines.join('\n');
}

/** 统计读数：doc 子节点数、树的最深层数、出现过的标记类型。 */
function collectStats(
  node: JSONContent,
  depth: number,
  marks: Set<string>,
): number {
  node.marks?.forEach((mark) => marks.add(mark.type));
  let maxDepth = depth;
  (node.content ?? []).forEach((child) => {
    maxDepth = Math.max(maxDepth, collectStats(child, depth + 1, marks));
  });
  return maxDepth;
}

export function createDocTreeDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DocTreeSnapshot) => void,
): DocTreeInstance {
  const frame = document.createElement('div');
  frame.className = 'cm-frame cm-columns cm-frame--captioned';
  canvas.replaceWith(frame);

  // 左列：真实可输入的编辑器
  const editorColumn = document.createElement('div');
  editorColumn.className = 'cm-column';
  const toolbar = document.createElement('div');
  toolbar.className = 'cm-toolbar';
  const host = document.createElement('div');
  host.className = 'cm-editor cm-editor--edit';
  editorColumn.append(toolbar, host);

  // 右列：由 getJSON() 实时画出的文档树
  const treeColumn = document.createElement('div');
  treeColumn.className = 'cm-column';
  const treeLabel = document.createElement('p');
  treeLabel.className = 'cm-box-label';
  treeLabel.textContent = 'editor.getJSON() 就是这棵树';
  const treePre = document.createElement('pre');
  treePre.className = 'cm-pre';
  treeColumn.append(treeLabel, treePre);

  frame.append(editorColumn, treeColumn);

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  function snapshot(): DocTreeSnapshot {
    const json = editor.getJSON();
    const marks = new Set<string>();
    const depth = collectStats(json, 0, marks);
    return {
      docChildren: json.content?.length ?? 0,
      depth,
      markTypes: marks.size > 0 ? [...marks].join('、') : '无',
    };
  }

  // 每次文档变化都重画树：编辑器的 update 事件挂着这条主线
  function redraw(): void {
    treePre.textContent = renderTree(editor.getJSON());
    emit(snapshot());
  }
  editor.on('update', redraw);
  redraw();

  function addToolbarButton(label: string, title: string, run: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-btn';
    button.textContent = label;
    button.title = title;
    // mousedown 会抢走编辑器选区：阻止默认行为，点按钮时选区原地保留
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => run());
    toolbar.append(button);
  }

  addToolbarButton('加粗', '选中文本后切换 bold 标记', () => {
    editor.chain().focus().toggleBold().run();
  });
  addToolbarButton('一级标题', '在段落与一级标题之间切换', () => {
    editor.chain().focus().toggleHeading({ level: 1 }).run();
  });
  addToolbarButton('setContent 重置', '用 setContent 命令整体替换文档', () => {
    editor.chain().focus().setContent(INITIAL_CONTENT).run();
  });

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接操作编辑器，文档树随之更新
    },
    dispose() {
      editor.destroy();
      frame.remove();
    },
  };
}
