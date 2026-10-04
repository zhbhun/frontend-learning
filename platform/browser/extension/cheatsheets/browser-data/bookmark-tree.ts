/**
 * 范例介绍：模拟 chrome.bookmarks 的树结构与「parentId + index」定位规则，
 * 以及 create / move / update / removeTree 触发的事件。
 * 前置状态：一棵与浏览器结构一致的模拟书签树——根节点 "0"，书签栏
 * （folderType: 'bookmarks-bar'）与其他书签（'other'）两个内置文件夹，
 * 各带若干子节点。
 * 主要操作：选父文件夹与 index、切换节点类型后点「create」；再依次试试
 * 「move 末尾书签到所选位置」「update 标题」「removeTree 首个文件夹」。
 * 预期结果：新节点落在所选父文件夹的指定 index，同父后续兄弟 index 后移；
 * 日志按发生顺序记录 API 调用与 onCreated / onMoved / onChanged /
 * onRemoved，回调参数名与 API 参考一致；removeTree 对文件夹只触发一次
 * onRemoved，子节点不单独触发。
 * 阅读主线：上半部分是模拟树（缩进表示父子，行尾标注 id 与 index，
 * 高亮行是最近一次写操作涉及的节点），底部是调用与事件日志。
 */

export type ParentFolder = 'bar' | 'other';

export type NodeType = 'bookmark' | 'folder';

export interface BookmarkTreeOptions {
  parent: ParentFolder;
  index: number;
  nodeType: NodeType;
}

export interface BookmarkTreeSnapshot {
  parentLabel: string;
  indexLabel: string;
  typeLabel: string;
  lastCreateId: string;
  eventCounts: string;
}

export interface BookmarkTreeInstance {
  element: HTMLElement;
  update(options: BookmarkTreeOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

interface SimNode {
  id: string;
  title: string;
  url?: string;
  folderType?: string;
  children?: SimNode[];
}

function bookmark(id: string, title: string, url: string): SimNode {
  return { id, title, url };
}

function folder(
  id: string,
  title: string,
  folderType: string,
  children: SimNode[],
): SimNode {
  return { id, title, folderType, children };
}

// 初始树：与浏览器里 getTree() 的形状一致——数组里一个根节点，children 递归
const INITIAL_TREE: SimNode = folder('0', '', 'root', [
  folder('1', '书签栏', 'bookmarks-bar', [
    bookmark(
      '11',
      '扩展开发文档',
      'https://developer.chrome.com/docs/extensions',
    ),
    folder('12', '开发收藏', '', [
      bookmark('121', 'Storybook', 'https://storybook.js.org'),
      bookmark('122', 'Vite', 'https://vite.dev'),
    ]),
    bookmark('13', '设计参考', 'https://refactoringui.com'),
  ]),
  folder('2', '其他书签', 'other', [
    folder('21', '待整理', '', [
      bookmark('211', '稍后读：扩展架构笔记', 'https://example.com/arch'),
      bookmark('212', '会议纪要模板', 'https://example.com/minutes'),
    ]),
    bookmark('22', '临时下载', 'https://example.com/tmp'),
  ]),
]);

const ROOT = INITIAL_TREE;
const PARENT_ID: Record<ParentFolder, string> = { bar: '1', other: '2' };

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .bt-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'bookmark-tree-style';

const STYLE = `
.cs-stage.bt-stage {
  aspect-ratio: auto;
  min-height: 520px;
  padding: 38px 14px 118px;
  background: #f8fafc;
}
.bt-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.bt-action {
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #172033;
  font-size: 12px;
  cursor: pointer;
}
.bt-action:hover { border-color: #4f7cff; color: #3b5bdb; }
.bt-action:disabled {
  border-color: #e2e8f0;
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
.bt-mode {
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}
.bt-mode b { color: #3b5bdb; }
.bt-tree {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
}
.bt-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 12px;
  line-height: 1.7;
}
.bt-row--hit { background: #eef4ff; }
.bt-badge {
  flex: none;
  padding: 0 6px;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  color: #64748b;
  font-size: 10px;
}
.bt-badge--folder { border-color: #bfdbfe; color: #2563eb; }
.bt-title { font-weight: 600; }
.bt-url {
  color: #64748b;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bt-meta {
  margin-left: auto;
  color: #94a3b8;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
}
.bt-log {
  height: 148px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 11px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-y: auto;
}
.bt-log-line--call { color: #93c5fd; }
.bt-log-line--result { color: #86efac; }
.bt-log-line--event { color: #fcd34d; }
.bt-log-line--note { color: #cbd5e1; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = el('style', undefined, STYLE);
  style.id = STYLE_ID;
  document.head.append(style);
}

function parentOf(node: SimNode, id: string): SimNode | undefined {
  if (!node.children) {
    return undefined;
  }
  for (const child of node.children) {
    if (child.id === id) {
      return node;
    }
    const found = parentOf(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findNode(root: SimNode, id: string): SimNode | undefined {
  if (root.id === id) {
    return root;
  }
  if (!root.children) {
    return undefined;
  }
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function createBookmarkTree(): BookmarkTreeInstance {
  ensureStyles();
  const root = el('div', 'cs-stage bt-stage');

  const panel = el('div', 'bt-panel');
  const createButton = el('button', 'bt-action', 'create');
  createButton.type = 'button';
  const moveButton = el('button', 'bt-action', 'move 末尾书签到所选位置');
  moveButton.type = 'button';
  const updateButton = el('button', 'bt-action', 'update 标题');
  updateButton.type = 'button';
  const removeButton = el('button', 'bt-action', 'removeTree 首个文件夹');
  removeButton.type = 'button';
  panel.append(createButton, moveButton, updateButton, removeButton);

  const mode = el('div', 'bt-mode');
  const treeTitle = el(
    'div',
    'bt-mode',
    'getTree() · 书签树（行尾为 id 与 index）',
  );
  const tree = el('div', 'bt-tree');
  const logTitle = el('div', 'bt-mode', '调用与事件日志');
  const log = el('div', 'bt-log');

  root.append(panel, mode, treeTitle, tree, logTitle, log);

  // —— 模拟后端：写操作与事件的形状对齐 chrome.bookmarks API 参考 ——

  let options: BookmarkTreeOptions = {
    parent: 'bar',
    index: 0,
    nodeType: 'bookmark',
  };
  let idSeq = 100;
  let lastCreateId = '—';
  let hitId: string | undefined;
  const eventCounts = { onCreated: 0, onChanged: 0, onMoved: 0, onRemoved: 0 };

  function logLine(kind: 'call' | 'result' | 'event' | 'note', text: string) {
    log.append(el('div', `bt-log-line bt-log-line--${kind}`, text));
    log.scrollTop = log.scrollHeight;
  }

  function dispatchEvent(name: keyof typeof eventCounts, args: string[]) {
    eventCounts[name] += 1;
    logLine('event', `${name}(${args.join(', ')})`);
  }

  function clampIndex(children: SimNode[], requested: number): number {
    return Math.max(0, Math.min(requested, children.length));
  }

  function create() {
    const parent = findNode(ROOT, PARENT_ID[options.parent]);
    if (!parent?.children) {
      logLine('note', '所选父文件夹不存在');
      return;
    }
    const index = clampIndex(parent.children, options.index);
    const isFolder = options.nodeType === 'folder';
    const id = String(++idSeq);
    const node: SimNode = isFolder
      ? { id, title: '新文件夹', folderType: '', children: [] }
      : { id, title: '新书签', url: 'https://example.com/new' };
    parent.children.splice(index, 0, node);
    hitId = id;
    lastCreateId = id;
    logLine(
      'call',
      `chrome.bookmarks.create({ parentId: "${parent.id}", index: ${index}${
        isFolder ? '' : `, url: "${node.url}"`
      }, title: "${node.title}" })`,
    );
    logLine('result', `→ BookmarkTreeNode { id: "${id}", index: ${index} }`);
    dispatchEvent('onCreated', [`"${id}"`, 'bookmark']);
    renderTree();
  }

  function move() {
    const other = findNode(ROOT, '2');
    const moved = other?.children?.at(-1);
    if (!moved || !other?.children) {
      logLine('note', '「其他书签」下没有可移动的节点，先 create 一个');
      return;
    }
    const parent = findNode(ROOT, PARENT_ID[options.parent]);
    if (!parent?.children) {
      logLine('note', '所选父文件夹不存在');
      return;
    }
    const oldIndex = other.children.indexOf(moved);
    other.children.splice(oldIndex, 1);
    const index = clampIndex(parent.children, options.index);
    parent.children.splice(index, 0, moved);
    hitId = moved.id;
    logLine(
      'call',
      `chrome.bookmarks.move("${moved.id}", { parentId: "${parent.id}", index: ${index} })`,
    );
    dispatchEvent('onMoved', [
      `"${moved.id}"`,
      `{ index: ${index}, oldIndex: ${oldIndex}, oldParentId: "${other.id}", parentId: "${parent.id}" }`,
    ]);
    renderTree();
  }

  function update() {
    const parent = findNode(ROOT, PARENT_ID[options.parent]);
    const candidate =
      (lastCreateId !== '—' ? findNode(ROOT, lastCreateId) : undefined) ??
      parent?.children?.[0];
    if (!candidate) {
      logLine('note', '没有可更新的节点：先 create 一个');
      return;
    }
    const next = '标题已更新';
    logLine('call', `chrome.bookmarks.update("${candidate.id}", { title: "${next}" })`);
    candidate.title = next;
    hitId = candidate.id;
    logLine('note', 'API 参考：update 只接受 title 与 url 两个字段');
    dispatchEvent('onChanged', [`"${candidate.id}"`, `{ title: "${next}" }`]);
    renderTree();
  }

  function removeTree() {
    const parent = findNode(ROOT, PARENT_ID[options.parent]);
    const target = parent?.children?.find((child) => child.children);
    if (!target || !parent?.children) {
      logLine('note', '所选父文件夹下没有文件夹，removeTree 没有目标');
      return;
    }
    const index = parent.children.indexOf(target);
    parent.children.splice(index, 1);
    hitId = undefined;
    logLine('call', `chrome.bookmarks.removeTree("${target.id}")`);
    logLine(
      'note',
      `递归删除 "${target.title}" 共 ${
        JSON.stringify(target).match(/"id"/g)?.length ?? 1
      } 个节点，但 onRemoved 只响一次`,
    );
    dispatchEvent('onRemoved', [
      `"${target.id}"`,
      `{ index: ${index}, parentId: "${parent.id}", node }`,
    ]);
    renderTree();
  }

  function renderTree() {
    tree.replaceChildren();

    const walk = (node: SimNode, depth: number) => {
      const row = el('div', `bt-row${node.id === hitId ? ' bt-row--hit' : ''}`);
      row.style.paddingLeft = `${depth * 18}px`;

      const isFolder = Boolean(node.children);
      const badge = el('span', `bt-badge${isFolder ? ' bt-badge--folder' : ''}`);
      badge.textContent = isFolder ? '文件夹' : '书签';
      row.append(badge);

      row.append(el('span', 'bt-title', node.title || '根节点'));

      if (node.url) {
        row.append(el('span', 'bt-url', node.url));
      }

      // id 与 index 是节点的定位坐标：index 是节点在父文件夹中的 0 基位置，
      // 写操作后重新计算
      row.append(el('span', 'bt-meta', `id ${node.id}`));
      const parent = parentOf(ROOT, node.id);
      row.append(
        el(
          'span',
          'bt-meta',
          parent?.children
            ? `index ${parent.children.indexOf(node)}`
            : 'parentId —',
        ),
      );

      tree.append(row);
      node.children?.forEach((child) => walk(child, depth + 1));
    };

    ROOT.children?.forEach((child) => walk(child, 0));
    renderMode();
    renderButtons();
  }

  function renderMode() {
    mode.replaceChildren(
      el('span', undefined, '当前定位：'),
      el('b', undefined, `parentId "${PARENT_ID[options.parent]}"`),
      el('span', undefined, ' · '),
      el('b', undefined, `index ${options.index}`),
      el('span', undefined, ' · '),
      el('b', undefined, options.nodeType === 'folder' ? '文件夹（无 url）' : '书签（带 url）'),
    );
  }

  function renderButtons() {
    const parent = findNode(ROOT, PARENT_ID[options.parent]);
    const hasFolderChild = Boolean(parent?.children?.some((child) => child.children));
    removeButton.disabled = !hasFolderChild;
    const hasMovable = Boolean(findNode(ROOT, '2')?.children?.length);
    moveButton.disabled = !hasMovable;
  }

  createButton.addEventListener('click', create);
  moveButton.addEventListener('click', move);
  updateButton.addEventListener('click', update);
  removeButton.addEventListener('click', removeTree);

  logLine(
    'note',
    '提示：书签栏与其他书签是两个内置文件夹，写操作的目标由上面的定位参数决定',
  );

  renderTree();

  return {
    element: root,
    update(next: BookmarkTreeOptions) {
      options = next;
      renderTree();
    },
    snapshot(): Array<[string, string]> {
      return [
        ['parentId', `"${PARENT_ID[options.parent]}"`],
        ['index', String(options.index)],
        ['节点类型', options.nodeType === 'folder' ? '文件夹（无 url）' : '书签（带 url）'],
        ['最近 create 返回', lastCreateId],
        [
          '事件计数',
          `onCreated ${eventCounts.onCreated} · onMoved ${eventCounts.onMoved} · onChanged ${eventCounts.onChanged} · onRemoved ${eventCounts.onRemoved}`,
        ],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
