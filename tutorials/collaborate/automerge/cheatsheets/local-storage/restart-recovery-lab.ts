/**
 * 范例介绍：在同一页面里模拟「应用重启」，验证数据从 IndexedDB 恢复。
 * 输入：scenario 选择写入并落盘、同库重建或换库重建；item 是写入的待办文本。
 * 操作：第 1 代 Repo 写入并 flush -> shutdown 卸载 -> 第 2 代 Repo 按场景重建 -> find 同一 URL。
 * 预期：同库重建读回相同值（数据恢复）；换库重建 find 被拒绝——dbName 就是数据边界。
 * 阅读主线：每轮演示都先清空演示库再完整走一遍写入 -> 卸载 -> 重建 -> 读取，结论可重复验证。
 */
import { Repo } from '@automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 演示专用的数据库名：换这个名字，就是换了一块互不相通的存储
const DB_NAME = 'automerge-storage-lab';
const OTHER_DB_NAME = 'automerge-storage-lab-other';
const STORE_NAME = 'documents';

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type NoteDoc = { title: string };

export type RestartScenario = 'write' | 'restart-same' | 'restart-other';

export const RESTART_SCENARIOS: RestartScenario[] = [
  'write',
  'restart-same',
  'restart-other',
];

export interface RestartLabArgs {
  scenario: RestartScenario;
  item: string;
}

export interface RestartLabSnapshot {
  rows: Array<[string, string]>;
}

export interface RestartLabInstance {
  update(options: RestartLabArgs): void;
  dispose(): void;
}

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

interface ChunkView {
  key: string[];
  size: number;
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`无法打开 ${name}`));
  });
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`无法删除 ${name}`));
    // onblocked（仍有连接未关）不需要特殊处理：success 会等所有连接关闭后触发
  });
}

/** 直接读 IndexedDB，列出该库中的全部分片（演示用，等价于按空前缀 loadRange）。 */
async function listChunks(name: string): Promise<ChunkView[]> {
  const db = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const cursorRequest = transaction.objectStore(STORE_NAME).openCursor();
      const chunks: ChunkView[] = [];
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve(chunks);
          return;
        }
        const key = (cursor.key as unknown as string[]).map(String);
        const value = cursor.value as { binary?: Uint8Array } | undefined;
        chunks.push({ key, size: value?.binary?.byteLength ?? 0 });
        cursor.continue();
      };
      cursorRequest.onerror = () =>
        reject(cursorRequest.error ?? new Error('读取分片失败'));
    });
  } finally {
    db.close();
  }
}

function describeChunks(chunks: ChunkView[]): string {
  if (chunks.length === 0) {
    return '空';
  }
  const snapshots = chunks.filter((chunk) => chunk.key[1] === 'snapshot').length;
  const incrementals = chunks.filter((chunk) => chunk.key[1] === 'incremental').length;
  const bytes = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  return `快照 ${snapshots} 块 + 增量 ${incrementals} 块 · 共 ${bytes} 字节`;
}

function shortUrl(url: string): string {
  const [scheme, docId] = url.split(':');
  return `${scheme}:${docId.slice(0, 8)}…`;
}

async function run(args: RestartLabArgs): Promise<LabResult> {
  const lines: string[] = [];
  const item = args.item.trim() === '' ? '（未填写）' : args.item.trim();

  if (typeof indexedDB === 'undefined') {
    return {
      lines: ['当前环境没有 IndexedDB，无法运行本演示。'],
      rows: [['演示数据库', '不可用']],
    };
  }

  // 每轮演示都从空库开始，保证场景可重复
  await deleteDatabase(DB_NAME);
  await deleteDatabase(OTHER_DB_NAME);

  // —— 第 1 代 Repo：写入并落盘 ——
  const firstRepo = new Repo({ storage: new IndexedDBStorageAdapter(DB_NAME) });
  const handle = firstRepo.create<NoteDoc>({ title: item });
  const expectedTitle = `${item}（已保存）`;
  handle.change((d) => {
    d.title = expectedTitle;
  });
  await firstRepo.flush(); // 立即把缓存文档写完（平时约 100ms 内自动写）
  const url = handle.url;
  const firstChunks = await listChunks(DB_NAME);

  lines.push(`第 1 代 Repo：IndexedDBStorageAdapter("${DB_NAME}")`);
  lines.push(`create + change -> title = "${expectedTitle}"`);
  lines.push(`await repo.flush() -> ${describeChunks(firstChunks)}`);
  lines.push(`文档 URL：${shortUrl(url)}`);
  lines.push('await repo.shutdown() —— 第 1 代卸载，数据库连接关闭');
  await firstRepo.shutdown();

  if (args.scenario === 'write') {
    return {
      lines,
      rows: [
        ['演示数据库', DB_NAME],
        ['第 1 代写入', expectedTitle],
        ['第 1 代分片', describeChunks(firstChunks)],
        ['重建读取', '—（尚未重建）'],
      ],
    };
  }

  // —— 第 2 代 Repo：按场景重建，找同一个 URL ——
  const secondDbName = args.scenario === 'restart-same' ? DB_NAME : OTHER_DB_NAME;
  lines.push(
    args.scenario === 'restart-same'
      ? `第 2 代 Repo：同库重建（"${secondDbName}"）`
      : `第 2 代 Repo：换库重建（"${secondDbName}"）`,
  );

  const secondRepo = new Repo({
    storage: new IndexedDBStorageAdapter(secondDbName),
  });
  let restoredTitle: string | null = null;
  let findError: string | null = null;
  try {
    const restored = await secondRepo.find<NoteDoc>(url);
    restoredTitle = restored.doc()?.title ?? null;
  } catch (error) {
    findError = error instanceof Error ? error.message : String(error);
  }
  const secondChunks = await listChunks(secondDbName);
  if (restoredTitle !== null) {
    lines.push(`find(${shortUrl(url)}) -> 读回 title = "${restoredTitle}"`);
  } else {
    lines.push(`find(${shortUrl(url)}) -> 被拒绝：${findError}`);
  }
  await secondRepo.shutdown();

  const recovered = restoredTitle === expectedTitle;
  const rebuildRow =
    args.scenario === 'restart-same'
      ? recovered
        ? '同库重建：原样读回，数据已恢复'
        : '同库重建：读到的值不一致'
      : '换库重建：find 报 unavailable，另一块存储里没有这份数据';

  return {
    lines,
    rows: [
      ['演示数据库', DB_NAME],
      ['第 1 代写入', expectedTitle],
      ['第 1 代分片', describeChunks(firstChunks)],
      ['重建读取', rebuildRow],
    ],
  };
}

function renderLab(canvas: HTMLCanvasElement, result: LabResult): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;
  const size = readCanvasSize(canvas);
  const width = Math.max(320, size.width);
  const height = Math.max(240, size.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawingContext.clearRect(0, 0, width, height);

  drawingContext.fillStyle = '#172033';
  drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  drawingContext.fillText('重启恢复实验台（IndexedDB）', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createRestartLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RestartLabSnapshot) => void,
): RestartLabInstance {
  let lastResult: LabResult | null = null;
  let pending: Promise<void> = Promise.resolve();
  let disposed = false;

  function render(): void {
    if (lastResult) {
      renderLab(canvas, lastResult);
    }
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(options: RestartLabArgs): void {
      // 场景含删除/重建数据库的异步流程，串行执行避免两轮演示交叉
      pending = pending.then(async () => {
        if (disposed) {
          return;
        }
        lastResult = await run(options);
        render();
        emit({ rows: lastResult.rows });
      });
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
