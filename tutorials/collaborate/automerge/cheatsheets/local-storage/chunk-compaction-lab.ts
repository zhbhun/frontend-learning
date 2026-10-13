/**
 * 范例介绍：观察存储分片（snapshot / incremental）的写入与压实。
 * 输入：extraChanges 是首份快照之后追加的变更次数。
 * 操作：创建文档并 flush 出首份快照 -> 循环追加变更、逐次 flush 保存 -> 统计最终分片布局。
 * 预期：小变更先堆积成 incremental 分片，累计到快照量级后整体压实成单个新 snapshot，
 * 旧分片（旧快照与全部增量）同时被删除。
 * 阅读主线：文件里的 MemoryStorageAdapter 就是自定义适配器的完整接口面（五个方法），
 * Repo 的存储子系统对它和对 IndexedDB 的行为完全一致，分片规律因此可以直接观察。
 */
import {
  Repo,
  type StorageAdapterInterface,
  type StorageKey,
} from '@automerge/automerge-repo';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 自定义适配器只需实现这五个方法（close 可选，交给 Repo.shutdown 调用）。
 * key 是 string[] 形式的分层路径，value 是二进制；loadRange / removeRange
 * 按 key 前缀批量读写，是恢复与删除文档的基础。
 */
class MemoryStorageAdapter implements StorageAdapterInterface {
  #chunks = new Map<string, { key: StorageKey; data: Uint8Array }>();

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    return this.#chunks.get(this.#entryKey(key))?.data;
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    this.#chunks.set(this.#entryKey(key), { key, data });
  }

  async remove(key: StorageKey): Promise<void> {
    this.#chunks.delete(this.#entryKey(key));
  }

  async loadRange(keyPrefix: StorageKey) {
    return [...this.#chunks.values()].filter((chunk) =>
      this.#matches(chunk.key, keyPrefix),
    );
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    for (const [entryKey, chunk] of this.#chunks) {
      if (this.#matches(chunk.key, keyPrefix)) {
        this.#chunks.delete(entryKey);
      }
    }
  }

  /** 供演示读取：当前全部分片与字节数。 */
  entries(): Array<{ key: StorageKey; size: number }> {
    return [...this.#chunks.values()].map((chunk) => ({
      key: chunk.key,
      size: chunk.data.byteLength,
    }));
  }

  #entryKey(key: StorageKey): string {
    return key.join('\u0000');
  }

  #matches(key: StorageKey, prefix: StorageKey): boolean {
    return prefix.every((part, index) => key[index] === part);
  }
}

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type ChunkDoc = {
  payload: string;
  log: string[];
};

// 首份快照要超过 1024 字节，才能看到「增量堆积 -> 压实」的完整过程
// （快照小于 1KB 时存储子系统每次保存都直接整体压实，见正文）
const NOTE_SENTENCE = '本地优先的数据要连同完整历史一起落盘，重启之后才能原样恢复。';
const PAYLOAD = NOTE_SENTENCE.repeat(13);

export interface ChunkLabArgs {
  extraChanges: number;
}

export interface ChunkLabSnapshot {
  rows: Array<[string, string]>;
}

export interface ChunkLabInstance {
  update(options: ChunkLabArgs): void;
  dispose(): void;
}

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

function formatKey(key: StorageKey): string {
  const [docId, kind, hash] = key;
  return `[${docId.slice(0, 6)}…, "${kind}", ${(hash ?? '').slice(0, 8)}]`;
}

function formatBytes(bytes: number): string {
  return `${bytes} 字节`;
}

async function run(args: ChunkLabArgs): Promise<LabResult> {
  const adapter = new MemoryStorageAdapter();
  const repo = new Repo({ storage: adapter });
  const handle = repo.create<ChunkDoc>({ payload: PAYLOAD, log: [] });

  await repo.flush(); // 第一次保存：整份文档写成一个 snapshot 分片

  const total = Math.max(0, Math.floor(args.extraChanges));
  const compactions: number[] = [];
  let previousIncrementals = 0;
  let sawIncremental = false;

  for (let index = 0; index < total; index += 1) {
    handle.change((d) => {
      d.log.push(`第 ${index + 1} 条追加变更`);
    });
    await repo.flush(); // 每次保存写增量还是压实，由存储子系统按分片大小决定

    const incrementalCount = adapter
      .entries()
      .filter((chunk) => chunk.key[1] === 'incremental').length;
    if (incrementalCount > 0) {
      sawIncremental = true;
    }
    if (previousIncrementals > 0 && incrementalCount === 0) {
      compactions.push(index + 1); // 增量清零 = 刚刚发生一次压实
    }
    previousIncrementals = incrementalCount;
  }

  await repo.shutdown();

  const chunks = adapter.entries();
  const snapshots = chunks.filter((chunk) => chunk.key[1] === 'snapshot');
  const incrementals = chunks.filter((chunk) => chunk.key[1] === 'incremental');
  const snapshotBytes = snapshots.reduce((sum, chunk) => sum + chunk.size, 0);
  const incrementalBytes = incrementals.reduce((sum, chunk) => sum + chunk.size, 0);

  const lines: string[] = [];
  lines.push(`首份快照之后追加 ${total} 条变更，每条变更后保存一次。`);
  lines.push(`最终分片布局（${chunks.length} 块）：`);
  for (const chunk of chunks.slice(0, 8)) {
    lines.push(`  ${formatKey(chunk.key)} · ${formatBytes(chunk.size)}`);
  }
  if (chunks.length > 8) {
    lines.push(`  …其余 ${chunks.length - 8} 块从略`);
  }
  if (compactions.length > 0) {
    lines.push(
      `压实发生在第 ${compactions.join('、')} 条变更后：增量并入新快照，旧分片被删除。`,
    );
  } else if (sawIncremental) {
    lines.push('增量仍在堆积，尚未达到快照量级。');
  }

  const rows: Array<[string, string]> = [
    ['快照分片', `${snapshots.length} 块 · ${formatBytes(snapshotBytes)}`],
    ['增量分片', `${incrementals.length} 块 · ${formatBytes(incrementalBytes)}`],
    [
      '压实次数',
      compactions.length > 0 ? `${compactions.length} 次` : '尚未压实',
    ],
  ];

  return { lines, rows };
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
  drawingContext.fillText('存储分片与压实（内存适配器）', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createChunkLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChunkLabSnapshot) => void,
): ChunkLabInstance {
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
    update(options: ChunkLabArgs): void {
      // 场景是异步的，串行执行避免两次调整交叉写入
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
