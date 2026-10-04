/**
 * 范例介绍：模拟地址栏关键词会话，演示 chrome.omnibox 的事件序列与参数。
 * 前置状态：演示 keyword 为 docs；页面里的输入框就是「地址栏」。
 * 主要操作：输入 docs（无反应）→ 按空格（进入会话）→ 继续输入过滤建议 →
 * ↑↓ 选择、回车确认、Esc 取消、点击建议右侧 × 删除。
 * 预期结果：onInputStarted 每次会话恰好触发一次；onInputChanged 的 text
 * 不含 keyword；选中建议时 onInputEntered 收到该建议的 content 与 disposition。
 * 阅读主线：地址栏下方是下拉（真实 Chrome 只显示 description），
 * 右侧事件日志与下拉按同一时间线追加；切换「disposition」只影响打开方式。
 */
import { ensureStyles, escapeXml, renderDescription } from './suggestion-markup';

export type OpenMode = 'currentTab' | 'newForegroundTab' | 'newBackgroundTab';

export interface OmniboxSessionInstance {
  element: HTMLElement;
  setOpenMode(mode: OpenMode): void;
  dispose(): void;
}

interface DocEntry {
  content: string;
  title: string;
  dim: string;
  url: string;
}

interface Suggestion {
  content: string;
  description: string;
  deletable: boolean;
}

const KEYWORD = 'docs';
const MAX_SUGGESTIONS = 5;

const DOCS: DocEntry[] = [
  {
    content: 'omnibox',
    title: 'chrome.omnibox API 参考',
    dim: '关键词建议',
    url: 'https://developer.chrome.com/docs/extensions/reference/api/omnibox',
  },
  {
    content: 'messaging',
    title: '消息通信',
    dim: 'sendMessage 与 Port',
    url: 'https://developer.chrome.com/docs/extensions/develop/concepts/messaging',
  },
  {
    content: 'storage',
    title: '存储',
    dim: 'local · sync · session',
    url: 'https://developer.chrome.com/docs/extensions/reference/api/storage',
  },
  {
    content: 'alarms',
    title: '定时任务',
    dim: '周期与一次性闹钟',
    url: 'https://developer.chrome.com/docs/extensions/reference/api/alarms',
  },
];

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

// 命中用户输入的片段包进 <match>，其余转义后按字面文本拼装
function buildDescription(entry: DocEntry, query: string): string {
  const index = entry.content.indexOf(query);
  const head =
    index >= 0
      ? `${escapeXml(entry.content.slice(0, index))}<match>${escapeXml(
          query,
        )}</match>${escapeXml(entry.content.slice(index + query.length))}`
      : escapeXml(entry.content);
  return `${head} · ${escapeXml(entry.title)} <dim>${escapeXml(entry.dim)}</dim>`;
}

function matchEntries(query: string): DocEntry[] {
  return DOCS.filter(
    (entry) => entry.content.includes(query) || entry.title.includes(query),
  );
}

function openAction(mode: OpenMode, url: string): string {
  if (mode === 'currentTab') {
    return `chrome.tabs.update({ url: "${url}" }) → 当前标签页跳转`;
  }
  const active = mode === 'newForegroundTab';
  return `chrome.tabs.create({ url: "${url}", active: ${active} }) → 新标签页（${
    active ? '前台' : '后台'
  }）打开`;
}

export function createOmniboxSession(): OmniboxSessionInstance {
  ensureStyles();
  const root = el('div', 'cs-stage ob-stage');

  const captionLeft = el('p', 'cs-caption cs-caption--left', '地址栏关键词会话（模拟）');
  const captionRight = el(
    'p',
    'cs-caption cs-caption--right',
    '事件名与参数名和 chrome.omnibox 一致',
  );

  const bar = el('div', 'ob-bar');
  const input = el('input', 'ob-input');
  input.type = 'text';
  input.placeholder = '搜索或输入网址——输入 docs，再按空格';
  input.spellcheck = false;
  const chip = el('span', 'ob-chip', `${KEYWORD} 会话中 · Chrome 此处显示灰度图标`);
  chip.hidden = true;
  bar.append(input, chip);

  const dropdown = el('div', 'ob-dropdown');
  dropdown.hidden = true;
  const defaultRow = el('div', 'ob-row ob-row--default');
  defaultRow.append(
    renderDescription(
      '<match>docs</match> 文档命令 <dim>回车发送原样输入</dim>',
    ),
  );
  const rowsBox = el('div', 'ob-rows');
  dropdown.append(defaultRow, rowsBox);

  const outcome = el('p', 'ob-outcome');

  const log = el('div', 'ob-log');
  const hint = el(
    'p',
    'ob-hint',
    '↑↓ 选择 · 回车确认 · Esc 取消 · × 删除可删除建议',
  );

  root.append(captionLeft, captionRight, bar, dropdown, outcome, log, hint);

  let openMode: OpenMode = 'currentTab';
  let inSession = false;
  let sessionClosed = false;
  let suggestions: Suggestion[] = [];
  let deleted = new Set<string>();
  let highlight = -1;

  function logLine(text: string): void {
    log.append(el('div', 'ob-log-line', text));
    log.scrollTop = log.scrollHeight;
  }

  function renderRows(): void {
    rowsBox.replaceChildren();
    suggestions.forEach((suggestion, index) => {
      const row = el('div', 'ob-row ob-row--suggestion');
      row.append(renderDescription(suggestion.description));
      if (suggestion.deletable) {
        const remove = el('button', 'ob-remove', '×');
        remove.type = 'button';
        remove.title = '删除这条建议（deletable: true）';
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          deleted.add(suggestion.content);
          logLine(`onDeleteSuggestion(text="${suggestion.content}")`);
          refreshSuggestions(input.value.slice(KEYWORD.length + 1));
        });
        row.append(remove);
      }
      row.classList.toggle('ob-row--active', index === highlight);
      row.addEventListener('click', () => accept(suggestion.content));
      rowsBox.append(row);
    });
  }

  function refreshSuggestions(query: string): void {
    suggestions = matchEntries(query)
      .filter((entry) => !deleted.has(entry.content))
      .slice(0, MAX_SUGGESTIONS)
      .map((entry) => ({
        content: entry.content,
        description: buildDescription(entry, query),
        deletable: true,
      }));
    highlight = -1;
    renderRows();
  }

  function endSession(): void {
    inSession = false;
    sessionClosed = true;
    dropdown.hidden = true;
    chip.hidden = true;
  }

  function accept(content: string): void {
    if (!inSession) {
      return;
    }
    const disposition = openMode;
    logLine(`onInputEntered(text="${content}", disposition="${disposition}")`);
    const entry = DOCS.find((item) => item.content === content);
    outcome.textContent = entry
      ? openAction(disposition, entry.url)
      : '原样输入（未匹配文档）：扩展自行决定如何处理';
    // 接受建议即结束会话：Chrome 随后执行跳转，不再发送 omnibox 事件
    endSession();
  }

  function acceptRaw(): void {
    const text = input.value.slice(KEYWORD.length + 1);
    logLine(`onInputEntered(text="${text}", disposition="${openMode}")`);
    outcome.textContent = `原样输入「${KEYWORD} ${text}」：扩展自行决定如何处理`;
    endSession();
  }

  input.addEventListener('input', () => {
    const prefixed = input.value.startsWith(`${KEYWORD} `);
    if (!prefixed) {
      // 离开「keyword + 空格」前缀后会话标记复位，再次输入可以重新开启
      sessionClosed = false;
    }
    const active = prefixed && !sessionClosed;
    if (active && !inSession) {
      inSession = true;
      logLine('onInputStarted()');
      logLine('setDefaultSuggestion({ description })');
    }
    if (!active && inSession) {
      inSession = false;
      logLine('onInputCancelled()');
    }
    inSession = active;
    if (!active) {
      dropdown.hidden = true;
      chip.hidden = true;
      return;
    }
    chip.hidden = false;
    dropdown.hidden = false;
    refreshSuggestions(input.value.slice(KEYWORD.length + 1));
  });

  input.addEventListener('keydown', (event) => {
    if (!inSession || dropdown.hidden) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight = Math.min(highlight + 1, suggestions.length - 1);
      renderRows();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight = Math.max(highlight - 1, -1);
      renderRows();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlight >= 0 && suggestions[highlight]) {
        accept(suggestions[highlight].content);
      } else {
        acceptRaw();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      endSession();
      logLine('onInputCancelled()');
    }
  });

  logLine(`提示：输入 ${KEYWORD}，再按空格进入关键词会话`);

  return {
    element: root,
    setOpenMode(mode: OpenMode) {
      openMode = mode;
    },
    dispose() {
      // 没有定时器或全局监听，节点移除后随 DOM 一起回收
    },
  };
}
