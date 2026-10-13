/**
 * 范例介绍：Counter 并发增量与普通数字并发赋值的收敛对照。
 * 输入：副本 aaaa / bbbb 各自的增量（可为负）；两个字段初值都是 100。
 * 操作：Counter 字段用 increment 记增量，普通数字字段用 += 记同样的增量，然后双向 merge。
 * 预期：Counter 合并值恒为 100 + a + b（增量是独立操作，全部保留，无冲突记录）；
 *       数字上的 += 是一次 put，并发 put 走冲突规则，只剩操作 ID 决定的一个胜者，另一份增量丢失。
 * 阅读主线：buildCounterSnapshot 里同一意图在两种类型上的对照；画布与读数并排呈现两种合并结果。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** stories 传入的参数：两个副本各自的增量。 */
export interface CounterLabArgs {
  aliceDelta: number;
  bobDelta: number;
}

export interface CounterLabSnapshot {
  rows: Array<[string, string]>;
}

export interface CounterLabInstance {
  update(options: CounterLabArgs): void;
  dispose(): void;
}

// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>。
type MixedDoc = {
  counter: A.Counter;
  number: number;
};

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

const INITIAL = 100;

export function buildCounterSnapshot(
  options: CounterLabArgs,
): LabResult {
  const { aliceDelta, bobDelta } = options;
  const lines: string[] = [];

  const base = A.from<MixedDoc>({
    counter: new A.Counter(INITIAL),
    number: INITIAL,
  });

  // 同一个「加一次」的意图，两种类型两种写法：
  // Counter.increment 记一条独立增量；数字 += 只是读改写后的一次 put
  const alice = A.change(A.clone(base, 'aaaa'), (d) => {
    d.counter.increment(aliceDelta);
    d.number += aliceDelta;
  });
  const bob = A.change(A.clone(base, 'bbbb'), (d) => {
    d.counter.increment(bobDelta);
    d.number += bobDelta;
  });

  const merged = A.merge(A.clone(alice), A.clone(bob));
  const other = A.merge(A.clone(bob), A.clone(alice));
  const counterValue = merged.counter.valueOf();
  const numberValue = merged.number;
  const expected = INITIAL + aliceDelta + bobDelta;
  const converged = A.equals(merged, other);

  const numberCandidates = A.getConflicts(merged, 'number');
  const candidateCount = numberCandidates ? Object.keys(numberCandidates).length : 0;
  const counterCandidates = A.getConflicts(merged, 'counter');

  lines.push(`同一初值 ${INITIAL}，副本 aaaa 增量 ${aliceDelta}，副本 bbbb 增量 ${bobDelta}`);
  lines.push(`Counter：aaaa 读到 ${alice.counter.valueOf()}，bbbb 读到 ${bob.counter.valueOf()}`);
  lines.push(
    `Counter 合并后：${counterValue}（= ${INITIAL} + (${aliceDelta}) + (${bobDelta})，增量全部保留）`,
  );
  lines.push(
    `普通数字：aaaa 写入 ${alice.number}，bbbb 写入 ${bob.number}（各自的一次 put）`,
  );
  lines.push(
    `普通数字合并后：${numberValue}${
      candidateCount >= 2 ? '（put 冲突，一份增量被丢弃）' : '（无并发，无丢失）'
    }`,
  );
  lines.push(
    `getConflicts：number ${candidateCount} 个候选值，counter ${
      counterCandidates ? Object.keys(counterCandidates).length : '无'
    }`,
  );
  lines.push(`双向合并一致：${converged ? '是' : '否'}`);

  return {
    lines,
    rows: [
      ['Counter 合并值', `${counterValue}（期望 ${expected}）`],
      ['数字合并值', `${numberValue}（期望 ${expected}）`],
      ['数字冲突候选', `${candidateCount} 个`],
      ['双向合并一致', converged ? '是' : '否'],
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
  drawingContext.fillText('Counter 增量 vs 数字 put', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createCounterLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CounterLabSnapshot) => void,
): CounterLabInstance {
  let lastResult: LabResult | null = null;

  function update(options: CounterLabArgs): void {
    lastResult = buildCounterSnapshot(options);
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
