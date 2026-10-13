/**
 * 范例介绍：演示 change 的核心语义。
 * 输入：scenario 选择要观察的场景（basic 基础变更 / stale 过期快照 /
 *       noop 空变更 / rollback 回滚）。
 * 操作：每次都从 from({ count: 0, note: '' }) 重建文档，按场景执行 change。
 * 预期：change 返回新文档、旧引用冻结为只读快照、无修改返回同一引用、
 *       回调抛错自动回滚；画布日志与左下角读数给出证据。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 注意：v3 的 actor ID 必须是合法 hex 字符串
const ALICE = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';
const ALICE_2 = 'a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2';

export type ChangeScenario = 'basic' | 'stale' | 'noop' | 'rollback';

export interface ChangeLabArgs {
  scenario: ChangeScenario;
}

export interface ChangeLabSnapshot {
  rows: Array<[string, string]>;
}

export interface ChangeLabInstance {
  update(options: ChangeLabArgs): void;
  dispose(): void;
}

// from 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type LabDoc = {
  count: number;
  note: string;
};

interface LabResult {
  title: string;
  lines: string[];
  rows: Array<[string, string]>;
}

function createBaseDoc(): A.Doc<LabDoc> {
  return A.from<LabDoc>({ count: 0, note: '' }, ALICE);
}

function runBasic(): LabResult {
  const lines: string[] = [];
  const doc1 = createBaseDoc();
  lines.push(`doc1 = from({ count: 0 })        -> count = ${doc1.count}`);
  const doc2 = A.change(doc1, '加一', (d) => {
    d.count += 1;
  });
  lines.push(`doc2 = change(doc1, d.count+=1)  -> count = ${doc2.count}`);
  lines.push(`doc1 === doc2 ? ${doc1 === doc2}（change 返回新文档）`);
  lines.push(`旧引用仍读旧值：doc1.count = ${doc1.count}`);
  try {
    A.change(doc1, () => {});
  } catch (error) {
    const message = (error as Error).message.slice(0, 44);
    lines.push(`再对 doc1 执行 change -> 抛错：`);
    lines.push(`  ${message}…`);
  }
  return {
    title: 'change 基础：旧值进，新文档出',
    lines,
    rows: [
      ['doc1.count（旧引用）', String(doc1.count)],
      ['doc2.count（change 后）', String(doc2.count)],
      ['doc1 === doc2', String(doc1 === doc2)],
    ],
  };
}

function runStale(): LabResult {
  const lines: string[] = [];
  const doc1 = createBaseDoc();
  const heads1 = A.getHeads(doc1);
  lines.push(`heads1 = getHeads(doc1)（记录旧时点）`);
  const doc2 = A.change(doc1, '加一', (d) => {
    d.count += 1;
  });
  lines.push(`doc2 = change(doc1, …)           -> count = ${doc2.count}`);
  const snapshot = A.view(doc2, heads1);
  lines.push(`view(doc2, heads1).count = ${snapshot.count}（免费读旧时点）`);
  try {
    A.change(snapshot, () => {});
  } catch {
    lines.push(`对 view 结果 change -> 同样抛 outdated 错`);
  }
  const writable = A.clone(doc2, ALICE_2);
  const forked = A.change(writable, '分叉编辑', (d) => {
    d.note = 'forked';
  });
  lines.push(`clone(doc2, 新 actor) 后可写：`);
  lines.push(`  forked.note = ${forked.note}，actor = ${A.getActorId(forked).slice(0, 8)}…`);
  return {
    title: '旧引用是只读快照，clone 才可写',
    lines,
    rows: [
      ['view 旧时点 count', String(snapshot.count)],
      ['clone 后可写', String(forked.note === 'forked')],
      ['新 actor 前 8 位', A.getActorId(forked).slice(0, 8)],
    ],
  };
}

function runNoop(): LabResult {
  const lines: string[] = [];
  const doc1 = createBaseDoc();
  const changesBefore = A.getAllChanges(doc1).length;
  const same = A.change(doc1, 'no-op', () => {});
  lines.push(`空回调：same === doc1 ? ${same === doc1}`);
  const alsoSame = A.change(doc1, 'same value', (d) => {
    d.note = '';
  });
  lines.push(`赋相同值：alsoSame === doc1 ? ${alsoSame === doc1}`);
  lines.push(`变更记录数：${changesBefore} -> ${A.getAllChanges(doc1).length}`);
  const marked = A.emptyChange(doc1, 'sync point');
  lines.push(`emptyChange('sync point') 强制记录一条空变更`);
  lines.push(`变更记录数：${A.getAllChanges(marked).length}`);
  return {
    title: '没有实际修改就不产生变更',
    lines,
    rows: [
      ['空回调返回同一引用', String(same === doc1)],
      ['变更记录数', `${changesBefore} -> ${changesBefore}`],
      ['emptyChange 后', `${A.getAllChanges(marked).length} 条`],
    ],
  };
}

function runRollback(): LabResult {
  const lines: string[] = [];
  const doc1 = createBaseDoc();
  const changesBefore = A.getAllChanges(doc1).length;
  lines.push(`try: change(doc1, d => {`);
  lines.push(`  d.count += 1;`);
  lines.push(`  throw new Error('业务校验未通过');`);
  lines.push(`})`);
  try {
    A.change(doc1, '会失败的变更', (d) => {
      d.count += 1;
      throw new Error('业务校验未通过');
    });
  } catch (error) {
    lines.push(`回调抛错被原样抛出：${(error as Error).message}`);
  }
  lines.push(`文档保持原状：count = ${doc1.count}，note = '${doc1.note}'`);
  lines.push(`变更记录数不变：${changesBefore} -> ${A.getAllChanges(doc1).length}`);
  const retried = A.change(doc1, '重试成功', (d) => {
    d.count += 5;
  });
  lines.push(`回滚后的文档可继续 change -> count = ${retried.count}`);
  return {
    title: '回调抛错自动回滚',
    lines,
    rows: [
      ['回调抛错后 count', String(doc1.count)],
      ['变更记录数', `${changesBefore} -> ${changesBefore}`],
      ['重试后 count', String(retried.count)],
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
  drawingContext.fillText(result.title, 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createChangeLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChangeLabSnapshot) => void,
): ChangeLabInstance {
  let lastResult: LabResult | null = null;

  function update(options: ChangeLabArgs): void {
    const runners: Record<ChangeScenario, () => LabResult> = {
      basic: runBasic,
      stale: runStale,
      noop: runNoop,
      rollback: runRollback,
    };
    lastResult = runners[options.scenario]();
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
