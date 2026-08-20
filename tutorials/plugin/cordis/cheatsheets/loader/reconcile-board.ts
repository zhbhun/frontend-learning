/**
 * 范例介绍：把 loader 的「配置调和决策」放进浏览器。画布固定一份当前清单（配置单元
 * 数组，含一个分组与一个禁用条目），Controls 勾选的每项变更生成新清单，再按 loader
 * 源码的同一套规则（EntryGroup.update 的 id 并集 + Entry.update 的 deepEqual 逐键
 * 判等 + Entry.disabled 的祖先级联）给出每个条目的处置与依据。
 * 输入（Controls）：8 个可任意组合的变更——改 config、同值重写、禁用分组、复活禁用
 * 条目、删除组内条目、同 id 换 name、新增条目、组内子条目改 config。
 * 操作：勾选变更 → 逐条目查看处置徽章与依据行；读数统计各处置的数量。
 * 预期结果：只有 config 变化的条目整段重启；同值重写保持不动；同 id 换 name 只记录
 * 不换插件；分组禁用不销毁组自身但级联销毁子条目；禁用条目复活走重新导入。
 * 边界：本实例是 Entry.update / EntryGroup.update 判定算法的等价移植（deepEqual 直接
 * 来自 cosmokit——loader 的同源依赖），不执行真实的文件读写与模块导入；完整运行
 * 行为以正文 Node 实测输出为准。
 * 阅读主线：BASELINE → applyMutations() → computeReconcile() 的各 verdict 分支 → paint()。
 */
import { deepEqual } from 'cosmokit';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 与 loader 的 EntryOptions 对齐的最小配置单元形态（省略本范例用不到的字段） */
export interface UnitOptions {
  id: string;
  name: string;
  label?: string;
  config?: any;
  group?: boolean;
  disabled?: boolean;
}

/** Controls 提供的读者输入：8 个独立变更 */
export interface ReconcileBoardArgs {
  changeGain: boolean;
  sameValue: boolean;
  disableGroup: boolean;
  reviveHop: boolean;
  removeQux: boolean;
  renameEcho: boolean;
  addFlip: boolean;
  childConfig: boolean;
}

/** 一个条目在这次调和中的处置 */
export type Verdict =
  | 'keep'
  | 'restart'
  | 'rebuild'
  | 'create'
  | 'dispose'
  | 'note'
  | 'children';

export interface ReconcileRow {
  depth: number;
  name: string;
  label?: string;
  id: string;
  verdict: Verdict;
  basis: string;
}

/** 供读数消费的运行时快照 */
export interface ReconcileBoardSnapshot {
  mutations: string[];
  counts: Record<Verdict, number>;
}

export interface ReconcileBoardInstance {
  update(args: ReconcileBoardArgs): void;
  dispose(): void;
}

// 当前清单：与 boilerplate 的 app.yml 同构——顶层两个普通条目 + 一个分组 + 一个禁用条目
const BASELINE: UnitOptions[] = [
  { id: '312edd83', name: 'echo', config: { gain: 1 } },
  {
    id: '8357f09b',
    name: '@cordisjs/plugin-group',
    label: 'Demo',
    group: true,
    config: [
      { id: '5b69b05e', name: 'tap', config: { times: 2 } },
      { id: '07c0d352', name: 'qux', config: { mode: 'fast' } },
    ],
  },
  { id: 'e1e36558', name: 'hop', disabled: true },
];

const VERDICT_LABELS: Record<Verdict, string> = {
  keep: '保持',
  restart: '重启',
  rebuild: '重建',
  create: '新建',
  dispose: '销毁',
  note: '只记录',
  children: '调和子条目',
};

const VERDICT_COLORS: Record<Verdict, string> = {
  keep: '#64748b',
  restart: '#4f7cff',
  rebuild: '#7c3aed',
  create: '#16a34a',
  dispose: '#dc2626',
  note: '#d97706',
  children: '#0d9488',
};

const MUTATION_LABELS: Record<keyof ReconcileBoardArgs, string> = {
  changeGain: 'echo.config.gain 1→2',
  sameValue: 'echo.config 等值重写',
  disableGroup: '分组加 disabled',
  reviveHop: 'hop 移除 disabled',
  removeQux: '删除组内 qux',
  renameEcho: 'echo 换 name→ping',
  addFlip: '新增 flip 条目',
  childConfig: '组内 tap.times 2→5',
};

/** 把勾选的变更应用到当前清单的副本上，得到新清单（等价于编辑配置文件后重读） */
function applyMutations(args: ReconcileBoardArgs): UnitOptions[] {
  const next = structuredClone(BASELINE);
  const echo = next.find((unit) => unit.name === 'echo')!;
  if (args.changeGain) echo.config.gain = 2;
  if (args.sameValue) echo.config = { gain: 1 };
  if (args.renameEcho) echo.name = 'ping';
  const group = next.find((unit) => unit.group)!;
  if (args.disableGroup) group.disabled = true;
  if (args.removeQux) {
    group.config = group.config.filter((unit: UnitOptions) => unit.id !== '07c0d352');
  }
  if (args.childConfig) {
    group.config.find((unit: UnitOptions) => unit.id === '5b69b05e')!.config.times = 5;
  }
  if (args.addFlip) {
    next.push({ id: '0a9ec786', name: 'flip', config: { live: true } });
  }
  if (args.reviveHop) {
    delete next.find((unit) => unit.id === 'e1e36558')!.disabled;
  }
  return next;
}

/**
 * Entry.disabled 的判定规则：分组条目自身恒视为启用；普通条目先看自身，
 * 再沿祖先（分组）的原始 disabled 字段级联判定。
 */
function isDisabled(unit: UnitOptions, ancestors: UnitOptions[]): boolean {
  if (unit.group) return false;
  if (unit.disabled) return true;
  return ancestors.some((ancestor) => ancestor.disabled);
}

function listRow(
  unit: UnitOptions,
  ancestors: UnitOptions[],
  depth: number,
  verdict: Verdict,
  basis: string,
): ReconcileRow {
  return {
    depth,
    name: unit.name,
    label: unit.label,
    id: unit.id,
    verdict,
    basis: isDisabled(unit, ancestors)
      ? `${basis}（当前判定为 disabled，无 fiber）`
      : basis,
  };
}

/**
 * EntryGroup.update + Entry.update 的等价移植：对一份（可能嵌套的）清单按 id 求并集，
 * 逐条目给出处置。新旧两条祖先链分别回答「旧状态是否禁用（有没有 fiber）」与
 * 「新状态是否禁用（要不要销毁）」——源码里前者体现为 fiber 是否存在、后者是
 * Entry.disabled 的祖先级联。children 的调和入口是分组条目自身的 fiber.update。
 */
function reconcileList(
  oldList: UnitOptions[],
  newList: UnitOptions[],
  oldAncestors: UnitOptions[],
  newAncestors: UnitOptions[],
  rows: ReconcileRow[],
) {
  const oldMap = new Map(oldList.map((unit) => [unit.id, unit]));
  const newMap = new Map(newList.map((unit) => [unit.id, unit]));
  const ids = [...new Set([...oldMap.keys(), ...newMap.keys()])];

  for (const id of ids) {
    const prev = oldMap.get(id);
    const next = newMap.get(id);

    if (prev && !next) {
      // 只在旧清单：EntryGroup.remove → fiber.dispose()
      rows.push(listRow(prev, newAncestors, 0, 'dispose', '新清单中消失：按 id 移除'));
      if (prev.group) {
        for (const child of prev.config) {
          rows.push(listRow(child, newAncestors, 1, 'dispose', '随分组移除'));
        }
      }
      continue;
    }

    if (!prev && next) {
      // 只在新清单：ensureId 保留新 id → entry.init() 导入并注册
      rows.push(listRow(next, newAncestors, 0, 'create', '新 id：init() 导入插件并注册'));
      if (next.group) {
        // 旧清单为空：旧链保持原样即可（无旧条目需要判定）
        reconcileList([], next.config, oldAncestors, [...newAncestors, next], rows);
      }
      continue;
    }

    // 两边都有：Entry.update 的三步
    // step 1 的 diff：逐键 deepEqual（loader 配置判等的真实位置）
    const diff = Object.keys({ ...next!, ...prev! }).filter(
      (key) => !deepEqual(next![key as keyof UnitOptions], prev![key as keyof UnitOptions]),
    );
    const wasDisabled = isDisabled(prev!, oldAncestors);
    const nowDisabled = isDisabled(next!, newAncestors);

    if (nowDisabled) {
      if (wasDisabled) {
        // step 2：无 fiber，dispose() 无操作 → 提前返回
        rows.push(listRow(next!, newAncestors, 0, 'keep', '新旧都禁用：无 fiber，保持'));
      } else {
        // step 2：this.disabled 为真 → fiber.dispose() 后直接返回
        rows.push(
          listRow(next!, newAncestors, 0, 'dispose', '新增 disabled：step 2 直接 fiber.dispose()'),
        );
        if (next!.group) {
          for (const child of next!.config) {
            rows.push(
              listRow(child, [...newAncestors, next!], 1, 'dispose', '祖先分组 disabled → 级联销毁'),
            );
          }
        }
      }
      continue;
    }

    if (wasDisabled && !nowDisabled) {
      // step 3 的 else 分支：无 fiber → await init() 重新导入（新 uid）
      rows.push(
        listRow(next!, newAncestors, 0, 'rebuild', '移除 disabled：init() 重新导入插件（新 uid）'),
      );
      if (next!.group) {
        reconcileList([], next!.config, [...oldAncestors, prev!], [...newAncestors, next!], rows);
      }
      continue;
    }

    if (!diff.length) {
      // step 3：diff 为空且未强制 → 提前返回，插件不动（同值重写落在这里）
      rows.push(listRow(next!, newAncestors, 0, 'keep', 'diff 为空：deepEqual 逐键相等，提前返回'));
      continue;
    }

    if (next!.group) {
      // 分组恒走 fiber.update（diff 含 config 或 options.group）→ 调和子条目
      rows.push(
        listRow(
          next!,
          newAncestors,
          0,
          'children',
          `diff = ${JSON.stringify(diff)}；options.group 为真 → fiber.update 调和子条目`,
        ),
      );
      reconcileList(
        prev!.config,
        next!.config,
        [...oldAncestors, prev!],
        [...newAncestors, next!],
        rows,
      );
      continue;
    }

    if (diff.includes('config')) {
      // _patchContext：diff 含 config → fiber.update(config, noSave=true) 整段重启
      rows.push(
        listRow(
          next!,
          newAncestors,
          0,
          'restart',
          `diff = ${JSON.stringify(diff)}：含 config → fiber.update 整段重启（uid 不变）`,
        ),
      );
    } else {
      // 其余键（如 name）变化：只更新记录，运行中的插件不变
      rows.push(
        listRow(
          next!,
          newAncestors,
          0,
          'note',
          `diff = ${JSON.stringify(diff)}：不含 config → 只更新条目记录，插件不变`,
        ),
      );
    }
  }
}

/** 对外暴露的纯计算入口：给定变更组合，返回逐条目处置与统计（paint 与测试共用） */
export function computeReconcile(args: ReconcileBoardArgs) {
  const rows: ReconcileRow[] = [];
  reconcileList(BASELINE, applyMutations(args), [], [], rows);
  // 展示顺序按当前清单固定排列：分组内子条目跟在分组行后面
  const order = [
    '312edd83',
    '8357f09b',
    '5b69b05e',
    '07c0d352',
    'e1e36558',
    '0a9ec786',
  ];
  rows.sort((left, right) => {
    const rank = (row: ReconcileRow) => {
      const index = order.indexOf(row.id);
      return index === -1 ? order.length : index;
    };
    return rank(left) - rank(right);
  });
  const counts = {
    keep: 0,
    restart: 0,
    rebuild: 0,
    create: 0,
    dispose: 0,
    note: 0,
    children: 0,
  } as Record<Verdict, number>;
  for (const row of rows) counts[row.verdict] += 1;
  const mutations = (Object.keys(MUTATION_LABELS) as (keyof ReconcileBoardArgs)[])
    .filter((key) => args[key])
    .map((key) => MUTATION_LABELS[key]);
  return { rows, counts, mutations };
}

export function createReconcileBoard(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ReconcileBoardSnapshot) => void,
): ReconcileBoardInstance {
  const drawingContext = canvas.getContext('2d')!;
  let disposed = false;

  function paint(args: ReconcileBoardArgs) {
    if (disposed) return;
    // 宽高都取舞台的实际尺寸，让条目行高自适应行数，避免画布被 CSS 拉伸
    const { width, height } = readCanvasSize(canvas);
    const { rows, counts, mutations } = computeReconcile(args);
    // 顶部两行标题下方留白给 story 外壳的 caption 浮层
    const headerHeight = 78;
    const rowHeight = Math.max(
      40,
      Math.min(54, (height - headerHeight - 14) / Math.max(rows.length, 1)),
    );
    const scale = globalThis.devicePixelRatio ?? 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    drawingContext.setTransform(scale, 0, 0, scale, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    // 头部：变更摘要（基线压低，避开 caption 浮层）
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('当前清单 → 新清单的调和决策', 48, 46);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      mutations.length
        ? `已勾选变更：${mutations.join('；')}`
        : '未勾选任何变更：整份清单 deepEqual 相等，所有条目保持',
      48,
      64,
    );

    // 逐条目卡片：第一行名称与 id，第二行处置依据，右侧是处置徽章
    rows.forEach((row, index) => {
      const y = headerHeight + index * rowHeight;
      const indent = 16 + row.depth * 28;
      const color = VERDICT_COLORS[row.verdict];

      drawingContext.strokeStyle = '#dbe3f0';
      drawingContext.lineWidth = 1;
      roundRect(drawingContext, 16, y, width - 32, rowHeight - 6, 6);
      drawingContext.stroke();
      drawingContext.fillStyle = color;
      drawingContext.fillRect(16, y + 5, 3, rowHeight - 16);

      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(row.name, indent + 10, y + 16);
      const nameWidth = drawingContext.measureText(row.name).width;
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const label = row.label ? `（${row.label}）` : '';
      drawingContext.fillText(
        `${label} id: ${row.id}`,
        indent + 10 + nameWidth + 8,
        y + 16,
      );
      // 依据行：diff 内容与处置原因
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillStyle = '#64748b';
      drawTruncated(row.basis, indent + 10, y + 30, width - indent - 150);

      drawBadge(VERDICT_LABELS[row.verdict], width - 104, y + rowHeight / 2 - 11, color);
    });

    emit({ mutations, counts });
  }

  function drawTruncated(text: string, x: number, y: number, maxWidth: number) {
    let output = text;
    if (drawingContext.measureText(output).width > maxWidth) {
      while (
        output.length > 1 &&
        drawingContext.measureText(`${output}…`).width > maxWidth
      ) {
        output = output.slice(0, -1);
      }
      output += '…';
    }
    drawingContext.fillText(output, x, y);
  }

  function drawBadge(text: string, x: number, y: number, color: string) {
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    const badgeWidth = drawingContext.measureText(text).width + 16;
    drawingContext.fillStyle = color;
    roundRect(drawingContext, x, y, badgeWidth, 22, 11);
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillText(text, x + 8, y + 15);
  }

  let lastArgs: ReconcileBoardArgs = {
    changeGain: false,
    sameValue: false,
    disableGroup: false,
    reviveHop: false,
    removeQux: false,
    renameEcho: false,
    addFlip: false,
    childConfig: false,
  };

  function wrappedUpdate(args: ReconcileBoardArgs) {
    lastArgs = args;
    paint(args);
  }

  // 初次绘制一次空变更状态，保证未操作时也有可读画面
  wrappedUpdate(lastArgs);

  const resizeObserver = createResizeObserver(canvas, () => paint(lastArgs));

  return {
    update: wrappedUpdate,
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}

function roundRect(
  target: CanvasRenderingContext2D,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  radius: number,
) {
  target.beginPath();
  target.moveTo(x + radius, y);
  target.arcTo(x + boxWidth, y, x + boxWidth, y + boxHeight, radius);
  target.arcTo(x + boxWidth, y + boxHeight, x, y + boxHeight, radius);
  target.arcTo(x, y + boxHeight, x, y, radius);
  target.arcTo(x, y, x + boxWidth, y, radius);
  target.closePath();
}
