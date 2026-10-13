/**
 * 范例介绍：旧文本写法在 Automerge 3 里的结局与改写对照实验室。
 * 输入：旧写法场景（Text 类风格 / 整串覆盖风格）与写入内容。
 * 操作：对同一种意图分别执行「旧写法路径」与「3.x 新写法路径」，捕获错误并统计 op 数。
 * 预期：Text 类风格的 d.content.insertAt 抛 TypeError（字符串没有这些方法），
 *       改用 A.splice 成功且 next 命名空间与根导出同一函数；
 *       整串覆盖用普通赋值会产生 1 + N 个 op，ImmutableString 只产生 1 个 put。
 * 阅读主线：measureApiDiff 返回的读数对应正文「文本 API 对照」的实测结论；
 *           全部结论都在 3.5.0 上运行得出，2.x 侧行为见正文引用的官方迁移指南。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ApiScenarioKey = 'text-api' | 'immutable';

export const API_SCENARIO_LABELS: Record<ApiScenarioKey, string> = {
  'text-api': 'Text 类 → 普通字符串',
  immutable: '整串覆盖 → ImmutableString',
};

/** Controls 面板里场景选择器的候选标签（中文）。 */
export const API_SCENARIO_OPTIONS: string[] = Object.values(API_SCENARIO_LABELS);

export function apiScenarioFromLabel(label: string): ApiScenarioKey {
  const match = (
    Object.entries(API_SCENARIO_LABELS) as Array<[ApiScenarioKey, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'text-api';
}

/** stories 传入的参数：scenario 是 Controls 选中的中文标签，content 是写入内容。 */
export interface ApiDiffArgsView {
  scenario: string;
  content: string;
}

export interface ApiDiffSnapshot {
  scenario: ApiScenarioKey;
  content: string;
  /** text-api 场景：旧写法 d.content.insertAt 的报错 */
  oldError: string;
  /** text-api 场景：A.splice 新写法的结果文本 */
  newResult: string;
  /** text-api 场景：A.next.splice 是否与根导出的 splice 同一函数 */
  nextSameFn: boolean;
  /** text-api 场景：新写法产生的 op 数 */
  spliceOps: number;
  /** immutable 场景：普通字符串整段赋值的 op 数 */
  plainOps: number;
  /** immutable 场景：ImmutableString 赋值的 op 数 */
  immutableOps: number;
  /** immutable 场景：普通赋值字段 load 后的读回类型 */
  plainReadback: string;
  /** immutable 场景：ImmutableString 字段 load 后的读回类型 */
  immutableReadback: string;
  /** immutable 场景：两个副本并发普通赋值的冲突候选数 */
  plainConflicts: number;
  /** immutable 场景：两个副本并发 ImmutableString 赋值的冲突候选数 */
  immutableConflicts: number;
}

export interface ApiDiffInstance {
  update(options: ApiDiffArgsView): void;
  dispose(): void;
}

/**
 * 统计一次 change 产生的 op 数（与「数据建模手册」一课同口径）。
 * stats 读的是共享的底层文档状态，因此 change 前的读数要先存成数字。
 */
function countOps(beforeOps: number, after: A.Doc<unknown>): number {
  return A.stats(after).numOps - beforeOps;
}

export function measureApiDiff(args: ApiDiffArgsView): ApiDiffSnapshot {
  const scenario = apiScenarioFromLabel(args.scenario);
  const content = args.content;

  // 场景一：Text 类风格的旧调用 vs splice 新写法
  let oldError = '';
  {
    const doc = A.from<{ content: string }>({ content: '' });
    try {
      // 旧 Text 类写法把字段当作带 insertAt 的对象用；3.x 里它是普通 string
      type LegacyText = { insertAt: (index: number, text: string) => void };
      A.change(doc, (d) => {
        (d.content as unknown as LegacyText).insertAt(0, content);
      });
    } catch (e) {
      oldError = `${(e as Error).name}: ${(e as Error).message}`;
    }
  }
  let newResult = '';
  let spliceOps = 0;
  {
    const doc = A.from<{ content: string }>({ content: '' });
    const opsBefore = A.stats(doc).numOps;
    const next = A.change(doc, (d) => {
      A.splice(d, ['content'], 0, 0, content);
    });
    newResult = next.content;
    spliceOps = countOps(opsBefore, next);
  }

  // 场景二：整段覆盖的两种写法（op 成本、读回类型、并发语义）
  let plainOps = 0;
  let immutableOps = 0;
  let plainReadback = '';
  let immutableReadback = '';
  let plainConflicts = 0;
  let immutableConflicts = 0;
  {
    const plain = A.from<{ s: string }>({ s: '' });
    const plainOpsBefore = A.stats(plain).numOps;
    const plainAfter = A.change(plain, (d) => {
      d.s = content;
    });
    plainOps = countOps(plainOpsBefore, plainAfter);
    plainReadback = typeof A.load<{ s: string }>(A.save(plainAfter)).s;

    const immutable = A.from<{ s: A.ImmutableString }>({
      s: new A.ImmutableString(''),
    });
    const immutableOpsBefore = A.stats(immutable).numOps;
    const immutableAfter = A.change(immutable, (d) => {
      d.s = new A.ImmutableString(content);
    });
    immutableOps = countOps(immutableOpsBefore, immutableAfter);
    immutableReadback =
      A.load<{ s: A.ImmutableString }>(A.save(immutableAfter)).s instanceof
      A.ImmutableString
        ? 'ImmutableString'
        : 'string';

    // 并发赋值：两种写法都走 put 冲突规则（各自从共享种子分叉）
    const base = A.from<{ s: A.ImmutableString }>(
      { s: new A.ImmutableString('start') },
      '0badc0de',
    );
    const a = A.change(A.clone(base, 'aaaa'), (d) => {
      d.s = new A.ImmutableString('from-a');
    });
    const b = A.change(A.clone(base, 'bbbb'), (d) => {
      d.s = new A.ImmutableString('from-b');
    });
    immutableConflicts = Object.keys(A.getConflicts(A.merge(a, b), 's') ?? {})
      .length;

    const pBase = A.from<{ s: string }>({ s: 'start' }, '0badc0de');
    const pA = A.change(A.clone(pBase, 'aaaa'), (d) => {
      d.s = 'from-a';
    });
    const pB = A.change(A.clone(pBase, 'bbbb'), (d) => {
      d.s = 'from-b';
    });
    plainConflicts = Object.keys(A.getConflicts(A.merge(pA, pB), 's') ?? {})
      .length;
  }

  return {
    scenario,
    content,
    oldError,
    newResult,
    nextSameFn: A.next.splice === A.splice,
    spliceOps,
    plainOps,
    immutableOps,
    plainReadback,
    immutableReadback,
    plainConflicts,
    immutableConflicts,
  };
}

export function createApiDiffLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ApiDiffSnapshot) => void,
): ApiDiffInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ApiDiffArgsView = { scenario: API_SCENARIO_OPTIONS[0], content: 'Hello world' };

  function draw() {
    const snapshot = measureApiDiff(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    let lines;
    if (snapshot.scenario === 'text-api') {
      lines = [
        { text: `场景：Text 类 → 普通字符串（写入「${snapshot.content}」）`, color: '#172033', bold: true },
        { text: `旧写法 d.content.insertAt(…) → ${snapshot.oldError || '（竟未报错）'}`, color: '#b91c1c', bold: true },
        { text: `新写法 A.splice(d, ['content'], 0, 0, …) → "${snapshot.newResult}"，共 ${snapshot.spliceOps} 个 op`, color: '#166534', bold: true },
        { text: `A.next.splice 与根导出是同一函数：${snapshot.nextSameFn ? '是（next 只是弃用转发）' : '否'}`, color: '#4f7cff' },
        { text: '结论：数据本来就是字符序列，改的只是调用方式', color: '#64748b' },
      ];
    } else {
      lines = [
        { text: `场景：整串覆盖 → ImmutableString（写入「${snapshot.content}」）`, color: '#172033', bold: true },
        { text: `普通赋值：${snapshot.plainOps} 个 op（1 个 put + 每字符 1 op），读回 ${snapshot.plainReadback}`, color: '#b45309', bold: true },
        { text: `ImmutableString：${snapshot.immutableOps} 个 op（1 个 put），读回 ${snapshot.immutableReadback}`, color: '#166534', bold: true },
        { text: `并发赋值冲突候选：普通 ${snapshot.plainConflicts} 个 / ImmutableString ${snapshot.immutableConflicts} 个（语义相同）`, color: '#4f7cff' },
        { text: '结论：v2 整串覆盖的语义要靠 ImmutableString 保住', color: '#64748b' },
      ];
    }

    let y = 44;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(line.text, 24, y);
      y += 30;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        scenario: options.scenario,
        content: options.content,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
