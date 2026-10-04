/**
 * 范例介绍：「存储操作台」——Controls 选择存储类型与操作，对该存储执行一次
 * 真实读写；readout 显示五类存储各自的键数量、最近一次操作与操作回显。
 * 前置状态：无需任何环境；读者自己打开 DevTools 的 Application 面板
 * （Command+Option+J 后选择 Application），在左侧树对应分栏对照观察。
 * 主要操作：Controls 切换「存储类型」（localStorage / sessionStorage / Cookies /
 *   IndexedDB / Cache Storage）与「操作」（write / read / remove / clear），每次
 *   参数变化执行一次；面板里直接编辑、删除或 Clear site data 不经过本页代码。
 * 预期结果：write 后对应分栏出现 3 条 demo 样例数据；在面板双击编辑 Web Storage
 *   的值后切 read，「操作回显」显示新值——证明面板写入的就是页面读到的存储；
 *   面板 Clear site data 让五个计数同时归零而「最近操作」不变。
 * 阅读主线：runTarget() 把「存储类型 + 操作」翻译成对应存储的原生 API 调用；
 *   IndexedDB 与 Cache Storage 是异步 API，计数刷新稍有延迟；readout 只在你
 *   操作 Controls 后重新统计（面板改动不会主动通知页面）。
 */

/** 演示页提供的存储类型。 */
export type StorageTargetId =
  | 'local'
  | 'session'
  | 'cookie'
  | 'indexeddb'
  | 'cache';

/** 演示页提供的操作。 */
export type StorageActionId = 'write' | 'read' | 'remove' | 'clear';

export interface StorageSpecimenOptions {
  target: StorageTargetId;
  action: StorageActionId;
}

export interface StorageSpecimenInstance {
  update(options: StorageSpecimenOptions): void;
  dispose(): void;
}

interface OperationResult {
  op: string;
  echo: string;
}

export const TARGET_LABELS: Record<StorageTargetId, string> = {
  local: 'localStorage',
  session: 'sessionStorage',
  cookie: 'Cookies',
  indexeddb: 'IndexedDB',
  cache: 'Cache Storage',
};

export const ACTION_LABELS: Record<StorageActionId, string> = {
  write: 'write',
  read: 'read',
  remove: 'remove',
  clear: 'clear',
};

/** 各存储在 Application 面板里的分栏路径，与正文操作表一致。 */
export const PANEL_HINTS: Record<StorageTargetId, string> = {
  local: '面板：Application > Local Storage >（当前 origin）',
  session: '面板：Application > Session Storage >（当前 origin）',
  cookie: '面板：Application > Cookies >（当前 origin）',
  indexeddb: '面板：Application > IndexedDB > demo-notes > notes',
  cache: '面板：Application > Cache Storage > demo-assets-v1',
};

export const ACTION_HINTS: Record<StorageActionId, string> = {
  write: '写入 3 条样例（重复执行覆盖同键）',
  read: '读取当前全部条目并回显',
  remove: '删除一条样例（等价面板 Delete Selected）',
  clear: '清空该类存储（等价面板 Clear All）',
};

/* ---------- 样例数据：write 每次写入这批键 ---------- */

const LOCAL_SAMPLE: Array<[string, string]> = [
  ['demo:theme', 'dark'],
  ['demo:cart', '{"items":["tea","mug"],"total":86}'],
  ['demo:token', 'demo-token-abc123'],
];

const SESSION_SAMPLE: Array<[string, string]> = [
  ['demo:scroll', '0.42'],
  ['demo:draft', '未发送的评论草稿'],
  ['demo:step', '3'],
];

/** document.cookie 写入的样例 cookie：Path=/，一小时后过期，SameSite=Lax。 */
const COOKIE_SAMPLE: Array<[string, string]> = [
  ['demo_lang', 'zh-CN'],
  ['demo_theme', 'dark'],
  ['demo_visitor', 'abc123'],
];
const COOKIE_MAX_AGE = 3600;

/** IndexedDB 样例：demo-notes 库、notes 对象仓库（keyPath 为 id，含 title 索引）。 */
const DB_NAME = 'demo-notes';
const STORE_NAME = 'notes';

interface DemoNote {
  id: number;
  title: string;
  body: string;
}

const NOTES_SAMPLE: DemoNote[] = [
  { id: 1, title: '购物清单', body: '茶杯、挂耳咖啡、便签本' },
  { id: 2, title: '周报草稿', body: 'Application 面板演示记录' },
  { id: 3, title: '提醒', body: '演示结束后清空存储' },
];

/** Cache Storage 样例：缓存名 demo-assets-v1，为每个 URL 手工构造一份 Response。 */
const CACHE_NAME = 'demo-assets-v1';
const CACHE_SAMPLE: Array<[string, string, string]> = [
  ['/demo/hero.json', 'application/json', '{"title":"存储操作台","variant":"A"}'],
  ['/demo/user.json', 'application/json', '{"name":"Ada","role":"demo"}'],
  ['/demo/styles.css', 'text/css', 'body{--demo:true}'],
];

const SPECIMEN_STYLES = `
.storage-specimen {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.storage-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.storage-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.storage-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.storage-specimen__call {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.storage-specimen__call-name {
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
  white-space: nowrap;
}
.storage-specimen__call-hint {
  font-size: 12px;
  color: #5d6f67;
}
.storage-specimen__readout {
  flex: 1 1 230px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.storage-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.storage-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  overflow-wrap: anywhere;
}
`;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function cookieNames(): string[] {
  return document.cookie
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split('=')[0]);
}

function expireCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function cacheAvailable(): boolean {
  return typeof self !== 'undefined' && 'caches' in self;
}

/** 打开样例数据库；首次写入时通过 onupgradeneeded 创建仓库与索引。 */
function openDemoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, {
        keyPath: 'id',
      });
      store.createIndex('title', 'title');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 在 notes 仓库上发起一次请求并等它完成。 */
function storeRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeRequest(db: IDBDatabase, run: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    run(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- 各存储的计数 ---------- */

function countWebStorage(storage: Storage): string {
  return String(storage.length);
}

async function countIndexedDb(): Promise<string> {
  if (typeof indexedDB.databases !== 'function') {
    return '?';
  }
  const databases = await indexedDB.databases();
  if (!databases.some((info) => info.name === DB_NAME)) {
    return '0';
  }
  const db = await openDemoDb();
  try {
    const total = await storeRequest(db, 'readonly', (store) => store.count());
    return String(total);
  } finally {
    db.close();
  }
}

async function countCache(): Promise<string> {
  if (!cacheAvailable()) {
    return '?';
  }
  if (!(await caches.has(CACHE_NAME))) {
    return '0';
  }
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  return String(keys.length);
}

/* ---------- 各存储的动作实现 ---------- */

function runWebStorageAction(
  target: 'local' | 'session',
  action: StorageActionId,
): OperationResult {
  const storage = target === 'local' ? localStorage : sessionStorage;
  const sample = target === 'local' ? LOCAL_SAMPLE : SESSION_SAMPLE;
  const label = TARGET_LABELS[target];

  switch (action) {
    case 'write': {
      for (const [key, value] of sample) {
        storage.setItem(key, value);
      }
      return {
        op: `${label} ← write（3 条）`,
        echo: sample.map(([key, value]) => `${key}=${truncate(value, 18)}`).join(' | '),
      };
    }
    case 'read': {
      const rows: string[] = [];
      for (let index = 0; index < storage.length && rows.length < 3; index += 1) {
        const key = storage.key(index);
        if (key != null) {
          rows.push(`${key}=${truncate(storage.getItem(key) ?? '', 18)}`);
        }
      }
      return {
        op: `${label} → read（${storage.length} 条）`,
        echo: rows.join(' | ') || '（空）',
      };
    }
    case 'remove': {
      const existing = sample
        .map(([key]) => key)
        .find((key) => storage.getItem(key) !== null);
      if (!existing) {
        return { op: `${label} → remove（无样例键）`, echo: '样例键已全部删除' };
      }
      storage.removeItem(existing);
      return {
        op: `${label} → remove ${existing}`,
        echo: `剩余 ${storage.length} 条；等价于面板选中一行后 Delete Selected`,
      };
    }
    case 'clear': {
      storage.clear();
      return { op: `${label} → clear（剩 0 条）`, echo: '等价于面板的 Clear All' };
    }
  }
}

function runCookieAction(action: StorageActionId): OperationResult {
  const label = TARGET_LABELS.cookie;

  switch (action) {
    case 'write': {
      for (const [name, value] of COOKIE_SAMPLE) {
        document.cookie = `${name}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      }
      return {
        op: `${label} ← write（3 条）`,
        echo: `${COOKIE_SAMPLE[0][0]} 等三条，Path=/，Max-Age=${COOKIE_MAX_AGE}，SameSite=Lax`,
      };
    }
    case 'read': {
      const raw = document.cookie;
      return {
        op: `${label} → read document.cookie`,
        echo: truncate(raw || '（无 cookie）', 96),
      };
    }
    case 'remove': {
      const existing = COOKIE_SAMPLE.map(([name]) => name).find((name) =>
        cookieNames().includes(name),
      );
      if (!existing) {
        return { op: `${label} → remove（无样例 cookie）`, echo: '样例 cookie 已全部删除' };
      }
      expireCookie(existing);
      return {
        op: `${label} → remove ${existing}`,
        echo: 'document.cookie 读不到属性，删除要重写同名 cookie 并设 Max-Age=0',
      };
    }
    case 'clear': {
      for (const [name] of COOKIE_SAMPLE) {
        expireCookie(name);
      }
      return { op: `${label} → clear（剩 0 条）`, echo: '逐条重写 Max-Age=0 使其过期' };
    }
  }
}

async function runIndexedDbAction(action: StorageActionId): Promise<OperationResult> {
  const label = TARGET_LABELS.indexeddb;

  if (action === 'write') {
    const db = await openDemoDb();
    try {
      await writeRequest(db, (store) => {
        for (const note of NOTES_SAMPLE) {
          store.put(note);
        }
      });
    } finally {
      db.close();
    }
    return {
      op: `${label} ← put（3 条）`,
      echo: `${DB_NAME} / ${STORE_NAME}：keyPath 为 id，另有 title 索引`,
    };
  }

  const db = await openDemoDb();
  try {
    switch (action) {
      case 'read': {
        const notes = (await storeRequest(db, 'readonly', (store) => store.getAll())) as DemoNote[];
        return {
          op: `${label} → read（${notes.length} 条）`,
          echo:
            notes
              .slice(0, 3)
              .map((note) => `id=${note.id}《${note.title}》`)
              .join(' | ') || '仓库为空',
        };
      }
      case 'remove': {
        const keys = await storeRequest(db, 'readonly', (store) => store.getAllKeys());
        if (keys.length === 0) {
          return { op: `${label} → remove（仓库已空）`, echo: '没有可删的记录' };
        }
        const target = Math.min(...(keys as number[]));
        await writeRequest(db, (store) => {
          store.delete(target);
        });
        return {
          op: `${label} → delete id=${target}`,
          echo: '等价于面板选中一条后 Delete Selected',
        };
      }
      case 'clear': {
        await writeRequest(db, (store) => {
          store.clear();
        });
        return { op: `${label} → clear object store`, echo: '等价于面板的 Clear object store' };
      }
    }
  } finally {
    db.close();
  }
}

async function runCacheAction(action: StorageActionId): Promise<OperationResult> {
  if (!cacheAvailable()) {
    return {
      op: 'Cache Storage 不可用',
      echo: '当前环境不是安全上下文（secure context）',
    };
  }
  const label = TARGET_LABELS.cache;
  const cache = await caches.open(CACHE_NAME);

  if (action === 'write') {
    for (const [url, type, body] of CACHE_SAMPLE) {
      await cache.put(url, new Response(body, { headers: { 'Content-Type': type } }));
    }
    return {
      op: `${label} ← put（3 条）`,
      echo: `缓存名 ${CACHE_NAME}，URL 为 /demo/*`,
    };
  }

  const keys = await cache.keys();
  switch (action) {
    case 'read': {
      const lines: string[] = [];
      for (const request of keys.slice(0, 3)) {
        const response = await cache.match(request);
        const text = response ? await response.text() : '';
        lines.push(`${pathnameOf(request.url)}=${truncate(text, 24)}`);
      }
      return {
        op: `${label} → read（${keys.length} 条）`,
        echo: lines.join(' | ') || '缓存为空',
      };
    }
    case 'remove': {
      if (keys.length === 0) {
        return { op: `${label} → remove（缓存已空）`, echo: '没有可删的条目' };
      }
      const first = keys[0];
      await cache.delete(first);
      return {
        op: `${label} → delete ${pathnameOf(first.url)}`,
        echo: '等价于面板选中一条后 Delete Selected',
      };
    }
    case 'clear': {
      for (const request of keys) {
        await cache.delete(request);
      }
      return {
        op: `${label} → clear（删 ${keys.length} 条）`,
        echo: '等价于 Storage 勾选 Cache storage 后 Clear site data',
      };
    }
  }
}

async function runTarget(options: StorageSpecimenOptions): Promise<OperationResult> {
  switch (options.target) {
    case 'local':
    case 'session':
      return runWebStorageAction(options.target, options.action);
    case 'cookie':
      return runCookieAction(options.action);
    case 'indexeddb':
      return runIndexedDbAction(options.action);
    case 'cache':
      return runCacheAction(options.action);
  }
}

export function createStorageSpecimen(
  root: HTMLElement,
): StorageSpecimenInstance {
  root.classList.add('storage-specimen');
  root.innerHTML = `
    <div class="storage-specimen__main">
      <p class="storage-specimen__hint">存储操作台：在下方 Controls 选择存储类型与操作，每次参数变化对该存储执行一次<b>真实读写</b>。打开 DevTools 的 Application 面板（<code>Command+Option+J</code> 后选择 Application），在左侧树对应分栏查看、编辑、删除这批数据；readout 计数与面板行数保持一致，面板里直接改完后，再动一次 Controls 即可重新统计。</p>
      <div class="storage-specimen__call">
        <code class="storage-specimen__call-name"></code>
        <span class="storage-specimen__call-hint"></span>
      </div>
    </div>
    <dl class="storage-specimen__readout">
      <dt>localStorage</dt><dd class="storage-specimen__cell-local"></dd>
      <dt>sessionStorage</dt><dd class="storage-specimen__cell-session"></dd>
      <dt>Cookies</dt><dd class="storage-specimen__cell-cookie"></dd>
      <dt>IndexedDB（demo-notes）</dt><dd class="storage-specimen__cell-indexeddb"></dd>
      <dt>Cache Storage（demo-assets-v1）</dt><dd class="storage-specimen__cell-cache"></dd>
      <dt>最近操作</dt><dd class="storage-specimen__cell-op"></dd>
      <dt>操作回显</dt><dd class="storage-specimen__cell-echo"></dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const callName = root.querySelector(
    '.storage-specimen__call-name',
  ) as HTMLElement;
  const callHint = root.querySelector(
    '.storage-specimen__call-hint',
  ) as HTMLElement;
  const cells = {
    local: root.querySelector('.storage-specimen__cell-local') as HTMLElement,
    session: root.querySelector('.storage-specimen__cell-session') as HTMLElement,
    cookie: root.querySelector('.storage-specimen__cell-cookie') as HTMLElement,
    indexeddb: root.querySelector('.storage-specimen__cell-indexeddb') as HTMLElement,
    cache: root.querySelector('.storage-specimen__cell-cache') as HTMLElement,
    op: root.querySelector('.storage-specimen__cell-op') as HTMLElement,
    echo: root.querySelector('.storage-specimen__cell-echo') as HTMLElement,
  };

  let disposed = false;
  let sequence = 0;

  function paintCounts(counts: Record<StorageTargetId, string>): void {
    cells.local.textContent = counts.local;
    cells.session.textContent = counts.session;
    cells.cookie.textContent = counts.cookie;
    cells.indexeddb.textContent = counts.indexeddb;
    cells.cache.textContent = counts.cache;
  }

  async function refreshCounts(): Promise<void> {
    const [indexeddb, cache] = await Promise.all([
      countIndexedDb().catch(() => '?'),
      countCache().catch(() => '?'),
    ]);
    if (disposed || !root.isConnected) {
      return;
    }
    paintCounts({
      local: countWebStorage(localStorage),
      session: countWebStorage(sessionStorage),
      cookie: String(cookieNames().length),
      indexeddb,
      cache,
    });
  }

  async function applyAction(options: StorageSpecimenOptions): Promise<void> {
    const seq = (sequence += 1);
    try {
      const result = await runTarget(options);
      if (disposed || seq !== sequence || !root.isConnected) {
        return;
      }
      cells.op.textContent = result.op;
      cells.echo.textContent = truncate(result.echo, 96);
    } catch (error) {
      if (disposed || seq !== sequence || !root.isConnected) {
        return;
      }
      const name = error instanceof DOMException ? error.name : 'Error';
      cells.op.textContent = `出错：${name}`;
      cells.echo.textContent = truncate(
        (error as Error | null)?.message ?? String(error),
        96,
      );
    }
    void refreshCounts();
  }

  callName.textContent = `${TARGET_LABELS.local} · ${ACTION_LABELS.write}`;
  callHint.textContent = `${PANEL_HINTS.local}　${ACTION_HINTS.write}`;
  void refreshCounts();

  return {
    update(options) {
      callName.textContent = `${TARGET_LABELS[options.target]} · ${ACTION_LABELS[options.action]}`;
      callHint.textContent = `${PANEL_HINTS[options.target]}　${ACTION_HINTS[options.action]}`;
      void applyAction(options);
    },
    dispose() {
      disposed = true;
    },
  };
}
