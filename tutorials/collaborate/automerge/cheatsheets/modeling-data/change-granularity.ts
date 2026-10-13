/**
 * 范例介绍：字段写法如何决定变更粒度（op 数）与并发合并语义。
 * 输入：字段写法场景 + 覆盖内容；两个副本从同一份种子字节 load 分叉（共享祖先）。
 * 操作：每个副本对同一字段独立写 20 次，然后双向 merge。
 * 预期：
 *   - 普通字符串整段覆盖：字符串是文本容器，每次覆盖产生约「1 + 字符数」个 op；
 *   - ImmutableString 整段覆盖：纯标量，每次 1 个 op；
 *   - 计数字段：Counter.increment 每次产生 1 个 op 且并发增量相加；
 *     普通数字赋值同样每次 1 个 op，但并发后只剩一个胜出值。
 * 阅读主线：runScenario 的三个分支；读数对比单次 op 数、总 op 数与合并后读数。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type GranularityKey =
  | 'plain-string'
  | 'immutable-string'
  | 'counter';

export const GRANULARITY_LABELS: Record<GranularityKey, string> = {
  'plain-string': '普通字符串整段覆盖',
  'immutable-string': 'ImmutableString 整段覆盖',
  'counter': '计数字段：Counter vs 普通数字',
};

/** Controls 面板里场景选择器的候选标签（中文）。 */
export const GRANULARITY_OPTIONS: string[] = Object.values(GRANULARITY_LABELS);

export function granularityFromLabel(label: string): GranularityKey {
  const match = (
    Object.entries(GRANULARITY_LABELS) as Array<[GranularityKey, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'plain-string';
}

/** stories 传入的参数：field 是中文标签，content 是每次写入的内容。 */
export interface GranularityArgsView {
  field: string;
  content: string;
}

export interface GranularitySnapshot {
  field: GranularityKey;
  contentLength: number;
  /** 单次写入产生的 op 数 */
  opsPerWrite: number;
  /** 两个副本各写 20 次后的总 op 数（含初始结构） */
  totalOps: number;
  /** 全文档 save 字节数（合并后） */
  saveBytes: number;
  /** 合并后读到的值（readout 面板短句） */
  mergedShort: string;
  /** 冲突候选数量 */
  conflicts: number;
}

export interface GranularityInstance {
  update(options: GranularityArgsView): void;
  dispose(): void;
}

const WRITES = 20;

type TextDoc = { t: string; s: A.ImmutableString };
// @automerge/automerge 3 的类型把 increment 的 delta 标成必填，实现里缺省即 +1；
// 这里按运行时真实签名声明，方法简写的双变兼容保证 A.Counter 仍可直接赋给它。
interface Countable {
  increment(delta?: number): number;
  valueOf(): number;
}
type CountDoc = { n: Countable; p: number };

function truncate(text: string, max = 56): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildGranularitySnapshot(
  options: GranularityArgsView,
): GranularitySnapshot {
  const field = granularityFromLabel(options.field);
  const content = options.content;

  if (field === 'counter') {
    const seed = A.save(
      A.from<CountDoc>({ n: new A.Counter(0), p: 0 }, 'c0ffee'),
    );
    let a = A.load<CountDoc>(seed, 'aaaa');
    let b = A.load<CountDoc>(seed, 'bbbb');
    const ops0 = A.stats(a).numOps;

    a = A.change(a, (x) => {
      x.n.increment(); // 增量操作：并发时按增量相加
      x.p = x.p + 1; // 整键赋值：并发时只剩一个胜出值
    });
    const opsPerWrite = A.stats(a).numOps - ops0;
    for (let i = 1; i < WRITES; i++) {
      a = A.change(a, (x) => {
        x.n.increment();
        x.p = x.p + 1;
      });
      b = A.change(b, (x) => {
        x.n.increment();
        x.p = x.p + 1;
      });
    }
    // 首轮只有 a 写过，补齐 b 的第一次
    b = A.change(b, (x) => {
      x.n.increment();
      x.p = x.p + 1;
    });

    const merged = A.merge(A.clone(a), A.clone(b));
    const counterConflicts = A.getConflicts(merged, 'n');
    const numberConflicts = A.getConflicts(merged, 'p');
    return {
      field,
      contentLength: 1,
      opsPerWrite,
      totalOps: A.stats(merged).numOps,
      saveBytes: A.save(merged).byteLength,
      mergedShort: `Counter = ${merged.n.valueOf()}（增量相加），number = ${merged.p}（胜出值）`,
      conflicts:
        (counterConflicts ? Object.keys(counterConflicts).length : 0) +
        (numberConflicts ? Object.keys(numberConflicts).length : 0),
    };
  }

  const seed = A.save(
    A.from<TextDoc>({ t: '', s: new A.ImmutableString('') }, 'c0ffee'),
  );
  let a = A.load<TextDoc>(seed, 'aaaa');
  let b = A.load<TextDoc>(seed, 'bbbb');
  const ops0 = A.stats(a).numOps;

  const writeOnce = (doc: A.Doc<TextDoc>, text: string, i: number) =>
    field === 'plain-string'
      ? A.change(doc, (x) => { x.t = `${text}（第 ${i} 版）`; })
      : A.change(doc, (x) => {
          x.s = new A.ImmutableString(`${text}（第 ${i} 版）`);
        });

  a = writeOnce(a, content, 1);
  const opsPerWrite = A.stats(a).numOps - ops0;
  for (let i = 2; i <= WRITES; i++) {
    a = writeOnce(a, content, i);
    b = writeOnce(b, content, i);
  }
  b = writeOnce(b, content, 1);

  const merged = A.merge(A.clone(a), A.clone(b));
  const rawConflicts =
    field === 'plain-string'
      ? A.getConflicts(merged, 't')
      : A.getConflicts(merged, 's');
  const conflicts = rawConflicts ? Object.keys(rawConflicts).length : 0;
  const readBack =
    field === 'plain-string' ? merged.t : merged.s.toString();

  return {
    field,
    contentLength: content.length,
    opsPerWrite,
    totalOps: A.stats(merged).numOps,
    saveBytes: A.save(merged).byteLength,
    mergedShort: `合并后读到 ${JSON.stringify(truncate(readBack))}`,
    conflicts,
  };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

export function createGranularityLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GranularitySnapshot) => void,
): GranularityInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: GranularityArgsView = {
    field: GRANULARITY_LABELS['plain-string'],
    content: '会议纪要：确认迭代范围与负责人，同步风险清单',
  };

  function draw() {
    const snapshot = buildGranularitySnapshot(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const heavy = snapshot.opsPerWrite > 2;
    const lines: DrawLine[] = [
      {
        text: `场景：${GRANULARITY_LABELS[snapshot.field]}，两副本各写 20 次`,
        color: '#172033',
        bold: true,
      },
      {
        text: `单次写入 op 数：${snapshot.opsPerWrite}（内容 ${snapshot.contentLength} 字符）`,
        color: heavy ? '#b45309' : '#4f7cff',
        bold: true,
      },
      { text: `两副本写完后总 op 数：${snapshot.totalOps}`, color: '#334155' },
      { text: `合并后全文档 save：${snapshot.saveBytes} 字节`, color: '#334155' },
      {
        text: snapshot.mergedShort,
        color: '#166534',
        bold: true,
      },
      {
        text:
          snapshot.conflicts > 0
            ? `冲突候选：${snapshot.conflicts} 个（来自整段赋值；Counter 增量不产生冲突）`
            : '冲突候选：无',
        color: snapshot.conflicts > 0 ? '#b45309' : '#64748b',
      },
    ];

    let y = 40;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(truncate(line.text, 72), 24, y);
      y += 27;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        field: granularityFromLabel(options.field),
        content: options.content,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
