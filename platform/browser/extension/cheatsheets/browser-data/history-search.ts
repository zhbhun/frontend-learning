/**
 * 范例介绍：模拟 chrome.history.search 的过滤、聚合与统计行为。
 * 前置状态：14 个页面的模拟历史（url / title / visitCount / typedCount /
 * lastVisitTime 跨越最近 8 天），与 getVisits 展开得到的访问流已经聚合为
 * 每页一条 HistoryItem。
 * 主要操作：通过 Controls 调「text」「时间窗」「maxResults」三个参数。
 * 预期结果：text 空串返回全部页面；时间窗切到「全部时间」相当于
 * startTime: 0，默认的 24 小时窗口会把更早的页面挡在外面；maxResults
 * 截断结果行，页脚给出「之外还有多少页」。
 * 阅读主线：顶部是本次 search() 调用的真实参数，中间表格是 HistoryItem
 * 列表（每页一条、取最近访问），底部是合计与截断信息。
 */

export type TimeWindow = 'day' | 'week' | 'all';

export interface HistorySearchOptions {
  text: string;
  timeWindow: TimeWindow;
  maxResults: number;
}

export interface HistorySearchSnapshot {
  textLabel: string;
  windowLabel: string;
  maxResultsLabel: string;
  hitLabel: string;
  truncatedLabel: string;
}

export interface HistorySearchInstance {
  element: HTMLElement;
  update(options: HistorySearchOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

interface SimPage {
  id: string;
  title: string;
  url: string;
  visitCount: number;
  typedCount: number;
  /** 距实例创建时刻的小时数 */
  hoursAgo: number;
}

const PAGES: SimPage[] = [
  { id: 'p1', title: '扩展开发文档', url: 'https://developer.chrome.com/docs/extensions', visitCount: 42, typedCount: 9, hoursAgo: 4 },
  { id: 'p2', title: 'Storybook 文档', url: 'https://storybook.js.org/docs', visitCount: 18, typedCount: 4, hoursAgo: 26 },
  { id: 'p3', title: 'HTTP 缓存笔记', url: 'https://example.com/blog/http-caching', visitCount: 7, typedCount: 2, hoursAgo: 3 },
  { id: 'p4', title: 'Chrome 应用商店', url: 'https://chromewebstore.google.com', visitCount: 63, typedCount: 31, hoursAgo: 1 },
  { id: 'p5', title: 'chrome-extensions-samples', url: 'https://github.com/GoogleChrome/chrome-extensions-samples', visitCount: 12, typedCount: 1, hoursAgo: 80 },
  { id: 'p6', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', visitCount: 55, typedCount: 17, hoursAgo: 12 },
  { id: 'p7', title: '浏览器技术周刊', url: 'https://example.com/news/weekly', visitCount: 4, typedCount: 0, hoursAgo: 50 },
  { id: 'p8', title: 'Can I use', url: 'https://caniuse.com', visitCount: 21, typedCount: 6, hoursAgo: 9 },
  { id: 'p9', title: 'MV3 迁移讨论', url: 'https://stackoverflow.com/questions/mv3', visitCount: 33, typedCount: 8, hoursAgo: 30 },
  { id: 'p10', title: 'Service Worker 规范', url: 'https://w3c.github.io/ServiceWorker', visitCount: 5, typedCount: 1, hoursAgo: 120 },
  { id: 'p11', title: 'Vite 指南', url: 'https://vite.dev/guide', visitCount: 26, typedCount: 5, hoursAgo: 8 },
  { id: 'p12', title: 'Figma 新功能', url: 'https://figma.com', visitCount: 9, typedCount: 0, hoursAgo: 100 },
  { id: 'p13', title: 'Example API 参考', url: 'https://example.com/docs/api', visitCount: 14, typedCount: 2, hoursAgo: 46 },
  { id: 'p14', title: 'npm 趋势', url: 'https://npmtrends.com', visitCount: 2, typedCount: 0, hoursAgo: 200 },
];

const WINDOW_LABEL: Record<TimeWindow, string> = {
  day: '最近 24 小时（startTime 默认）',
  week: '最近 7 天',
  all: '全部时间（startTime: 0）',
};

function windowHours(timeWindow: TimeWindow): number {
  return timeWindow === 'day' ? 24 : timeWindow === 'week' ? 24 * 7 : Infinity;
}

function sinceValue(base: number, timeWindow: TimeWindow): number {
  return timeWindow === 'all' ? 0 : base - windowHours(timeWindow) * 3600_000;
}

function formatAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return '刚刚';
  if (hoursAgo < 24) return `${Math.round(hoursAgo)} 小时前`;
  return `${Math.round(hoursAgo / 24)} 天前`;
}

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .hs-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'history-search-style';

const STYLE = `
.cs-stage.hs-stage {
  aspect-ratio: auto;
  min-height: 480px;
  padding: 38px 14px 112px;
  background: #f8fafc;
}
.hs-call {
  padding: 8px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-x: auto;
}
.hs-call .hs-call-dim { color: #64748b; }
.hs-call .hs-call-num { color: #fcd34d; }
.hs-table {
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
  font-size: 12px;
}
.hs-table th {
  padding: 5px 8px;
  border-bottom: 1px solid #dbe3f0;
  color: #64748b;
  font-size: 11px;
  text-align: left;
  white-space: nowrap;
}
.hs-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #eef2f7;
  color: #172033;
  vertical-align: top;
}
.hs-table td.hs-url {
  max-width: 260px;
  color: #64748b;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hs-table td.hs-num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.hs-empty {
  margin-top: 12px;
  color: #94a3b8;
  font-size: 12px;
}
.hs-foot {
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}
.hs-foot b { color: #3b5bdb; }
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

export function createHistorySearch(): HistorySearchInstance {
  ensureStyles();
  const root = el('div', 'cs-stage hs-stage');

  const call = el('div', 'hs-call');
  const table = el('table', 'hs-table');
  const foot = el('div', 'hs-foot');

  root.append(call, table, foot);

  // 模拟后端：数据是「每页一条」的 HistoryItem——getVisits 的访问流已按页聚合
  const base = Date.now();

  let options: HistorySearchOptions = {
    text: 'chrome',
    timeWindow: 'day',
    maxResults: 10,
  };

  function matches(page: SimPage, text: string): boolean {
    const terms = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return true;
    }
    const haystack = `${page.url} ${page.title}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  }

  function withinWindow(page: SimPage, timeWindow: TimeWindow): boolean {
    return page.hoursAgo <= windowHours(timeWindow);
  }

  function results(): { hits: SimPage[]; truncated: number } {
    const hits = PAGES.filter(
      (page) => matches(page, options.text) && withinWindow(page, options.timeWindow),
    ).sort((left, right) => left.hoursAgo - right.hoursAgo);
    return {
      hits: hits.slice(0, Math.max(1, options.maxResults)),
      truncated: Math.max(0, hits.length - Math.max(1, options.maxResults)),
    };
  }

  function render() {
    const { hits, truncated } = results();
    const since = sinceValue(base, options.timeWindow);
    const isDefault = options.timeWindow === 'day';

    call.replaceChildren();
    const line = document.createElement('div');
    line.append(
      el('span', undefined, 'chrome.history.search({ '),
      el('span', undefined, `text: "${options.text}"`),
      el('span', 'hs-call-dim', ', '),
      el('span', undefined, `startTime: `),
      el('span', 'hs-call-num', String(since)),
      isDefault ? el('span', 'hs-call-dim', ' /* 默认：24 小时前 */') : el('span'),
      el('span', 'hs-call-dim', ', '),
      el('span', undefined, `maxResults: `),
      el('span', 'hs-call-num', String(options.maxResults)),
      el('span', undefined, ' })'),
    );
    call.append(line);

    table.replaceChildren();
    if (hits.length === 0) {
      // 空结果也是一致的可观察证据：参数组合没有命中任何页面
      const row = el('tr');
      const cell = el('td', 'hs-empty', 'search → []：该参数组合下没有匹配的页面');
      cell.colSpan = 5;
      row.append(cell);
      table.append(row);
    } else {
      const head = el('tr');
      ['标题', 'URL', 'visitCount', 'typedCount', '最近访问'].forEach((label) => {
        head.append(el('th', undefined, label));
      });
      const thead = el('thead');
      thead.append(head);
      table.append(thead);
    }

    hits.forEach((page) => {
      const row = el('tr');
      row.append(el('td', undefined, page.title));
      row.append(el('td', 'hs-url', page.url));
      row.append(el('td', 'hs-num', String(page.visitCount)));
      row.append(el('td', 'hs-num', String(page.typedCount)));
      row.append(el('td', 'hs-num', formatAgo(page.hoursAgo)));
      table.append(row);
    });

    const visitTotal = hits.reduce((sum, page) => sum + page.visitCount, 0);
    const typedTotal = hits.reduce((sum, page) => sum + page.typedCount, 0);
    foot.replaceChildren(
      el('span', undefined, `命中 `),
      el('b', undefined, `${hits.length} 页`),
      el('span', undefined, ` · visitCount 合计 `),
      el('b', undefined, String(visitTotal)),
      el('span', undefined, ` · typedCount 合计 `),
      el('b', undefined, String(typedTotal)),
      el(
        'span',
        undefined,
        truncated > 0
          ? ` · maxResults 之外还有 ${truncated} 页`
          : ' · 结果未被 maxResults 截断',
      ),
    );
  }

  render();

  return {
    element: root,
    update(next: HistorySearchOptions) {
      options = next;
      render();
    },
    snapshot(): Array<[string, string]> {
      const { hits, truncated } = results();
      return [
        ['text', `"${options.text}"`],
        ['startTime', WINDOW_LABEL[options.timeWindow]],
        ['maxResults', String(options.maxResults)],
        ['命中页数', `${hits.length} 页`],
        ['被 maxResults 截断', `${truncated} 页`],
      ];
    },
    dispose() {
      // 纯参数驱动，没有定时器或全局监听
    },
  };
}
