/**
 * 范例:事务粒度——同样 N 次 map.set,包在一个 doc.transact 里与逐条独立提交,
 * 在耗时、update 事件条数与增量 update 字节上的差异。
 * 输入:写入次数 edits(500–5000)、写入方式 mode(单事务 / 逐条事务)。
 * 预期:两种方式写入的内容一致;单事务只产生 1 条 update,逐条产生 N 条;
 *      逐条提交耗时数倍、增量字节合计约 1.7 倍(每条都带事务头),
 *      mergeUpdates 合并后回到单事务的大小——证明差距在"条数",不在内容。
 *      浏览器读数是单次运行,精确数字用本目录 bench-transaction.mjs(预热 + 中位数)。
 * 阅读主线:update() → replay() 两种方式各跑一次并统计 → draw() 画耗时与字节条形。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type WriteMode = 'batched' | 'per-edit';

export interface TransactionCostOptions {
  /** 写入 Y.Map 的键值对数量 */
  edits: number;
  /** 提交方式:batched 包在一个事务里;per-edit 每次写入独立提交 */
  mode: WriteMode;
}

export interface ModeResult {
  /** 本次写入耗时(ms) */
  ms: number;
  /** 触发的 update 事件条数 */
  events: number;
  /** 增量 update 字节合计 */
  incremental: number;
  /** 本方式产生的 update 经 mergeUpdates 合并后的字节 */
  merged: number;
}

export interface TransactionCostSnapshot {
  batched: ModeResult;
  perEdit: ModeResult;
}

export interface TransactionCostInstance {
  update(options: TransactionCostOptions): void;
  dispose(): void;
}

function runOnce(edits: number, batched: boolean): ModeResult {
  const doc = new Y.Doc();
  const map = doc.getMap('m');
  let events = 0;
  let incremental = 0;
  const updates: Uint8Array[] = [];
  doc.on('update', (update) => {
    events += 1;
    incremental += update.byteLength;
    updates.push(update);
  });
  const t0 = performance.now();
  if (batched) {
    doc.transact(() => {
      for (let i = 0; i < edits; i += 1) map.set(`k${i}`, i);
    });
  } else {
    for (let i = 0; i < edits; i += 1) map.set(`k${i}`, i);
  }
  const ms = performance.now() - t0;
  return { ms, events, incremental, merged: Y.mergeUpdates(updates).byteLength };
}

function replay(options: TransactionCostOptions): TransactionCostSnapshot {
  // 预热:排除 JIT 与首次分配对读数的干扰。
  runOnce(100, true);
  runOnce(100, false);
  return {
    batched: runOnce(options.edits, true),
    perEdit: runOnce(options.edits, false),
  };
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

export function createTransactionCost(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransactionCostSnapshot) => void,
): TransactionCostInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: TransactionCostOptions = { edits: 2000, mode: 'batched' };
  let result: TransactionCostSnapshot = replay(current);

  function drawBar(
    label: string,
    value: number,
    maxValue: number,
    y: number,
    text: string,
    highlighted: boolean,
  ) {
    const labelWidth = 150;
    const barX = 20 + labelWidth;
    const barMaxWidth = 220;

    g.fillStyle = highlighted ? '#1d4ed8' : '#475569';
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(label, 20, y + 12);

    g.fillStyle = highlighted ? '#4f7cff' : '#e2e8f0';
    g.fillRect(barX, y, Math.max(2, (value / maxValue) * barMaxWidth), 18);

    g.fillStyle = highlighted ? '#1d4ed8' : '#64748b';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(text, barX + barMaxWidth + 12, y + 12);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(250, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const { batched, perEdit } = result;
    const batchedActive = current.mode === 'batched';

    g.fillStyle = '#172033';
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillText(`同一批 ${current.edits} 次写入的两种提交方式`, 20, 26);

    g.fillStyle = '#64748b';
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText('耗时(越短越好,高亮为当前模式)', 20, 52);
    const maxMs = Math.max(batched.ms, perEdit.ms);
    drawBar('单事务', batched.ms, maxMs, 62, `${batched.ms.toFixed(1)} ms`, batchedActive);
    drawBar('逐条事务', perEdit.ms, maxMs, 86, `${perEdit.ms.toFixed(1)} ms`, !batchedActive);

    g.fillStyle = '#64748b';
    g.fillText('增量 update 字节(逐条 mergeUpdates 合并后 ≈ 单事务)', 20, 132);
    const maxBytes = Math.max(batched.incremental, perEdit.incremental);
    drawBar(
      '单事务 1 条',
      batched.incremental,
      maxBytes,
      142,
      formatBytes(batched.incremental),
      batchedActive,
    );
    drawBar(
      `逐条 ${perEdit.events} 条`,
      perEdit.incremental,
      maxBytes,
      166,
      formatBytes(perEdit.incremental),
      !batchedActive,
    );
    drawBar(
      '逐条合并后',
      perEdit.merged,
      maxBytes,
      190,
      formatBytes(perEdit.merged),
      false,
    );

    const speedup = perEdit.ms / Math.max(batched.ms, 0.01);
    const status = batchedActive
      ? `当前:单事务 —— 1 条事件;若逐条提交,耗时约 ${speedup.toFixed(1)} 倍、流量 ${(
          perEdit.incremental / batched.incremental
        ).toFixed(2)} 倍`
      : `当前:逐条事务 —— ${perEdit.events} 条事件;合并到单事务只需 ${formatBytes(
          batched.incremental,
        )},耗时约 ${speedup.toFixed(1)} 倍差距`;
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = batchedActive ? '#059669' : '#d97706';
    g.fillText(status, 20, Math.max(236, height - 16));

    emit({ batched, perEdit });
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
