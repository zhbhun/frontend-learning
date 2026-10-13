/**
 * 范例介绍：演示两副本并发修改后的 merge 收敛。
 * 输入：alice / bob 是两个副本各自写入的计数值。
 * 操作：同一基础文档 clone 出两个副本 -> 各自 change 分叉 -> 双向 merge -> 对比。
 * 预期：合并结果与顺序无关；并发写同一键产生多个候选值但确定性胜出；merge 幂等。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const ALICE = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';
const BOB = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';

export interface MergeLabArgs {
  alice: number;
  bob: number;
}

export interface MergeLabSnapshot {
  rows: Array<[string, string]>;
}

export interface MergeLabInstance {
  update(options: MergeLabArgs): void;
  dispose(): void;
}

// from 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type CounterDoc = {
  n: number;
};

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

function run(args: MergeLabArgs): LabResult {
  const lines: string[] = [];

  // 基础文档用随机 actor，两个副本各持固定身份
  const base = A.from<CounterDoc>({ n: 0 });
  const a = A.clone(base, ALICE);
  const b = A.clone(base, BOB);

  const a2 = A.change(a, 'Alice 设值', (d) => {
    d.n = args.alice;
  });
  const b2 = A.change(b, 'Bob 设值', (d) => {
    d.n = args.bob;
  });
  lines.push(`副本 A: n = ${a2.n}；副本 B: n = ${b2.n}（分叉了）`);

  const m1 = A.merge(a2, b2);
  const m2 = A.merge(b2, a2);
  lines.push(`merge(a2, b2).n = ${m1.n}；merge(b2, a2).n = ${m2.n}`);
  lines.push(`两个方向结果一致 ? ${A.equals(m1, m2)}（收敛）`);
  lines.push(`merge 后再 merge 幂等 ? ${A.equals(m1, A.merge(m1, b2))}`);

  const conflicts = A.getConflicts(m1, 'n');
  const candidates = conflicts ? Object.values(conflicts) : [];
  lines.push(
    `getConflicts(m1, 'n') 候选值: ${JSON.stringify(candidates)}（${candidates.length} 个）`,
  );
  lines.push(`文档最终呈现确定性胜出值 n = ${m1.n}`);

  try {
    A.change(a2, () => {});
  } catch (error) {
    lines.push(`merge 后 local（a2）已过期 -> 再 change 抛错`);
  }

  return {
    lines,
    rows: [
      ['副本 A / B', `${a2.n} / ${b2.n}`],
      ['合并结果 n', String(m1.n)],
      ['双向一致', String(A.equals(m1, m2))],
      ['冲突候选数', String(candidates.length)],
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
  drawingContext.fillText('并发修改后 merge 收敛', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createMergeLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MergeLabSnapshot) => void,
): MergeLabInstance {
  let lastResult: LabResult | null = null;

  function update(options: MergeLabArgs): void {
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
