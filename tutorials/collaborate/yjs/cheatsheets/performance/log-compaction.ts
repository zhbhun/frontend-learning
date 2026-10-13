/**
 * 范例:update 日志压缩——只追加增量时,存储与传输体积如何随历史增长,
 * 以及 mergeUpdates(逻辑合并,不做 GC)与快照(GC 后)两档压缩各能省多少。
 * 输入:编辑次数 edits(100–1500,中段插入词组)、删除比例 deleteRatio(0–80%)。
 * 预期:增量合计随编辑数线性增长;mergeUpdates 去重合并后变小但几乎不受删除影响
 *      (墓碑内容保留);快照在删除比例升高时明显缩小(默认 gc 丢弃已删内容)。
 *      中段编辑场景快照反而可能大于 mergeUpdates——物理布局碎片多,见编辑落点一节。
 *      加载读数为 3 次取中位数。
 * 阅读主线:update() → replay() 建档、收集增量、算四档体积与加载时间 → draw() 画条形。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface LogCompactionOptions {
  /** 中段插入词组的次数 */
  edits: number;
  /** 建档完成后从头部删除的内容比例(%) */
  deleteRatio: number;
}

export interface LogCompactionSnapshot {
  incrementalSum: number;
  merged: number;
  snapshot: number;
  snapshotV2: number;
  loadLogMs: number;
  loadSnapshotMs: number;
}

export interface LogCompactionInstance {
  update(options: LogCompactionOptions): void;
  dispose(): void;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

function replay(options: LogCompactionOptions): LogCompactionSnapshot {
  const doc = new Y.Doc();
  const text = doc.getText('t');
  const updates: Uint8Array[] = [];
  doc.on('update', (update) => updates.push(update));
  // 中段插入:贴近真实编辑器里"光标到处移动"的写法。
  for (let i = 0; i < options.edits; i += 1) {
    text.insert(Math.floor(text.length / 2), `词${i} `);
  }
  if (options.deleteRatio > 0) {
    doc.transact(() => {
      text.delete(0, Math.floor((text.length * options.deleteRatio) / 100));
    });
  }
  const incrementalSum = updates.reduce((sum, update) => sum + update.byteLength, 0);
  const merged = Y.mergeUpdates(updates);
  const snapshot = Y.encodeStateAsUpdate(doc);

  // 三种形态灌进全新文档的加载时间(3 次取中位数)。
  function load(payload: Uint8Array | Uint8Array[]): number {
    const times: number[] = [];
    for (let round = 0; round < 3; round += 1) {
      const fresh = new Y.Doc();
      const t0 = performance.now();
      if (Array.isArray(payload)) {
        for (const update of payload) Y.applyUpdate(fresh, update);
      } else {
        Y.applyUpdate(fresh, payload);
      }
      times.push(performance.now() - t0);
    }
    return median(times);
  }

  return {
    incrementalSum,
    merged: merged.byteLength,
    snapshot: snapshot.byteLength,
    snapshotV2: Y.encodeStateAsUpdateV2(doc).byteLength,
    loadLogMs: load(updates),
    loadSnapshotMs: load(snapshot),
  };
}

interface Bar {
  label: string;
  bytes: number;
  /** true = 该档随删除比例收缩(墓碑被清掉) */
  reactsToDelete: boolean;
}

export function createLogCompaction(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LogCompactionSnapshot) => void,
): LogCompactionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: LogCompactionOptions = { edits: 1000, deleteRatio: 0 };
  let result: LogCompactionSnapshot = replay(current);

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(250, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const bars: Bar[] = [
      { label: '增量合计', bytes: result.incrementalSum, reactsToDelete: false },
      { label: 'mergeUpdates', bytes: result.merged, reactsToDelete: false },
      { label: '快照(GC 后)', bytes: result.snapshot, reactsToDelete: true },
      { label: '快照 V2', bytes: result.snapshotV2, reactsToDelete: true },
    ];
    const maxBytes = Math.max(...bars.map((bar) => bar.bytes));
    const barMaxWidth = width - 20 - 130 - 90 - 24;

    g.fillStyle = '#172033';
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillText(
      `${current.edits} 次中段编辑的日志,四档体积${current.deleteRatio > 0 ? `(已删除 ${current.deleteRatio}% 内容)` : ''}`,
      20,
      26,
    );

    bars.forEach((bar, index) => {
      const y = 48 + index * 30;
      g.fillStyle = bar.reactsToDelete ? '#1d4ed8' : '#475569';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillText(bar.label, 20, y + 13);

      g.fillStyle = bar.reactsToDelete ? '#4f7cff' : '#94a3b8';
      g.fillRect(150, y, Math.max(2, (bar.bytes / maxBytes) * barMaxWidth), 20);

      g.fillStyle = '#172033';
      g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(formatBytes(bar.bytes), 150 + barMaxWidth + 10, y + 13);
    });

    // 状态行:删除比例升高时,只有做过 GC 的快照在缩小。
    let status: string;
    if (current.deleteRatio === 0) {
      status = `无删除:mergeUpdates 去重后 ${formatBytes(result.merged)};快照 ${formatBytes(
        result.snapshot,
      )} 按物理布局编码,中段编辑碎片多,未必更小`;
    } else {
      status = `删除 ${current.deleteRatio}%:mergeUpdates 仍保留墓碑内容(${formatBytes(
        result.merged,
      )}),快照 GC 后缩到 ${formatBytes(result.snapshot)}`;
    }
    g.fillStyle = '#1d4ed8';
    g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(status, 20, Math.max(190, height - 40));

    g.fillStyle = '#64748b';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(
      `加载·逐条增量 ${result.loadLogMs.toFixed(1)} ms | 加载·快照 ${result.loadSnapshotMs.toFixed(1)} ms`,
      20,
      Math.max(212, height - 18),
    );

    emit(result);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = replay(options);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
