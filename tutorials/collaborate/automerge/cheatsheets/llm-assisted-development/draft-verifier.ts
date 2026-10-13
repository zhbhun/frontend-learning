/**
 * 范例介绍：草稿验证台——同一组验证断言分别跑三份「AI 草稿」，看断言如何抓出幻觉。
 * 输入：draft 控件选草稿A（旧版 Text 类）/ 草稿B（整串覆盖文本）/ 修正后（splice 增量编辑）。
 * 操作：每选一份草稿，按顺序执行五条断言，每条独立捕获错误与证据。
 * 预期：草稿A 死在第 1 条断言；草稿B 四绿一红——代码全部「能跑」，只有并发断言抓到被覆盖丢弃的编辑；修正后全绿。
 * 阅读主线：能跑不等于正确；验证脚本用可观察的合并行为裁决草稿，静默偏差只有断言能抓到。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type PlanDoc = { title: string };

export type DraftId = 'draft-a' | 'draft-b' | 'fixed';

export const DRAFT_OPTIONS: DraftId[] = ['draft-a', 'draft-b', 'fixed'];

export const DRAFT_LABELS: Record<DraftId, string> = {
  'draft-a': '草稿A：旧版 Text 类',
  'draft-b': '草稿B：整串覆盖文本',
  fixed: '修正后：splice 增量编辑',
};

export type AssertionStatus = 'pass' | 'fail' | 'skip';

export const STATUS_LABELS: Record<AssertionStatus, string> = {
  pass: '通过',
  fail: '失败',
  skip: '未执行',
};

export interface AssertionResult {
  name: string;
  status: AssertionStatus;
  evidence: string;
}

export interface VerifierArgs {
  draft: DraftId;
}

export interface VerifierSnapshot {
  rows: Array<[string, string]>;
}

export interface VerifierInstance {
  update(args: VerifierArgs): void;
  dispose(): void;
}

/**
 * 草稿只提供四个动作钩子，五条断言对所有草稿一视同仁——
 * 断言测的是合并行为，不关心草稿内部怎么写。
 */
interface Draft {
  id: DraftId;
  note: string;
  /** 画布上展示的实现要点。 */
  code: string[];
  /** 创建初值文档；幻觉 API 会在这里就抛错。 */
  createInitial(): A.Doc<PlanDoc>;
  /** 单副本编辑一次，返回新文档。 */
  editOnce(doc: A.Doc<PlanDoc>): A.Doc<PlanDoc>;
  /** 单副本编辑后的期望值。 */
  expectedAfterEdit: string;
  /** 从同一基础文档分出两个副本，各自做一次并发编辑。 */
  concurrentEdits(base: A.Doc<PlanDoc>): [A.Doc<PlanDoc>, A.Doc<PlanDoc>];
  /** 两个并发编辑各自的标记词，用于判断「都保留」。 */
  markers: [string, string];
}

const EDIT_A = 'A 补充议程';
const EDIT_B = 'B 补充预算';
const BASE_TITLE = '计划：';

const drafts: Record<DraftId, Draft> = {
  // 草稿A：AI 从 2.x 教程学来的 Text 类——类型与运行时都不存在
  'draft-a': {
    id: 'draft-a',
    note: '从 2.x 教程学来的写法：用 Text 类包装字符串再调 insertAt',
    code: [
      "const doc = A.from({ title: new A.Text('计划：') });",
      "A.change(doc, (d) => { d.title.insertAt(3, '议程'); });",
    ],
    createInitial() {
      // 旧 API 在类型层面已不存在，用类型断言还原「AI 会写出的调用」
      const legacy = A as unknown as { Text: new (text: string) => string };
      return A.from<PlanDoc>({ title: new legacy.Text(BASE_TITLE) });
    },
    editOnce(doc) {
      const legacy = doc.title as unknown as {
        insertAt(index: number, text: string): void;
      };
      return A.change(doc, (d) => {
        legacy.insertAt(3, EDIT_A);
      });
    },
    expectedAfterEdit: `${BASE_TITLE}${EDIT_A}`,
    concurrentEdits(base) {
      return [
        A.change(A.clone(base), (d) => {
          A.splice(d, ['title'], 3, 0, EDIT_A);
        }),
        A.change(A.clone(base), (d) => {
          A.splice(d, ['title'], 3, 0, EDIT_B);
        }),
      ];
    },
    markers: [EDIT_A, EDIT_B],
  },

  // 草稿B：能跑、单机结果也对，但整串赋值是 put——并发时丢编辑
  'draft-b': {
    id: 'draft-b',
    note: '能跑、单机也对，但编辑被写成整串赋值（put）——并发时另一份编辑被覆盖丢弃',
    code: [
      "const doc = A.from({ title: '计划：' });",
      "A.change(doc, (d) => { d.title = d.title + 'A 补充议程'; });",
      "// 并发副本：d.title = d.title + 'B 补充预算'",
    ],
    createInitial() {
      return A.from<PlanDoc>({ title: BASE_TITLE });
    },
    editOnce(doc) {
      return A.change(doc, (d) => {
        d.title = d.title + EDIT_A;
      });
    },
    expectedAfterEdit: `${BASE_TITLE}${EDIT_A}`,
    concurrentEdits(base) {
      return [
        A.change(A.clone(base), (d) => {
          d.title = d.title + EDIT_A;
        }),
        A.change(A.clone(base), (d) => {
          d.title = d.title + EDIT_B;
        }),
      ];
    },
    markers: [EDIT_A, EDIT_B],
  },

  // 修正后：编辑建模为对既有文本的插入，并发编辑各归其位
  fixed: {
    id: 'fixed',
    note: '编辑建模为对既有文本的插入操作（splice）——并发编辑各归其位，永不冲突',
    code: [
      "const doc = A.from({ title: '计划：' });",
      "A.change(doc, (d) => { A.splice(d, ['title'], 3, 0, 'A 补充议程'); });",
      "// 并发副本在位置 3 插入 'B 补充预算'",
    ],
    createInitial() {
      return A.from<PlanDoc>({ title: BASE_TITLE });
    },
    editOnce(doc) {
      return A.change(doc, (d) => {
        A.splice(d, ['title'], 3, 0, EDIT_A);
      });
    },
    expectedAfterEdit: `${BASE_TITLE}${EDIT_A}`,
    concurrentEdits(base) {
      return [
        A.change(A.clone(base), (d) => {
          A.splice(d, ['title'], 3, 0, EDIT_A);
        }),
        A.change(A.clone(base), (d) => {
          A.splice(d, ['title'], 3, 0, EDIT_B);
        }),
      ];
    },
    markers: [EDIT_A, EDIT_B],
  },
};

function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  return `${name}: ${message}`;
}

/** 五条断言按顺序执行；第 1 条失败说明草稿连文档都建不出来，其余标记未执行。 */
export function runAssertions(draft: Draft): AssertionResult[] {
  const results: AssertionResult[] = [];

  // 断言 1：创建初值文档
  let initial: A.Doc<PlanDoc>;
  try {
    initial = draft.createInitial();
    results.push({
      name: '创建初值文档',
      status: 'pass',
      evidence: `初值 title = ${JSON.stringify(initial.title)}`,
    });
  } catch (error) {
    results.push({
      name: '创建初值文档',
      status: 'fail',
      evidence: describeError(error),
    });
    for (const name of [
      '单副本编辑生效',
      '双副本并发编辑不丢',
      'save/load 往返一致',
      '双向合并收敛一致',
    ]) {
      results.push({ name, status: 'skip', evidence: '前置失败，未执行' });
    }
    return results;
  }

  // 断言 2：单副本编辑生效
  try {
    const edited = draft.editOnce(initial);
    if (edited.title === draft.expectedAfterEdit) {
      results.push({
        name: '单副本编辑生效',
        status: 'pass',
        evidence: `title = ${JSON.stringify(edited.title)}`,
      });
    } else {
      results.push({
        name: '单副本编辑生效',
        status: 'fail',
        evidence: `读到 ${JSON.stringify(edited.title)}，期望 ${JSON.stringify(draft.expectedAfterEdit)}`,
      });
    }
  } catch (error) {
    results.push({
      name: '单副本编辑生效',
      status: 'fail',
      evidence: describeError(error),
    });
  }

  // 断言 3：双副本并发编辑不丢——验证脚本的灵魂
  const concurrent = (() => {
    try {
      return draft.concurrentEdits(initial);
    } catch (error) {
      results.push({
        name: '双副本并发编辑不丢',
        status: 'fail',
        evidence: describeError(error),
      });
      for (const name of ['save/load 往返一致', '双向合并收敛一致']) {
        results.push({ name, status: 'skip', evidence: '并发分叉失败，未执行' });
      }
      return undefined;
    }
  })();
  if (!concurrent) {
    return results;
  }
  const [replicaA, replicaB] = concurrent;

  try {
    // merge 会冻结参数，每次合并都传新鲜 clone
    const merged = A.merge(A.clone(replicaA), A.clone(replicaB));
    const hasBoth = draft.markers.every((marker) =>
      merged.title.includes(marker),
    );
    const conflicts = A.getConflicts(merged, 'title');
    const candidateCount = conflicts ? Object.keys(conflicts).length : 0;
    if (hasBoth) {
      results.push({
        name: '双副本并发编辑不丢',
        status: 'pass',
        evidence: `合并后 title = ${JSON.stringify(merged.title)}——两个编辑都在场（无冲突记录）`,
      });
    } else {
      results.push({
        name: '双副本并发编辑不丢',
        status: 'fail',
        evidence: `合并后只读到 ${JSON.stringify(merged.title)}，另一份编辑被覆盖丢弃（冲突候选 ${candidateCount} 个）`,
      });
    }
  } catch (error) {
    results.push({
      name: '双副本并发编辑不丢',
      status: 'fail',
      evidence: describeError(error),
    });
  }

  // 断言 4：save/load 往返一致
  try {
    const merged = A.merge(A.clone(replicaA), A.clone(replicaB));
    const restored = A.load<PlanDoc>(A.save(merged));
    if (restored.title === merged.title) {
      results.push({
        name: 'save/load 往返一致',
        status: 'pass',
        evidence: `落盘再载入，title = ${JSON.stringify(restored.title)}`,
      });
    } else {
      results.push({
        name: 'save/load 往返一致',
        status: 'fail',
        evidence: `往返后读到 ${JSON.stringify(restored.title)}，期望 ${JSON.stringify(merged.title)}`,
      });
    }
  } catch (error) {
    results.push({
      name: 'save/load 往返一致',
      status: 'fail',
      evidence: describeError(error),
    });
  }

  // 断言 5：双向合并收敛一致（CRDT 的核心承诺）
  try {
    const oneWay = A.merge(A.clone(replicaA), A.clone(replicaB)).title;
    const otherWay = A.merge(A.clone(replicaB), A.clone(replicaA)).title;
    if (oneWay === otherWay) {
      results.push({
        name: '双向合并收敛一致',
        status: 'pass',
        evidence: `merge(a,b) 与 merge(b,a) 都收敛到 ${JSON.stringify(oneWay)}`,
      });
    } else {
      results.push({
        name: '双向合并收敛一致',
        status: 'fail',
        evidence: `两个方向结果不同：${JSON.stringify(oneWay)} vs ${JSON.stringify(otherWay)}`,
      });
    }
  } catch (error) {
    results.push({
      name: '双向合并收敛一致',
      status: 'fail',
      evidence: describeError(error),
    });
  }

  return results;
}

export function createDraftVerifier(
  canvas: HTMLCanvasElement,
  emit: (snapshot: VerifierSnapshot) => void,
): VerifierInstance {
  let lastResults: AssertionResult[] | null = null;
  let lastDraft: Draft | null = null;

  function render(): void {
    if (!lastResults || !lastDraft) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('当前浏览器不支持 Canvas 2D。');
    }
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#172033';
    context.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    context.fillText(`草稿验证台：${DRAFT_LABELS[lastDraft.id]}`, 32, 40);

    context.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillStyle = '#334155';
    let y = 68;
    for (const line of lastDraft.code) {
      context.fillText(line, 32, y);
      y += 20;
    }

    y += 8;
    for (const result of lastResults) {
      const color =
        result.status === 'pass'
          ? '#0f5132'
          : result.status === 'fail'
            ? '#b42318'
            : '#64748b';
      const tag = `[${STATUS_LABELS[result.status]}]`;
      context.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      const tagWidth = context.measureText(tag).width;
      const text = `${result.name}：${result.evidence}`;
      const textWidth = width - 64 - tagWidth - 8;
      const lines = wrapText(context, text, textWidth);
      lines.forEach((line, index) => {
        if (index === 0) {
          context.fillStyle = color;
          context.fillText(tag, 32, y);
        }
        context.fillStyle = '#334155';
        context.fillText(line, 40 + tagWidth, y);
        y += 19;
      });
    }
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(args: VerifierArgs): void {
      const draft = drafts[args.draft];
      lastDraft = draft;
      lastResults = runAssertions(draft);
      render();
      emit({
        rows: lastResults.map((result) => [
          result.name,
          `${STATUS_LABELS[result.status]}｜${result.evidence}`,
        ]),
      });
    },
    dispose() {
      resizeObserver.disconnect();
      lastResults = null;
      lastDraft = null;
    },
  };
}

/** 按像素宽度折行，避免证据文本画出画布。 */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (context.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}
