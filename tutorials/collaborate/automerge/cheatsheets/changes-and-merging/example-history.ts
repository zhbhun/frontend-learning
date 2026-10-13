/**
 * 范例介绍：演示如何检查变更与历史。
 * 输入：steps 是连续执行的变更次数（1-4），每次变更都带 message。
 * 操作：连续 N 次 change -> 用 getHeads / diff / view / 变更元数据检查历史。
 * 预期：heads 指向当前时点；diff 给出两个时点间的补丁；元数据列出每条变更。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const ALICE = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';

export interface HistoryLabArgs {
  steps: number;
}

export interface HistoryLabSnapshot {
  rows: Array<[string, string]>;
}

export interface HistoryLabInstance {
  update(options: HistoryLabArgs): void;
  dispose(): void;
}

// from 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type CounterDoc = {
  count: number;
};

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

function run(args: HistoryLabArgs): LabResult {
  const steps = Math.max(1, Math.min(4, Math.round(args.steps)));
  const lines: string[] = [];

  let doc = A.from<CounterDoc>({ count: 0 }, ALICE);
  const initialHeads = A.getHeads(doc);
  lines.push(`from() 也记录一条初始变更，heads 数 = ${initialHeads.length}`);

  for (let i = 1; i <= steps; i += 1) {
    doc = A.change(doc, `第 ${i} 次修改`, (d) => {
      d.count += 1;
    });
  }
  const heads = A.getHeads(doc);
  lines.push(`执行 ${steps} 次后 heads 数 = ${heads.length}（指向最新时点）`);
  lines.push(`头哈希前 8 位: ${heads[0].slice(0, 8)}…`);

  const patches = A.diff(doc, initialHeads, heads);
  lines.push(`diff(初始, 现在) -> ${patches.length} 个补丁`);
  lines.push(`  patches[0] = ${JSON.stringify(patches[0])}`);

  const oldView = A.view(doc, initialHeads);
  lines.push(`view(doc, 初始heads).count = ${oldView.count}（回到旧时点）`);

  const metas = A.getChangesMetaSince(doc, []);
  lines.push(`getChangesMetaSince(doc, []) 列出全部 ${metas.length} 条元数据：`);
  const shown = metas.slice(-3);
  for (const meta of shown) {
    lines.push(
      `  seq=${meta.seq} ${meta.message ?? '(无信息)'} hash=${meta.hash.slice(0, 8)}…`,
    );
  }
  lines.push(`inspectChange(doc, hash) 可解码单条完整变更`);

  return {
    lines,
    rows: [
      ['变更总数', String(metas.length)],
      ['diff 补丁数', String(patches.length)],
      ['当前头数量', String(heads.length)],
      ['初始时点 count', String(oldView.count)],
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
  drawingContext.fillText('检查变更与历史', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createHistoryLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HistoryLabSnapshot) => void,
): HistoryLabInstance {
  let lastResult: LabResult | null = null;

  function update(options: HistoryLabArgs): void {
    lastResult = run(options);
    renderLab(canvas, lastResult);
    emit({ rows: lastResult.rows });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    if (lastResult) {
      renderLab(canvas, lastResult);
    }
  });

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
