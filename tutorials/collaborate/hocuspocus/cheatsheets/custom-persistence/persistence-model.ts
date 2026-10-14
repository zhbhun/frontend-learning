/**
 * 范例介绍：用真实 Y.Doc 复现自定义持久化的两种落库模型——增量 update 日志与全量快照。
 * 前置状态：一份扮演「服务器房间文档」的 Y.Doc（真实部署中它由 Hocuspocus 按 name 缓存），
 * 以及两个模拟存储：增量日志（每次编辑追加一条 update）与快照存储（encodeStateAsUpdate
 * 覆盖写同一份记录）。
 * 操作：实例一修改「编辑文本」触发一次编辑事务，观察两个存储各自写入的内容与体量；
 * 实例二选择「恢复方式」（原序逐条 / 乱序逐条 / 重复注入 / mergeUpdates 合并 / 快照单条），
 * 把增量日志恢复成一份新 Y.Doc。
 * 预期结果：两种存储都能恢复出与当前文本一致的内容；增量日志条数随编辑增长、快照始终
 * 只有最新一份；乱序、重复、合并后的恢复内容与原文一致。
 * 阅读主线：applyEdit 的事务 → update 事件里的两条写路径（对应 onChange 追加与
 * onStoreDocument 覆盖写）→ restoreFromLog 的逐条 / 合并应用 → 读数与画面核对。
 * 与真实链路的差异：真实部署中 onChange / onStoreDocument 由 Hocuspocus 服务器按事务与
 * debounce 触发，存储是数据库或对象存储；这里把触发简化为同步调用、存储简化为内存数组，
 * update 的编码、应用与合并逻辑与真实持久化完全一致。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_BODY = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

/** 编辑会话：扮演服务器内存里的一份 Y.Doc，并把每次事务喂给两种模拟存储。 */
class EditSession {
  /** 服务器房间文档。 */
  readonly doc = new Y.Doc();

  /** 增量存储：按到达顺序追加的 update 日志。 */
  readonly updateLog: Uint8Array[] = [];

  /** 快照存储：永远只有最新一份合并状态，模拟覆盖写。 */
  snapshotState: Uint8Array = new Uint8Array();

  /** 快照存储被覆盖写的次数。 */
  snapshotWrites = 0;

  constructor() {
    // 对应服务器 Document 内部 onUpdate 回调驱动的两条落库路径：
    // 增量模式在 onChange 里逐条追加；快照模式在 onStoreDocument 里写 encodeStateAsUpdate。
    // 真实服务器对第二条路径按 debounce/maxDebounce 节流；这里每次编辑都写以对比数据体量。
    this.doc.on('update', (update: Uint8Array) => {
      this.updateLog.push(update);
      this.snapshotState = Y.encodeStateAsUpdate(this.doc);
      this.snapshotWrites += 1;
    });
  }

  /** 整段重写文本：放在同一个事务里，产生恰好一条增量 update。 */
  applyEdit(text: string): void {
    this.doc.transact(() => {
      const ytext = this.doc.getText('demo');
      ytext.delete(0, ytext.length);
      if (text.length > 0) {
        ytext.insert(0, text);
      }
    });
  }

  get text(): string {
    return this.doc.getText('demo').toString();
  }

  get logBytes(): number {
    return this.updateLog.reduce((total, update) => total + update.length, 0);
  }

  destroy(): void {
    this.doc.destroy();
  }
}

/** 把一批 update 恢复成一份新 Y.Doc：逐条应用，对应 onLoadDocument 的读路径。 */
function restoreFromLog(updates: Uint8Array[]): Y.Doc {
  const doc = new Y.Doc();
  for (const update of updates) {
    Y.applyUpdate(doc, update);
  }
  return doc;
}

/** 恢复演练后立即销毁临时文档，返回其中的文本。 */
function restoredText(updates: Uint8Array[]): string {
  const doc = restoreFromLog(updates);
  const text = doc.getText('demo').toString();
  doc.destroy();
  return text;
}

export interface WritePathsOptions {
  /** 编辑文本：每次变化触发一次编辑事务。 */
  text: string;
}

export interface WritePathsSnapshot {
  text: string;
  edits: number;
  logEntries: number;
  logBytes: number;
  snapshotWrites: number;
  snapshotBytes: number;
  incrementalRestored: string;
  snapshotRestored: string;
}

export interface PersistenceModelInstance<Options> {
  update(options: Options): void;
  dispose(): void;
}

export function createWritePaths(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WritePathsSnapshot) => void,
): PersistenceModelInstance<WritePathsOptions> {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const session = new EditSession();
  let appliedText = '';

  function currentSnapshot(): WritePathsSnapshot {
    return {
      text: session.text,
      edits: session.snapshotWrites,
      logEntries: session.updateLog.length,
      logBytes: session.logBytes,
      snapshotWrites: session.snapshotWrites,
      snapshotBytes: session.snapshotState.length,
      incrementalRestored: restoredText(session.updateLog),
      snapshotRestored: restoredText([session.snapshotState]),
    };
  }

  function draw(data: WritePathsSnapshot): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 24;
    const docPanelWidth = 150;
    const docPanelTop = 56;
    const docPanelHeight = height - docPanelTop - 46;

    drawPanel(
      drawingContext,
      margin,
      docPanelTop,
      docPanelWidth,
      docPanelHeight,
      '服务器文档',
      session.text,
    );

    const storeLeft = margin + docPanelWidth + 24;
    const storeTop = 30;
    const storeWidth = width - storeLeft - margin;
    const incrementalHeight = Math.round((height - storeTop - 62) / 2);
    const snapshotTop = storeTop + incrementalHeight + 16;
    const snapshotHeight = height - snapshotTop - 46;

    // 增量存储：一条 update 一个条块，条数随编辑增长。
    drawPanel(
      drawingContext,
      storeLeft,
      storeTop,
      storeWidth,
      incrementalHeight,
      '增量 update 日志',
      '',
    );
    const slotWidth = 52;
    const maxSlots = Math.max(
      1,
      Math.floor((storeWidth - 28) / slotWidth),
    );
    const shown = Math.min(session.updateLog.length, maxSlots);
    for (let index = 0; index < shown; index += 1) {
      const update = session.updateLog[index];
      drawBlock(
        drawingContext,
        storeLeft + 14 + index * slotWidth,
        storeTop + 46,
        slotWidth - 10,
        22,
        `u${index + 1}·${update.length}B`,
        '#eef2ff',
        '#c7d2fe',
        '#3f4dbf',
      );
    }
    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(
      `${session.updateLog.length} 条追加，只增不改 · 累计 ${data.logBytes} 字节`,
      storeLeft + 14,
      storeTop + incrementalHeight - 12,
    );

    // 快照存储：同一份记录被反复覆盖，只保留最新状态。
    drawPanel(
      drawingContext,
      storeLeft,
      snapshotTop,
      storeWidth,
      snapshotHeight,
      '全量快照（一行覆盖）',
      '',
    );
    drawBlock(
      drawingContext,
      storeLeft + 14,
      snapshotTop + 46,
      Math.min(180, storeWidth - 28),
      22,
      `最新快照 ${data.snapshotBytes}B`,
      '#ecfdf5',
      '#a7f3d0',
      '#065f46',
    );
    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(
      `第 ${data.snapshotWrites} 次覆盖写入 · ${data.logEntries} 次编辑共享这一份`,
      storeLeft + 14,
      snapshotTop + snapshotHeight - 12,
    );

    const consistent =
      data.incrementalRestored === data.text &&
      data.snapshotRestored === data.text;
    const footer = consistent
      ? '两种存储恢复出的内容均与当前文本一致'
      : '恢复内容与当前文本不一致';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillStyle = consistent ? '#166534' : '#9a3412';
    drawingContext.fillText(
      footer,
      (width - drawingContext.measureText(footer).width) / 2,
      height - 16,
    );
  }

  const resizeObserver = createResizeObserver(canvas, () =>
    draw(currentSnapshot()),
  );

  return {
    update(options) {
      if (options.text !== appliedText) {
        appliedText = options.text;
        session.applyEdit(appliedText);
      }
      const data = currentSnapshot();
      draw(data);
      emit(data);
    },
    dispose() {
      session.destroy();
      resizeObserver.disconnect();
    },
  };
}

/** 恢复策略：同样的增量日志，不同的读法。 */
export type RestoreStrategy =
  | 'in-order'
  | 'shuffled'
  | 'duplicated'
  | 'merged'
  | 'snapshot';

export const RESTORE_STRATEGY_LABELS: Record<RestoreStrategy, string> = {
  'in-order': '原序逐条',
  shuffled: '乱序逐条',
  duplicated: '重复注入',
  merged: 'mergeUpdates 合并',
  snapshot: '快照单条',
};

export interface RestoreOptions {
  /** 编辑文本：切成至多 4 段，每段一次编辑事务，构成增量日志。 */
  text: string;
  /** 恢复方式。 */
  strategy: RestoreStrategy;
}

export interface RestoreSnapshot {
  strategy: RestoreStrategy;
  logEntries: number;
  logBytes: number;
  /** 恢复时实际应用到新 Y.Doc 的 update 条数。 */
  appliedCount: number;
  /** 恢复输入的总字节数。 */
  appliedBytes: number;
  restored: string;
  matches: boolean;
}

/** 固定乱序表：按日志长度取前 n 项，保证示例可复现。 */
const SHUFFLED_ORDERS: Record<number, number[]> = {
  1: [0],
  2: [1, 0],
  3: [2, 0, 1],
  4: [2, 3, 0, 1],
};

/** 把文本切成至多 segments 段，返回逐步增长的编辑脚本（第 i 次编辑写入前缀）。 */
function buildEditScript(text: string, segments: number): string[] {
  const chars = Array.from(text);
  if (chars.length === 0) {
    return [''];
  }
  const edits: string[] = [];
  for (let index = segments; index >= 1; index -= 1) {
    const take = Math.max(1, Math.ceil((chars.length * index) / segments));
    edits.push(chars.slice(0, take).join(''));
  }
  return edits.reverse();
}

interface RestorePlan {
  applied: Uint8Array[];
  order: Array<{ index: number; duplicate: boolean }>;
}

/** 按策略把日志展开成「应用到新 Y.Doc 的 update 序列」。 */
function planStrategy(
  session: EditSession,
  strategy: RestoreStrategy,
): RestorePlan {
  const log = session.updateLog;
  const count = log.length;

  if (count === 0) {
    return { applied: [], order: [] };
  }

  if (strategy === 'merged') {
    return {
      applied: [Y.mergeUpdates(log)],
      order: [{ index: -1, duplicate: false }],
    };
  }

  if (strategy === 'snapshot') {
    return {
      applied: [session.snapshotState],
      order: [{ index: -2, duplicate: false }],
    };
  }

  let order = Array.from({ length: count }, (_, index) => ({
    index,
    duplicate: false,
  }));

  if (strategy === 'shuffled') {
    const permutation =
      SHUFFLED_ORDERS[Math.min(4, Math.max(1, count))] ??
      Array.from({ length: count }, (_, index) => index);
    order = permutation.map((index) => ({ index, duplicate: false }));
  }

  if (strategy === 'duplicated') {
    const repeatIndex = Math.min(1, count - 1);
    order = [
      ...order,
      { index: repeatIndex, duplicate: true },
      { index: repeatIndex, duplicate: true },
      { index: repeatIndex, duplicate: true },
    ];
  }

  return { applied: order.map((entry) => log[entry.index]), order };
}

export function createRestoreModel(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RestoreSnapshot) => void,
): PersistenceModelInstance<RestoreOptions> {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: RestoreOptions = { text: '', strategy: 'in-order' };

  function buildSession(text: string): EditSession {
    const session = new EditSession();
    for (const edit of buildEditScript(text, 4)) {
      session.applyEdit(edit);
    }
    return session;
  }

  function currentSnapshot(): RestoreSnapshot {
    const session = buildSession(options.text);
    try {
      const { applied } = planStrategy(session, options.strategy);
      const restored = restoredText(applied);

      return {
        strategy: options.strategy,
        logEntries: session.updateLog.length,
        logBytes: session.logBytes,
        appliedCount: applied.length,
        appliedBytes: applied.reduce(
          (total, update) => total + update.length,
          0,
        ),
        restored,
        matches: restored === options.text,
      };
    } finally {
      session.destroy();
    }
  }

  function draw(): void {
    const session = buildSession(options.text);
    try {
      const plan = planStrategy(session, options.strategy);
      const size = readCanvasSize(canvas);
      const width = Math.max(360, size.width);
      const height = Math.max(300, size.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawingContext.clearRect(0, 0, width, height);

      const margin = 24;
      const panelWidth = width - margin * 2;
      const logTop = 30;
      const logHeight = Math.round((height - 76) * 0.32);
      const bandTop = logTop + logHeight + 14;
      const bandHeight = 58;
      const resultTop = bandTop + bandHeight + 14;
      const resultHeight = height - resultTop - 46;

      // 增量日志：待恢复的全部 update。
      drawPanel(
        drawingContext,
        margin,
        logTop,
        panelWidth,
        logHeight,
        '增量 update 日志',
        '',
      );
      const slotWidth = 56;
      const logCount = session.updateLog.length;
      const maxSlots = Math.max(1, Math.floor((panelWidth - 28) / slotWidth));
      const shown = Math.min(logCount, maxSlots);
      for (let index = 0; index < shown; index += 1) {
        const update = session.updateLog[index];
        drawBlock(
          drawingContext,
          margin + 14 + index * slotWidth,
          logTop + 42,
          slotWidth - 10,
          22,
          `u${index + 1}·${update.length}B`,
          '#eef2ff',
          '#c7d2fe',
          '#3f4dbf',
        );
      }
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#64748b';
      drawingContext.fillText(
        `日志共 ${logCount} 条 · ${session.logBytes} 字节`,
        margin + 14,
        logTop + logHeight - 10,
      );
      const note =
        options.strategy === 'merged'
          ? '恢复前先合并：Y.mergeUpdates(日志) → 1 条'
          : options.strategy === 'snapshot'
            ? '改读快照存储：整份文档状态 1 条'
            : '逐条应用：Y.applyUpdate(空文档, update)';
      drawingContext.fillText(note, margin + 170, logTop + logHeight - 10);

      // 应用顺序带：编号即应用次序；重复注入的条目画成虚线块。
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#334155';
      drawingContext.fillText('恢复时的应用顺序', margin + 2, bandTop + 14);
      const bandSlot = Math.min(
        76,
        Math.floor((panelWidth - 90) / Math.max(1, plan.order.length)),
      );
      plan.order.forEach((entry, position) => {
        const label =
          entry.index === -1
            ? '合并'
            : entry.index === -2
              ? '快照'
              : `u${entry.index + 1}`;
        drawBlock(
          drawingContext,
          margin + 88 + position * bandSlot,
          bandTop,
          bandSlot - 8,
          22,
          `${position + 1}·${label}`,
          entry.duplicate ? '#fff7ed' : '#f1f5f9',
          entry.duplicate ? '#fed7aa' : '#cbd5e1',
          entry.duplicate ? '#9a3412' : '#334155',
          entry.duplicate,
        );
      });

      // 恢复结果：任何策略都应还原出同一份内容。
      drawPanel(
        drawingContext,
        margin,
        resultTop,
        panelWidth,
        resultHeight,
        '恢复结果（新 Y.Doc）',
        options.text,
      );

      const matches = restoredText(plan.applied) === options.text;
      const footer =
        options.text !== '' && plan.order.length > 0
          ? `${RESTORE_STRATEGY_LABELS[options.strategy]}：应用 ${plan.order.length} 条，内容${
              matches ? '与原文一致' : '与原文不一致'
            }`
          : '输入文本后观察各策略的恢复结果';
      drawingContext.font = FONT_TITLE;
      drawingContext.fillStyle =
        options.text !== '' && matches ? '#166534' : '#64748b';
      drawingContext.fillText(
        footer,
        (width - drawingContext.measureText(footer).width) / 2,
        height - 16,
      );
    } finally {
      session.destroy();
    }
  }

  const resizeObserver = createResizeObserver(canvas, () => draw());

  return {
    update(next) {
      options = { ...next };
      draw();
      emit(currentSnapshot());
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}

// ---------- 以下为绘制外壳：说明性视图，无动画循环 ----------

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body: string,
): void {
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#dbe3f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#172033';
  ctx.font = FONT_TITLE;
  ctx.fillText(title, x + 14, y + 26);

  ctx.strokeStyle = '#edf1f8';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 38);
  ctx.lineTo(x + w - 10, y + 38);
  ctx.stroke();

  if (!body) {
    return;
  }

  const maxLines = Math.max(1, Math.floor((h - 66) / 20));
  ctx.font = FONT_BODY;
  const lines = wrapText(ctx, body, w - 28, maxLines);
  if (lines.length === 0) {
    ctx.font = FONT_LABEL;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('（空文档）', x + 14, y + 62);
    return;
  }
  ctx.fillStyle = '#334155';
  lines.forEach((line, index) => {
    ctx.fillText(line, x + 14, y + 60 + index * 20);
  });
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fill: string,
  stroke: string,
  textColor: string,
  dashed = false,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  if (dashed) {
    ctx.setLineDash([4, 3]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = textColor;
  ctx.font = FONT_LABEL;
  ctx.fillText(label, x + 6, y + h / 2 + 4);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of Array.from(text)) {
    const candidate = current + char;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = char;
      if (lines.length >= maxLines) {
        return lines;
      }
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}
