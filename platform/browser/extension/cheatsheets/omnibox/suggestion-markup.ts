/**
 * 范例介绍：一条地址栏建议由 description（下拉展示层）与 content（回传层）组成，
 * description 支持 <match> <url> <dim> 三种 XML 风格标记，且可以嵌套。
 * 前置状态：这些字符串来自 onInputChanged 回调里 suggest([...]) 传出的
 * SuggestResult，以及 onInputStarted 里 setDefaultSuggestion 设置的默认建议。
 * 主要操作：切换「示例 description」，下拉与原始字符串同步重绘。
 * 预期结果：match 加粗、url 链接色、dim 灰化；未转义的 < 让标记解析错位，
 * 用 escapeXml 转义五个预定义实体后按字面文本显示。
 * 阅读主线：下拉第一行是 setDefaultSuggestion 的默认建议（没有 content），
 * 第二行是当前示例的 SuggestResult；原始字符串框展示进入 Chrome 前的文本。
 */
export type SuggestionExampleKey =
  | 'plain'
  | 'match'
  | 'url-dim'
  | 'nested'
  | 'unescaped'
  | 'escaped';

export interface SuggestionMarkupInstance {
  element: HTMLElement;
  update(key: SuggestionExampleKey): void;
  dispose(): void;
}

interface ExampleCase {
  description: string;
  note: string;
  warn?: boolean;
}

// 只演示五个预定义实体的转义与三个标记标签的渲染，不含其他 XML 能力
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

// 共享文档样式（assets/story-canvas.css）只提供 .cs-stage 外壳，
// 本课两个范例的 .ob-* 样式随范例文件注入，不修改共享基础设施。
const STYLE_ID = 'omnibox-demo-style';

const STYLE = `
.cs-stage.ob-stage {
  display: flex;
  flex-direction: column;
  gap: 10px;
  aspect-ratio: auto;
  min-height: 440px;
  padding: 38px 16px 14px;
}
.cs-stage.ob-stage.ob-stage--markup {
  min-height: 300px;
}
.ob-bar { display: flex; align-items: center; gap: 10px; }
.ob-input {
  flex: 1;
  min-width: 0;
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #172033;
  font: 14px/1.4 ui-sans-serif, system-ui, sans-serif;
  outline: none;
}
.ob-input:focus { border-color: #4f7cff; box-shadow: 0 0 0 3px rgb(79 124 255 / 18%); }
.ob-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3b5bdb;
  font-size: 12px;
  white-space: nowrap;
}
.ob-dropdown {
  overflow: hidden;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
}
.ob-dropdown > * + * { border-top: 1px solid #eef2f7; }
.ob-rows .ob-row + .ob-row { border-top: 1px solid #eef2f7; }
.ob-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: #172033;
  font: 13px/1.5 ui-sans-serif, system-ui, sans-serif;
}
.ob-row--default { background: #f8fafc; color: #475569; cursor: default; }
.ob-row--suggestion { cursor: pointer; }
.ob-row--suggestion:hover, .ob-row--active { background: #eef2ff; }
.ob-row-desc { flex: 1 1 auto; min-width: 0; }
.ob-row-tag {
  flex: 1 0 100%;
  margin: 2px 0 0;
  color: #94a3b8;
  font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ob-remove {
  margin-left: auto;
  padding: 0 4px;
  border: none;
  background: none;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
}
.ob-remove:hover { color: #b91c1c; }
.ob-desc .ob-tag-match { font-weight: 700; color: #172033; }
.ob-desc .ob-tag-url { color: #1a56db; }
.ob-desc .ob-tag-dim { color: #94a3b8; }
.ob-outcome {
  margin: 0;
  min-height: 18px;
  color: #15803d;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ob-log {
  flex: 1;
  overflow-y: auto;
  min-height: 90px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgb(255 255 255 / 88%);
  color: #2c3a34;
  font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ob-log-line { white-space: pre-wrap; }
.ob-hint { margin: 0; color: #64748b; font-size: 12px; }
.ob-raw {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #334155;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
.ob-note { margin: 0; color: #475569; font-size: 12px; line-height: 1.6; }
.ob-note--warn { color: #b91c1c; }
`;

export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

// 解码五个预定义实体；&amp; 放在最后，避免二次解码
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// 从 rest 里找到与 tag 配对的闭标签位置（计数嵌套）；找不到返回 -1
function findCloseIndex(rest: string, tag: string): number {
  const pattern = new RegExp(`<(/?)(${tag})>`, 'g');
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(rest)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      return match.index;
    }
  }
  return -1;
}

function appendText(target: HTMLElement, raw: string): void {
  if (!raw) {
    return;
  }
  target.append(document.createTextNode(decodeEntities(raw)));
}

// 把含 <match> / <url> / <dim> 标记的 description 渲染为 DOM；
// 其余 < 一律按字面文本处理——真实 Chrome 同样只识别这三个标签
function renderInto(target: HTMLElement, source: string): void {
  const pattern = /<(\/?)(match|url|dim)>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    appendText(target, source.slice(cursor, match.index));
    cursor = pattern.lastIndex;
    if (match[1]) {
      continue; // 闭标签由配对的递归消费，散落的闭标签忽略
    }
    const tag = match[2];
    const rest = source.slice(cursor);
    const closeIndex = findCloseIndex(rest, tag);
    const inner = closeIndex === -1 ? rest : rest.slice(0, closeIndex);
    const span = document.createElement('span');
    span.className = `ob-tag-${tag}`;
    target.append(span);
    renderInto(span, inner);
    cursor += closeIndex === -1 ? rest.length : closeIndex + `</${tag}>`.length;
    pattern.lastIndex = cursor;
  }
  appendText(target, source.slice(cursor));
}

export function renderDescription(source: string): HTMLElement {
  const root = document.createElement('span');
  root.className = 'ob-desc';
  renderInto(root, source);
  return root;
}

// 未转义的样子：用户输入里直接带标记，把建议的结构戳穿
const HOSTILE_INPUT = '</match><dim>已越权';

const EXAMPLES: Record<SuggestionExampleKey, ExampleCase> = {
  plain: {
    description: 'chrome.omnibox API 参考',
    note: '纯文本：没有任何标记时按原样显示。',
  },
  match: {
    description: 'chrome.<match>omnibox</match> API 参考',
    note: '<match> 加粗用户输入的命中片段，是唯一与输入联动的样式。',
  },
  'url-dim': {
    description: '<url>developer.chrome.com</url> <dim>关键词建议</dim>',
    note: '<url> 显示字面 URL（链接色），<dim> 放不重要的辅助文字。',
  },
  nested: {
    description:
      'chrome.omnibox <dim>API 参考 · <match>关键词建议</match></dim>',
    note: '标记可以嵌套，例如把 <match> 嵌进 <dim> 里做成灰化的命中片段。',
  },
  unescaped: {
    description: `<match>${HOSTILE_INPUT}</match> 文档命令`,
    note: '用户输入未转义：标记被输入内容截断，下拉显示错乱——拼接前必须转义。',
    warn: true,
  },
  escaped: {
    description: `<match>${escapeXml(HOSTILE_INPUT)}</match> 文档命令`,
    note: '同一段用户输入经 escapeXml 转义后，原样显示为字面文本，标记结构不受影响。',
  },
};

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

export function createSuggestionMarkup(): SuggestionMarkupInstance {
  ensureStyles();
  const root = el('div', 'cs-stage ob-stage ob-stage--markup');

  const captionLeft = el('p', 'cs-caption cs-caption--left', 'description 标记渲染（示意）');
  const captionRight = el(
    'p',
    'cs-caption cs-caption--right',
    'Chrome 只识别 match / url / dim',
  );

  const dropdown = el('div', 'ob-dropdown');
  const defaultRow = el('div', 'ob-row ob-row--default');
  defaultRow.append(renderDescription('<match>docs</match> 文档命令 <dim>回车发送原样输入</dim>'));
  const defaultTag = el('p', 'ob-row-tag', 'setDefaultSuggestion：只有 description，没有 content');
  defaultRow.append(defaultTag);

  const exampleRow = el('div', 'ob-row');
  const exampleDesc = el('div', 'ob-row-desc');
  const contentTag = el('p', 'ob-row-tag', 'content="messaging"：不回显，选中时原样回传扩展');
  exampleRow.append(exampleDesc, contentTag);

  dropdown.append(defaultRow, exampleRow);

  const rawBox = el('pre', 'ob-raw');
  const note = el('p', 'ob-note');

  root.append(captionLeft, captionRight, dropdown, rawBox, note);

  function update(key: SuggestionExampleKey): void {
    const example = EXAMPLES[key];
    exampleDesc.replaceChildren(renderDescription(example.description));
    rawBox.textContent = `suggest([{ content: "messaging", description: "${example.description}" }])`;
    note.textContent = example.note;
    note.classList.toggle('ob-note--warn', Boolean(example.warn));
  }

  return {
    element: root,
    update,
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
