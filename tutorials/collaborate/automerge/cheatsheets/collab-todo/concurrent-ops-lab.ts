/*
 * 并发操作实验台：操作函数写好之后，先在「没有 Repo、没有网络」的纯文档层
 * 验证并发语义。
 *
 * 演示内容：同一个基线文档克隆出两个副本，各自在自己的副本上真实执行一次
 * change（此刻互不知情），再双向 merge，看合并结果。
 * 输入：scenario——concurrent-add / rename-conflict / toggle-vs-rename。
 * 操作：Controls 切换场景，每次切换都从新基线重跑。
 * 预期结果：并发各加一条 → 两条都保留、两侧顺序一致；并发把同一条改成不同
 * 文案 → 收敛到同一个标题（一边赢，两侧一致）；勾选与改名并发（不同字段）→
 * 两个操作都保留。
 * 阅读主线：操作是 change 内的纯函数，「并发后合并」不需要任何额外代码；
 * 收敛的判据是两个 merge 方向的 heads 相同。
 */
import * as A from '@automerge/automerge';

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';
import { addTodo, renameTodo, toggleTodo, type TodoDoc } from './todo-model';

export const OPS_SCENARIOS = [
  'concurrent-add',
  'rename-conflict',
  'toggle-vs-rename',
] as const;
export type OpsScenario = (typeof OPS_SCENARIOS)[number];

export interface OpsLabArgs {
  scenario: OpsScenario;
}

export interface OpsLabSnapshot {
  rows: Array<[string, string]>;
}

export interface OpsLabInstance {
  update(args: OpsLabArgs): void;
  dispose(): void;
}

interface ScenarioDef {
  label: string;
  /** 日志里对 A / B 操作的一句话描述。 */
  aLabel: string;
  bLabel: string;
  opA: (doc: TodoDoc) => void;
  opB: (doc: TodoDoc) => void;
  /** 场景结论（读数与画布日志共用）。 */
  note: string;
}

const SCENARIO_DEFS: Record<OpsScenario, ScenarioDef> = {
  'concurrent-add': {
    label: '并发各加一条',
    aLabel: 'A 加「订会议室」',
    bLabel: 'B 加「回复邮件」',
    opA: (doc) => addTodo(doc, 'A 加的：订会议室'),
    opB: (doc) => addTodo(doc, 'B 加的：回复邮件'),
    note: '两条新待办都在，两侧顺序一致；并发插入的先后由 CRDT 规则确定，不按时间先后',
  },
  'rename-conflict': {
    label: '并发改同一条标题',
    aLabel: 'A 把「写周报」改名',
    bLabel: 'B 把同一条改名',
    opA: (doc) => renameTodo(doc, 'seed-2', 'A 改的标题'),
    opB: (doc) => renameTodo(doc, 'seed-2', 'B 改的标题'),
    note: '同一条被改成两个值：收敛到同一个标题——一边赢、两侧一致；输掉的值仍在历史里',
  },
  'toggle-vs-rename': {
    label: '勾选与改名并发',
    aLabel: 'A 勾选「买牛奶」',
    bLabel: 'B 改「买牛奶」的标题',
    opA: (doc) => toggleTodo(doc, 'seed-1'),
    opB: (doc) => renameTodo(doc, 'seed-1', 'B 改的标题'),
    note: '不同字段互不覆盖：done 的勾选与 title 的改名都完整保留',
  },
};

interface RunResult {
  copyA: TodoDoc;
  copyB: TodoDoc;
  merged: TodoDoc;
  converged: boolean;
  log: string[];
  note: string;
}

function runScenario(scenario: OpsScenario): RunResult {
  const def = SCENARIO_DEFS[scenario];
  // 基线：两条种子待办，id 固定便于场景定位
  const base = A.from<TodoDoc>({
    items: [
      { id: 'seed-1', title: '基线：买牛奶', done: false },
      { id: 'seed-2', title: '基线：写周报', done: false },
    ],
  });
  // 同一个基线克隆出两个副本：克隆后的副本各自独立演化，模拟两台离线设备
  const copyA = A.change(A.clone(base), '副本 A 的操作', def.opA);
  const copyB = A.change(A.clone(base), '副本 B 的操作', def.opB);
  // 双向各自 merge：收敛意味着两个方向的结果完全一致（heads 是状态指纹）
  const mergedAB = A.merge(A.clone(copyA), copyB);
  const mergedBA = A.merge(A.clone(copyB), copyA);
  const converged =
    JSON.stringify(A.getHeads(mergedAB)) === JSON.stringify(A.getHeads(mergedBA));

  const log = [
    `1. 基线 2 条，克隆出副本 A、B（此刻互不知情）`,
    `2. 各自在副本上 change：${def.aLabel}；${def.bLabel}`,
    converged
      ? '3. merge(A,B) 与 merge(B,A) 的 heads 相同 → 已收敛'
      : '3. 两个 merge 方向的 heads 不同（不应出现）',
  ];

  return { copyA, copyB, merged: mergedAB, converged, log, note: def.note };
}

export function createOpsLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OpsLabSnapshot) => void,
): OpsLabInstance {
  let lastScenario: OpsScenario = OPS_SCENARIOS[0];
  let result = runScenario(lastScenario);

  function render(): void {
    drawLab(canvas, result);
  }

  function emitRows(): void {
    const def = SCENARIO_DEFS[lastScenario];
    emit({
      rows: [
        ['场景', def.label],
        ['副本 A / 副本 B', `${result.copyA.items.length} 条 / ${result.copyB.items.length} 条`],
        [
          '合并结果',
          `${result.merged.items.length} 条 · ${result.converged ? '双向一致' : '双向不一致'}`,
        ],
        ['结论', result.note],
      ],
    });
  }

  const resizeObserver = createResizeObserver(canvas, render);
  render();
  emitRows();

  return {
    update(args) {
      // 同一场景重复触发不重跑，避免随机 id 带来的画面抖动
      if (args.scenario === lastScenario) {
        return;
      }
      lastScenario = args.scenario;
      result = runScenario(args.scenario);
      render();
      emitRows();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}

function drawLab(canvas: HTMLCanvasElement, result: RunResult): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const size = readCanvasSize(canvas);
  const width = Math.max(320, size.width);
  const height = Math.max(240, size.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  context.fillStyle = '#172033';
  context.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  context.fillText('并发操作实验台：两个副本各自离线 change，再双向 merge', 24, 36);

  const columns = [
    { x: 24, header: '副本 A（change 后）', doc: result.copyA },
    { x: 24 + width / 3, header: '副本 B（change 后）', doc: result.copyB },
    { x: 24 + (width * 2) / 3, header: '合并结果（双向一致）', doc: result.merged },
  ];
  for (const column of columns) {
    context.fillStyle = '#334155';
    context.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    context.fillText(column.header, column.x, 70);
    context.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    let y = 96;
    for (const item of column.doc.items) {
      context.fillStyle = item.done ? '#8a9aa8' : '#1f2d3d';
      context.fillText(`${item.done ? '☑' : '☐'} ${item.title}`, column.x, y);
      y += 24;
    }
  }

  context.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  const logLines = [...result.log, `结论：${result.note}`];
  let lineY = height - 16 - (logLines.length - 1) * 19;
  for (const line of logLines) {
    context.fillStyle = line.startsWith('结论') ? '#2c5a3c' : '#5d6f67';
    context.fillText(line, 24, lineY);
    lineY += 19;
  }
}
