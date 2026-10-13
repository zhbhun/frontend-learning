/**
 * 范例:编辑落点——同样次数、同样内容的编辑,插在文档尾部、中段还是随机位置,
 * 快照体积、物理条目数(Y.decodeUpdate().structs.length)与加载时间差多少。
 * 输入:编辑次数 edits(300–1500)、编辑落点 locus(append 尾部 / mid 中段 / random 随机)。
 * 预期:尾部追加把相邻同源插入合并成 1 个长字符串条目,快照最小、加载最快;
 *      中段与随机插入把已有条目分裂成数千个物理条目,快照大几倍、加载慢几十倍。
 *      这是编码布局的固有差异,不是错误;随机落点用固定种子 LCG,每次可复现。
 * 阅读主线:update() → replay() 三种落点各建一份档并测量 → draw() 画三行对照。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EditLocus = 'append' | 'mid' | 'random';

export interface EditLocusOptions {
  /** 每种落点的编辑次数 */
  edits: number;
  /** 高亮哪种落点 */
  locus: EditLocus;
}

export interface LocusResult {
  /** 快照(encodeStateAsUpdate)字节 */
  bytes: number;
  /** 物理条目数(快照解码后的 struct 数) */
  structs: number;
  /** 快照灌入全新文档的加载时间(ms,5 次取中位数) */
  loadMs: number;
}

export interface EditLocusSnapshot {
  append: LocusResult;
  mid: LocusResult;
  random: LocusResult;
}

export interface EditLocusInstance {
  update(options: EditLocusOptions): void;
  dispose(): void;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// 固定种子 LCG:随机落点完全可复现。
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function buildWith(locus: EditLocus, edits: number): LocusResult {
  const doc = new Y.Doc();
  const text = doc.getText('t');
  const nextRandom = createRandom(42);
  for (let i = 0; i < edits; i += 1) {
    if (locus === 'append') text.insert(text.length, `词${i} `);
    else if (locus === 'mid') text.insert(Math.floor(text.length / 2), `词${i} `);
    else text.insert(Math.floor(nextRandom() * (text.length + 1)), `词${i} `);
  }
  const snapshot = Y.encodeStateAsUpdate(doc);
  const loadTimes: number[] = [];
  for (let round = 0; round < 5; round += 1) {
    const fresh = new Y.Doc();
    const t0 = performance.now();
    Y.applyUpdate(fresh, snapshot);
    loadTimes.push(performance.now() - t0);
  }
  return {
    bytes: snapshot.byteLength,
    structs: Y.decodeUpdate(snapshot).structs.length,
    loadMs: median(loadTimes),
  };
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

export function createEditLocus(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EditLocusSnapshot) => void,
): EditLocusInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: EditLocusOptions = { edits: 1000, locus: 'mid' };
  let result: EditLocusSnapshot = {
    append: buildWith('append', current.edits),
    mid: buildWith('mid', current.edits),
    random: buildWith('random', current.edits),
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(250, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const rows: Array<{ key: EditLocus; label: string; data: LocusResult }> = [
      { key: 'append', label: '尾部追加', data: result.append },
      { key: 'mid', label: '文档中段', data: result.mid },
      { key: 'random', label: '随机位置', data: result.random },
    ];
    const maxBytes = Math.max(...rows.map((row) => row.data.bytes));
    const barMaxWidth = width - 20 - 80 - 260 - 24;

    g.fillStyle = '#172033';
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillText(`同样 ${current.edits} 次编辑、同样内容,只改插入位置`, 20, 26);

    g.fillStyle = '#64748b';
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText('落点', 20, 48);
    g.fillText('快照体积', 100, 48);
    g.fillText('物理条目 / 快照加载', 100 + barMaxWidth + 14, 48);

    rows.forEach((row, index) => {
      const y = 60 + index * 36;
      const highlighted = current.locus === row.key;

      g.fillStyle = highlighted ? '#1d4ed8' : '#475569';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillText(row.label, 20, y + 14);

      g.fillStyle = highlighted ? '#4f7cff' : '#e2e8f0';
      g.fillRect(100, y, Math.max(2, (row.data.bytes / maxBytes) * barMaxWidth), 22);

      g.fillStyle = '#172033';
      g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(
        `${formatBytes(row.data.bytes)}  ${row.data.structs} 条  ${row.data.loadMs.toFixed(2)} ms`,
        100 + barMaxWidth + 14,
        y + 14,
      );
    });

    const slowest = Math.max(result.append.loadMs, result.mid.loadMs, result.random.loadMs);
    const fastest = Math.min(result.append.loadMs, result.mid.loadMs, result.random.loadMs);
    g.fillStyle = '#1d4ed8';
    g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(
      `内容完全相同:快照体积差 ${(
        Math.max(result.append.bytes, result.mid.bytes, result.random.bytes) /
        Math.min(result.append.bytes, result.mid.bytes, result.random.bytes)
      ).toFixed(1)} 倍,加载差 ${(slowest / Math.max(fastest, 0.01)).toFixed(0)} 倍`,
      20,
      Math.max(180, height - 16),
    );

    emit(result);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = {
        append: buildWith('append', options.edits),
        mid: buildWith('mid', options.edits),
        random: buildWith('random', options.edits),
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
