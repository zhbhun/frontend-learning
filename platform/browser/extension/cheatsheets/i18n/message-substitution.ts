/**
 * 范例介绍：模拟 chrome.i18n.getMessage 对 messages.json 的读取与替换。
 * 输入 / 前置状态：「当前语言」参数模拟浏览器界面语言决定的已加载 messages.json
 * （真实环境由 _locales 解析链选出，见 locale-resolution.ts）；「消息名」对应
 * messages.json 的顶层键；「substitutions」对应 getMessage 的第二个参数；
 * 「escapeLt」对应 Chrome 79+ 的 options.escapeLt。
 * 主要操作：切换语言、消息、substitutions 与 escapeLt，观察返回字符串与绑定关系。
 * 预期结果：$name$ 占位符按 placeholders.content 替换——content 写 "$N" 时取
 * substitutions 第 N 位（数组缺位为空串），content 写死文本时不依赖参数；escapeLt
 * 只转义消息本身的 <，不处理占位符内容；消息大小写不敏感（本模拟演示小写键）。
 * 阅读主线：左栏是当前 messages.json 中该消息的定义，右栏上方是等价调用代码，
 * 中间是返回值，下方是 substitutions 与 placeholders 的绑定明细。
 */
export type LocaleCode = 'zh_CN' | 'en';

export type MessageName = 'greeting' | 'error' | 'invite' | 'site' | 'rich';

export type SubstitutionMode = 'none' | 'single' | 'array';

export interface MessageOptions {
  locale: LocaleCode;
  message: MessageName;
  substitutions: SubstitutionMode;
  escapeLt: boolean;
}

export interface MessageInstance {
  element: HTMLElement;
  update(options: MessageOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

interface PlaceholderDef {
  content: string;
  example?: string;
}

interface MessageEntry {
  message: string;
  description?: string;
  placeholders?: Record<string, PlaceholderDef>;
}

// 两份 messages.json 的等价内容，key 与 README 示例一致；真实扩展中这两种语言的
//  messages.json 由翻译分别提供
const MESSAGES: Record<LocaleCode, Record<MessageName, MessageEntry>> = {
  zh_CN: {
    greeting: { message: '欢迎回来' },
    error: {
      message: '出错了：$details$',
      description: '搜索失败时展示的错误行',
      placeholders: { details: { content: '$1', example: '网络请求失败。' } },
    },
    invite: {
      message: '$user$（$role$）邀请你一起整理收藏',
      placeholders: {
        user: { content: '$1', example: 'Cira' },
        role: { content: '$2', example: '管理员' },
      },
    },
    site: {
      message: '收藏站点：$domain$',
      placeholders: {
        domain: { content: 'Example.com', example: 'Example.com' },
      },
    },
    rich: { message: '注意：<b>斜体显示</b>' },
  },
  en: {
    greeting: { message: 'Welcome back' },
    error: {
      message: 'Error: $details$',
      description: 'Error line shown when a search fails',
      placeholders: { details: { content: '$1', example: 'Network request failed.' } },
    },
    invite: {
      message: '$user$ ($role$) invited you to organize bookmarks',
      placeholders: {
        user: { content: '$1', example: 'Cira' },
        role: { content: '$2', example: 'admin' },
      },
    },
    site: {
      message: 'Bookmarked site: $domain$',
      placeholders: {
        domain: { content: 'Example.com', example: 'Example.com' },
      },
    },
    rich: { message: 'Note: <b>italic</b>' },
  },
};

// substitutions 三种传法：不传、单值、数组；单值与 [值] 等价（都只给第一位）
const SUBSTITUTIONS: Record<SubstitutionMode, string[]> = {
  none: [],
  single: ['Cira'],
  array: ['Cira', 'Kathy'],
};

const STYLE_ID = 'message-substitution-style';

const STYLE = `
.cs-stage.ms-stage {
  aspect-ratio: auto;
  min-height: 520px;
  padding: 38px 14px 104px;
  background: #f8fafc;
}
.ms-code {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-x: auto;
  white-space: pre;
}
.ms-code b { color: #93c5fd; font-weight: 600; }
.ms-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 720px) {
  .ms-columns { grid-template-columns: 1fr; }
}
.ms-panel-title {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.ms-json {
  height: 210px;
  margin: 0;
  padding: 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font: 11.5px/1.75 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: auto;
  white-space: pre;
}
.ms-result {
  min-height: 46px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  line-height: 1.6;
}
.ms-result mark {
  border-radius: 3px;
  padding: 0 2px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}
.ms-result-flag {
  display: inline-block;
  margin-left: 6px;
  color: #64748b;
  font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ms-table {
  width: 100%;
  border-collapse: collapse;
  font: 11.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ms-table th,
.ms-table td {
  padding: 4px 6px;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  text-align: left;
}
.ms-table th { color: #64748b; font-weight: 700; }
.ms-table td.ms-empty { color: #b91c1c; }
.ms-table td.ms-inline { color: #1d4ed8; font-weight: 600; }
.ms-section { margin-top: 10px; }
.ms-note {
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}
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

// —— 模拟后端：按官方规则实现占位符解析 ——

// content 形如 "$1" 时取 substitutions 第 N 位，缺位为空串；否则视为写死文本
function resolveContent(content: string, values: string[]): string {
  const match = /^\$(\d)$/.exec(content);
  if (!match) {
    return content;
  }
  const index = Number(match[1]) - 1;
  return index < values.length ? values[index] : '';
}

interface Piece {
  text: string;
  substituted: boolean;
}

function composeResult(
  entry: MessageEntry,
  values: string[],
  escapeLt: boolean,
): { pieces: Piece[]; bindings: Array<[string, string, string]> } {
  // escapeLt 只作用于消息文本本身，先转义再插入占位符内容
  let template = escapeLt ? entry.message.replace(/</g, '&lt;') : entry.message;
  const bindings: Array<[string, string, string]> = [];
  const substituted: string[] = [];

  for (const [name, def] of Object.entries(entry.placeholders ?? {})) {
    const value = resolveContent(def.content, values);
    bindings.push([name, def.content, value]);
    // 占位符名大小写不敏感
    template = template.replace(
      new RegExp(`\\$${name}\\$`, 'gi'),
      () => {
        const sentinel = `\u0000${substituted.length}\u0000`;
        substituted.push(value);
        return sentinel;
      },
    );
  }

  const pieces: Piece[] = [];
  const parts = template.split(/\u0000(\d+)\u0000/);
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      pieces.push({ text: substituted[Number(part)], substituted: true });
    } else if (part !== '') {
      pieces.push({ text: part, substituted: false });
    }
  });
  return { pieces, bindings };
}

function jsonSnippet(locale: LocaleCode, message: MessageName): string {
  const entry = MESSAGES[locale][message];
  const lines: string[] = [];
  lines.push(`// _locales/${locale}/messages.json`);
  lines.push(`"${message}": {`);
  lines.push(`  "message": ${JSON.stringify(entry.message)},`);
  if (entry.description) {
    lines.push(`  "description": ${JSON.stringify(entry.description)},`);
  }
  if (entry.placeholders) {
    lines.push('  "placeholders": {');
    Object.entries(entry.placeholders).forEach(([name, def], index, all) => {
      const example = def.example
        ? `, "example": ${JSON.stringify(def.example)}`
        : '';
      const tail = index === all.length - 1 ? '' : ',';
      lines.push(
        `    "${name}": { "content": ${JSON.stringify(def.content)}${example} }${tail}`,
      );
    });
    lines.push('  }');
  }
  lines.push('}');
  return lines.join('\n');
}

function callSource(options: MessageOptions): string {
  const { message, substitutions, escapeLt } = options;
  const args: string[] = [`'${message}'`];
  if (substitutions === 'single') {
    args.push('"Cira"');
  } else if (substitutions === 'array') {
    args.push("['Cira', 'Kathy']");
  }
  if (escapeLt) {
    args.push('{ escapeLt: true }');
  }
  return `chrome.i18n.getMessage(${args.join(', ')})`;
}

export function createMessageSubstitution(): MessageInstance {
  ensureStyles();
  const root = el('div', 'cs-stage ms-stage');
  const title = el('div', 'ms-panel-title', 'getMessage 调用与返回');
  const code = el('div', 'ms-code');
  root.append(title, code);

  const columns = el('div', 'ms-columns');

  const left = el('div');
  const leftTitle = el('div', 'ms-panel-title', '当前已加载的 messages.json');
  const json = el('pre', 'ms-json');
  left.append(leftTitle, json);

  const right = el('div');
  const resultTitle = el('div', 'ms-panel-title', '返回值（按 textContent 原样显示）');
  const result = el('div', 'ms-result');
  right.append(resultTitle, result);

  columns.append(left, right);
  root.append(columns);

  const bindingSection = el('div', 'ms-section');
  const bindingTitle = el('div', 'ms-panel-title', 'placeholders 绑定明细');
  const bindingTable = el('table', 'ms-table');
  bindingSection.append(bindingTitle, bindingTable);
  root.append(bindingSection);

  const note = el(
    'div',
    'ms-note',
    '蓝色高亮是 substitutions 替换进正文的片段；「空串」表示数组没有给够该位。',
  );
  root.append(note);

  let options: MessageOptions = {
    locale: 'zh_CN',
    message: 'invite',
    substitutions: 'array',
    escapeLt: false,
  };

  function render(): void {
    const entry = MESSAGES[options.locale][options.message];
    const values = SUBSTITUTIONS[options.substitutions];
    const { pieces, bindings } = composeResult(entry, values, options.escapeLt);

    code.replaceChildren(
      document.createTextNode(`${callSource(options)} → `),
      el('b', undefined, pieces.map((p) => p.text).join('')),
    );

    json.textContent = jsonSnippet(options.locale, options.message);

    result.replaceChildren();
    pieces.forEach((piece) => {
      if (piece.substituted) {
        result.append(el('mark', undefined, piece.text));
      } else {
        result.append(document.createTextNode(piece.text));
      }
    });
    if (options.escapeLt) {
      result.append(
        el('span', 'ms-result-flag', '已按 escapeLt 转义消息中的 <'),
      );
    }

    bindingTable.replaceChildren();
    const head = el('tr');
    head.append(
      el('th', undefined, '占位符'),
      el('th', undefined, 'content'),
      el('th', undefined, '替换后的值'),
      el('th', undefined, '取值方式'),
    );
    bindingTable.append(head);
    if (bindings.length === 0) {
      const row = el('tr');
      const cell = el('td', undefined, '该消息没有 placeholders');
      cell.colSpan = 4;
      row.append(cell);
      bindingTable.append(row);
    }
    bindings.forEach(([name, content, value]) => {
      const row = el('tr');
      row.append(el('td', undefined, `$${name}$`), el('td', undefined, content));
      const valueCell = el(
        'td',
        value === '' && /^\$\d+$/.test(content) ? 'ms-empty' : undefined,
        value === '' ? '空串' : JSON.stringify(value),
      );
      row.append(valueCell);
      const mode =
        content === '$1' || /^\$[2-9]$/.test(content)
          ? '引用 substitutions 对应位'
          : '写死文本，不吃调用参数';
      row.append(el('td', /^\$\d+$/.test(content) ? undefined : 'ms-inline', mode));
      bindingTable.append(row);
    });
  }

  render();

  return {
    element: root,
    update(next: MessageOptions) {
      options = next;
      render();
    },
    snapshot(): Array<[string, string]> {
      const entry = MESSAGES[options.locale][options.message];
      const values = SUBSTITUTIONS[options.substitutions];
      const { pieces } = composeResult(entry, values, options.escapeLt);
      return [
        ['当前 locale', options.locale],
        ['消息名', options.message],
        ['getMessage 返回', pieces.map((p) => p.text).join('')],
        ['$1', values[0] ?? '空串'],
        ['$2', values[1] ?? '空串'],
      ];
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
