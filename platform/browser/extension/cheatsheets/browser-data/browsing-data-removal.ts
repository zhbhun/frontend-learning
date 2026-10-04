/**
 * 范例介绍：模拟 chrome.browsingData.remove 按「类别 × 时间范围 × 源范围」
 * 清理，以及它与其他三族最大的不同——删除不可恢复、无事件可听。
 * 前置状态：10 个数据类别的模拟存量，每类按时间桶（1 小时内 / 1 天 / 1 周 /
 * 更早）与源（example.com / 其他源 / 扩展源）分开计数；模拟时钟固定在实例
 * 创建时刻。
 * 主要操作：勾选要删的类别，用 Controls 切「时间范围」「源范围」与「包含
 * 扩展源」，点「执行 remove()」；重置按钮恢复初始存量。
 * 预期结果：删除量 = 选中类别 ∩ 时间桶 ∩ 源范围（origins 只对 cookies、
 * cache 与网站存储类生效，删 history 时源范围不起作用）；执行时先列出
 * 将删除的条目数，约 1 秒后完成，可选列表只剩未被删的部分——被删的数据
 * 不可恢复。
 * 阅读主线：顶部是本次调用的两个参数（RemovalOptions 与 DataTypeSet），
 * 左侧是类别勾选与剩余存量，右侧与底部是范围选择、执行按钮和结果面板。
 */

export type SinceKey = 'all' | 'hour' | 'day' | 'week';

export type ScopeKey = 'all' | 'origins' | 'exclude';

export interface BrowsingDataOptions {
  since: SinceKey;
  scope: ScopeKey;
  includeExtensionOrigins: boolean;
}

export interface BrowsingDataSnapshot {
  checkedLabel: string;
  sinceLabel: string;
  scopeLabel: string;
  extensionLabel: string;
  statusLabel: string;
}

export interface BrowsingDataInstance {
  element: HTMLElement;
  update(options: BrowsingDataOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

type Bucket = 'hour' | 'day' | 'week' | 'older';

interface Category {
  key: string;
  label: string;
  unit: string;
  /** origins / excludeOrigins 只对 cookies、cache 与网站存储类生效 */
  originScoped: boolean;
  scoped: Record<Bucket, number>;
  other: Record<Bucket, number>;
  extensionSource: Record<Bucket, number>;
}

const BUCKETS: Bucket[] = ['hour', 'day', 'week', 'older'];

const SINCE_LABEL: Record<SinceKey, string> = {
  all: '全部时间（省略 since）',
  hour: '过去一小时',
  day: '过去一天',
  week: '过去一周',
};

const SCOPE_LABEL: Record<ScopeKey, string> = {
  all: '所有源（省略 origins）',
  origins: '仅 example.com（origins）',
  exclude: '除 example.com 外（excludeOrigins）',
};

const SINCE_BUCKETS: Record<SinceKey, Bucket[]> = {
  all: ['hour', 'day', 'week', 'older'],
  hour: ['hour'],
  day: ['hour', 'day'],
  week: ['hour', 'day', 'week'],
};

function build(
  key: string,
  label: string,
  unit: string,
  originScoped: boolean,
  scoped: Record<Bucket, number>,
  other: Record<Bucket, number>,
  extensionSource: Record<Bucket, number>,
): Category {
  return { key, label, unit, originScoped, scoped, other, extensionSource };
}

const INITIAL_CATEGORIES: Category[] = [
  build('cookies', 'cookies', '条', true,
    { hour: 2, day: 6, week: 3, older: 1 },
    { hour: 2, day: 32, week: 93, older: 188 },
    { hour: 0, day: 0, week: 0, older: 0 }),
  build('cache', 'cache', 'MiB', true,
    { hour: 12, day: 120, week: 280, older: 512 },
    { hour: 38, day: 210, week: 608, older: 2048 },
    { hour: 4, day: 10, week: 24, older: 40 }),
  build('history', 'history', '条', false,
    { hour: 92, day: 104, week: 117, older: 68 },
    { hour: 829, day: 938, week: 1052, older: 612 },
    { hour: 0, day: 0, week: 0, older: 0 }),
  build('downloads', 'downloads', '项', false,
    { hour: 0, day: 9, week: 26, older: 17 },
    { hour: 2, day: 0, week: 0, older: 0 },
    { hour: 0, day: 0, week: 0, older: 0 }),
  build('indexedDB', 'indexedDB', '条', true,
    { hour: 12, day: 5, week: 6, older: 3 },
    { hour: 0, day: 1, week: 1, older: 1 },
    { hour: 0, day: 2, week: 1, older: 1 }),
  build('localStorage', 'localStorage', '条', true,
    { hour: 8, day: 6, week: 14, older: 13 },
    { hour: 0, day: 0, week: 0, older: 0 },
    { hour: 0, day: 1, week: 1, older: 0 }),
  build('cacheStorage', 'cacheStorage', '条', true,
    { hour: 1, day: 1, week: 2, older: 3 },
    { hour: 0, day: 0, week: 0, older: 0 },
    { hour: 0, day: 0, week: 1, older: 0 }),
  build('fileSystems', 'fileSystems', '条', true,
    { hour: 0, day: 2, week: 3, older: 3 },
    { hour: 0, day: 0, week: 0, older: 1 },
    { hour: 0, day: 1, week: 0, older: 0 }),
  build('formData', 'formData', '条', false,
    { hour: 3, day: 7, week: 30, older: 80 },
    { hour: 0, day: 0, week: 0, older: 0 },
    { hour: 0, day: 0, week: 0, older: 0 }),
  build('serviceWorkers', 'serviceWorkers', '条', true,
    { hour: 1, day: 2, week: 4, older: 5 },
    { hour: 0, day: 0, week: 0, older: 0 },
    { hour: 0, day: 0, week: 0, older: 0 }),
];

function cloneCategories(): Category[] {
  return INITIAL_CATEGORIES.map((category) => ({
    ...category,
    scoped: { ...category.scoped },
    other: { ...category.other },
    extensionSource: { ...category.extensionSource },
  }));
}

function sum(buckets: Record<Bucket, number>, kept: Bucket[]): number {
  return kept.reduce((total, bucket) => total + buckets[bucket], 0);
}

function formatAmount(value: number, unit: string): string {
  return unit === 'MiB'
    ? `${value < 1024 ? `${value} MiB` : `${(value / 1024).toFixed(1)} GiB`}`
    : `${value} ${unit}`;
}

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .bd-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'browsing-data-removal-style';

const STYLE = `
.cs-stage.bd-stage {
  aspect-ratio: auto;
  min-height: 520px;
  padding: 38px 14px 116px;
  background: #f8fafc;
}
.bd-call {
  padding: 8px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre;
  overflow-x: auto;
}
.bd-call .bd-call-dim { color: #64748b; }
.bd-body {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.bd-list {
  flex: 1 1 300px;
  padding: 10px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
}
.bd-title {
  margin-bottom: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}
.bd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 12px;
}
.bd-item input { margin: 0; }
.bd-item .bd-item-key {
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bd-item .bd-item-total { margin-left: auto; color: #64748b; font-size: 11px; }
.bd-side {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bd-options {
  padding: 10px 12px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 12px;
  color: #475569;
}
.bd-options div { line-height: 1.8; }
.bd-options b { color: #172033; }
.bd-panel { display: flex; gap: 8px; }
.bd-action {
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #172033;
  font-size: 12px;
  cursor: pointer;
}
.bd-action:hover { border-color: #4f7cff; color: #3b5bdb; }
.bd-action--danger { border-color: #fca5a5; color: #b91c1c; }
.bd-action--danger:hover { border-color: #ef4444; color: #b91c1c; }
.bd-result {
  flex: 1 1 260px;
  padding: 10px 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  font-size: 12px;
  color: #475569;
  line-height: 1.8;
}
.bd-result b { color: #172033; }
.bd-result--danger { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
.bd-result--danger b { color: #7f1d1d; }
.bd-result--deleting { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.bd-result--done { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
.bd-result ul { margin: 4px 0 0; padding-left: 18px; }
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

export function createBrowsingDataRemoval(): BrowsingDataInstance {
  ensureStyles();
  const root = el('div', 'cs-stage bd-stage');

  const call = el('div', 'bd-call');
  const body = el('div', 'bd-body');
  const list = el('div', 'bd-list');
  const side = el('div', 'bd-side');
  const options = el('div', 'bd-options');
  const panel = el('div', 'bd-panel');
  const removeButton = el('button', 'bd-action bd-action--danger', '执行 remove()');
  removeButton.type = 'button';
  const resetButton = el('button', 'bd-action', '重置');
  resetButton.type = 'button';
  panel.append(removeButton, resetButton);
  const result = el('div', 'bd-result');

  side.append(options, panel, result);
  body.append(list, side);
  root.append(call, body);

  // —— 模拟后端：删除量 = 选中类别 ∩ 时间桶 ∩ 源范围 ——

  let categories = cloneCategories();
  let checked = new Set(['cookies', 'history']);
  let optionsState: BrowsingDataOptions = {
    since: 'all',
    scope: 'all',
    includeExtensionOrigins: false,
  };
  let status: 'idle' | 'deleting' | 'done' = 'idle';
  let deleted: Array<[string, string]> = [];
  let timer: number | undefined;

  const HOUR = 3600_000;

  function sinceValue(): number | undefined {
    const now = Date.now();
    if (optionsState.since === 'all') {
      return undefined;
    }
    if (optionsState.since === 'hour') {
      return now - HOUR;
    }
    if (optionsState.since === 'day') {
      return now - 24 * HOUR;
    }
    return now - 7 * 24 * HOUR;
  }

  function candidateCount(category: Category): number {
    const buckets = SINCE_BUCKETS[optionsState.since];
    const scoped =
      category.originScoped && optionsState.scope === 'origins'
        ? sum(category.scoped, buckets)
        : category.originScoped && optionsState.scope === 'exclude'
          ? sum(category.other, buckets)
          : sum(category.scoped, buckets) + sum(category.other, buckets);
    const extension = optionsState.includeExtensionOrigins
      ? sum(category.extensionSource, buckets)
      : 0;
    return scoped + extension;
  }

  function totalCount(category: Category): number {
    const buckets = BUCKETS;
    return (
      sum(category.scoped, buckets) +
      sum(category.other, buckets) +
      sum(category.extensionSource, buckets)
    );
  }

  function removeCandidate(category: Category) {
    const buckets = SINCE_BUCKETS[optionsState.since];
    for (const bucket of buckets) {
      if (category.originScoped && optionsState.scope === 'origins') {
        // origins 只删列出的源：保留其他源的存量
        category.scoped[bucket] = 0;
      } else if (category.originScoped && optionsState.scope === 'exclude') {
        // excludeOrigins 保留列出的源：只删其他源
        category.other[bucket] = 0;
      } else {
        category.scoped[bucket] = 0;
        category.other[bucket] = 0;
      }
      // originTypes.extension 未打开时，chrome-extension:// 源的存储数据不动
      if (optionsState.includeExtensionOrigins) {
        category.extensionSource[bucket] = 0;
      }
    }
  }

  function renderCall() {
    const since = sinceValue();
    call.replaceChildren();
    const line = document.createElement('div');
    line.append(el('span', undefined, 'chrome.browsingData.remove(\n  '));
    const optionsText = since === undefined ? '{ }' : `{ since: ${since} }`;
    line.append(el('span', undefined, optionsText));
    if (since === undefined) {
      line.append(el('span', 'bd-call-dim', ' // since 省略 = 0 = 全部历史'));
    }
    if (optionsState.scope !== 'all') {
      const key = optionsState.scope === 'origins' ? 'origins' : 'excludeOrigins';
      line.append(el('span', undefined, `, ${key}: ["https://www.example.com"]`));
    }
    if (optionsState.includeExtensionOrigins) {
      line.append(el('span', undefined, ', originTypes: { extension: true }'));
    }
    line.append(el('span', undefined, ',\n  '));
    const keys = [...checked];
    line.append(
      el(
        'span',
        undefined,
        keys.length === 0
          ? '{ /* 全为 false，没有可删的类别 */ }'
          : `{ ${keys.map((key) => `${key}: true`).join(', ')} }`,
      ),
    );
    line.append(el('span', undefined, ',\n)'));
    call.append(line);
  }

  function renderList() {
    list.replaceChildren(el('div', 'bd-title', 'DataTypeSet · 勾选要删的类别（右侧为剩余存量）'));
    categories.forEach((category) => {
      const label = el('label', 'bd-item');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = checked.has(category.key);
      box.addEventListener('change', () => {
        if (box.checked) {
          checked.add(category.key);
        } else {
          checked.delete(category.key);
        }
        status = 'idle';
        deleted = [];
        render();
      });
      label.append(box, el('span', 'bd-item-key', category.key));
      label.append(
        el(
          'span',
          'bd-item-total',
          `剩余 ${formatAmount(totalCount(category), category.unit)}`,
        ),
      );
      list.append(label);
    });
  }

  function renderOptions() {
    const since = sinceValue();
    const rows: HTMLElement[] = [];
    const row = (label: string, value: string) => {
      const div = el('div');
      div.append(el('span', undefined, `${label}：`), el('b', undefined, value));
      rows.push(div);
    };
    row('时间范围', SINCE_LABEL[optionsState.since]);
    row('源范围', SCOPE_LABEL[optionsState.scope]);
    row(
      'originTypes.extension',
      optionsState.includeExtensionOrigins ? 'true（文档要求格外小心）' : 'false',
    );
    row('since', since === undefined ? '省略（= 0，全部历史）' : String(since));
    options.replaceChildren(...rows);
  }

  function renderResult() {
    if (status === 'idle') {
      result.className = 'bd-result';
      result.replaceChildren(
        el('div', undefined, '删除不可恢复：'),
        el(
          'div',
          undefined,
          '勾选类别并选定范围后点「执行 remove()」，先计算将删除的条目数，再执行删除。没有任何事件会通知删除完成，只能等 Promise resolve。',
        ),
      );
      return;
    }
    if (status === 'deleting') {
      result.className = 'bd-result bd-result--deleting';
      result.replaceChildren(
        el('b', undefined, '删除中……'),
        el(
          'div',
          undefined,
          'remove() 的 Promise 尚未 resolve；后台删除可能持续数十秒，此刻不能假设数据已删完。',
        ),
      );
      return;
    }
    result.className = 'bd-result bd-result--done';
    const children: HTMLElement[] = [
      el('b', undefined, 'Promise 已 resolve · 删除完成，数据不可恢复'),
    ];
    const ul = el('ul');
    if (deleted.length === 0) {
      ul.append(el('li', undefined, '没有删除任何数据（当前范围与勾选下命中为 0）'));
    }
    deleted.forEach(([key, amount]) => {
      ul.append(el('li', undefined, `${key}：删除 ${amount}`));
    });
    children.push(ul);
    children.push(
      el('div', undefined, '左侧剩余存量即为删除后的结果；点「重置」恢复初始数据。'),
    );
    result.replaceChildren(...children);
  }

  function render() {
    renderCall();
    renderList();
    renderOptions();
    renderResult();
  }

  removeButton.addEventListener('click', () => {
    if (status === 'deleting') {
      return;
    }
    deleted = categories
      .filter((category) => checked.has(category.key))
      .map((category) => [
        category.key,
        formatAmount(candidateCount(category), category.unit),
      ] as [string, string]);

    if (checked.size === 0) {
      status = 'idle';
      result.className = 'bd-result';
      result.replaceChildren(
        el('b', undefined, 'DataTypeSet 全为 false'),
        el('div', undefined, '没有任何类别被勾选，remove() 没有可删的数据。'),
      );
      return;
    }

    status = 'deleting';
    render();
    // 模拟后台删除耗时：真实环境里 Promise 在这段时间内不会 resolve
    timer = window.setTimeout(() => {
      categories
        .filter((category) => checked.has(category.key))
        .forEach(removeCandidate);
      status = 'done';
      render();
    }, 1200);
  });

  resetButton.addEventListener('click', () => {
    categories = cloneCategories();
    checked = new Set(['cookies', 'history']);
    status = 'idle';
    deleted = [];
    render();
  });

  render();

  return {
    element: root,
    update(next: BrowsingDataOptions) {
      optionsState = next;
      render();
    },
    snapshot(): Array<[string, string]> {
      return [
        ['勾选类别', `${checked.size} 项：${[...checked].join('、') || '无'}`],
        ['时间范围', SINCE_LABEL[optionsState.since]],
        ['源范围', SCOPE_LABEL[optionsState.scope]],
        [
          'originTypes.extension',
          optionsState.includeExtensionOrigins ? 'true' : 'false',
        ],
        [
          '执行状态',
          status === 'idle' ? '未执行' : status === 'deleting' ? '删除中（Promise 未 resolve）' : '已完成 · 不可恢复',
        ],
      ];
    },
    dispose() {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    },
  };
}
