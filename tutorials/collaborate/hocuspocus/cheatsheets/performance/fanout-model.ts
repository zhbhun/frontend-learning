/**
 * 范例介绍：用真实 Y.Doc 复现「性能与内存」一课的核心链路——一次编辑产生的 update
 * 如何被广播、如何被防抖落库，成本读数逐项可核对。
 * 前置状态：一份扮演「客户端编辑器」的 Y.Doc，N 个同房间连接；服务器广播与落库行为
 * 按 Hocuspocus v4 源码语义建模（广播给房间内全部连接、debounce 2000 / maxDebounce 10000）。
 * 操作：调整「编辑文本」「客户端连接数」「编辑粒度」（逐字符事务 / 整段一个事务），
 * 每次调整重放一次完整演示。
 * 预期结果：逐字符事务时 update 条数等于字符数、广播 send 次数等于条数 × 连接数；
 * 整段一个事务时两者都收敛为 1；落库次数由防抖决定，与 update 条数无关；恢复出的
 * 文本与输入一致。把文本加长到打字时间轴超过 10 秒（约 51 个字符起），可看到
 * maxDebounce 封顶出现第二次落库。
 * 阅读主线：runEdit 的事务粒度 → update 时间轴与逻辑时刻 → simulateStoreDebounce 的
 * 防抖调度 → encodeStateAsUpdate 快照与恢复核对 → 读数与画面。
 * 与真实链路的差异：真实部署中广播由服务器 Document 逐连接发送、防抖计时器跑在
 * Node 进程里；这里在浏览器内用逻辑时间轴模拟调度时刻，Yjs 的事务、update 编码、
 * 快照与恢复逻辑与真实服务器完全一致。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 服务器落库防抖参数：与 v4 默认值一致（见 Server 配置一课参考表）。 */
const SERVER_DEBOUNCE = 2000;
const SERVER_MAX_DEBOUNCE = 10000;

/** 逐字符模式的打字节奏：每字符间隔 200 逻辑毫秒，模拟连续输入。 */
const CHAR_INTERVAL = 200;

export type Granularity = 'per-char' | 'batched';

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  'per-char': '逐字符事务',
  batched: '整段一个事务',
};

export interface FanoutOptions {
  /** 编辑文本：本次演示写入的全部内容。 */
  text: string;
  /** 同房间连接数（含发起编辑的客户端），决定广播扇出倍数。 */
  clients: number;
  /** 编辑粒度：每个字符一个事务，还是整段合并进一个事务。 */
  granularity: Granularity;
}

export interface FanoutSnapshot {
  text: string;
  clients: number;
  granularity: Granularity;
  /** 客户端 → 服务器 的 update 条数。 */
  updates: number;
  updateBytes: number;
  /** 服务器 → 各连接的广播 send 次数 = update 条数 × 连接数（v4 含发送者回声）。 */
  sends: number;
  /** 防抖后的落库次数与各次逻辑时刻。 */
  stores: number;
  storeTimes: number[];
  /** 最后一次落库的全量快照大小（encodeStateAsUpdate 产物）。 */
  snapshotBytes: number;
  /** 用最后一次快照恢复出的文本，用于核对落库内容。 */
  restored: string;
  /** 每条 update 的到达逻辑时刻与字节，用于画时间轴。 */
  timeline: Array<{ t: number; bytes: number }>;
}

export interface FanoutInstance {
  update(options: FanoutOptions): void;
  dispose(): void;
}

/**
 * 产生编辑事务：逐字符模式每个字符一个事务（每个字符一条 update）；
 * 整段模式把全部改动放进一个 transact（整段只产生一条 update）。
 * 事务粒度就是 update 粒度——这是客户端侧控制广播成本的位置。
 */
function runEdit(doc: Y.Doc, text: string, granularity: Granularity): void {
  const ytext = doc.getText('demo');
  if (granularity === 'batched') {
    doc.transact(() => {
      if (text.length > 0) {
        ytext.insert(0, text);
      }
    });
    return;
  }
  Array.from(text).forEach((char, index) => {
    doc.transact(() => {
      ytext.insert(index, char);
    });
  });
}

/**
 * 按 v4 服务器 util/debounce.ts 的算法模拟落库调度：
 * 每条新 update 重置 debounce 计时器；待存时间已达 maxDebounce 时立即落库；
 * 静默后计时器到点落库。返回各次落库的逻辑时刻。
 */
function simulateStoreDebounce(timeline: Array<{ t: number }>): number[] {
  let pending: { start: number; due: number } | null = null;
  const storeTimes: number[] = [];

  for (const { t } of timeline) {
    if (pending === null) {
      pending = { start: t, due: t + SERVER_DEBOUNCE };
      continue;
    }
    if (t - pending.start >= SERVER_MAX_DEBOUNCE) {
      // maxDebounce 封顶：到点立即落库，随后按新起点重新防抖
      storeTimes.push(t);
      pending = { start: t, due: t + SERVER_DEBOUNCE };
    } else {
      // debounce：每次新变更重置计时器
      pending.due = t + SERVER_DEBOUNCE;
    }
  }
  if (pending !== null) {
    storeTimes.push(pending.due);
  }
  return storeTimes;
}

function simulate(options: FanoutOptions): FanoutSnapshot {
  const doc = new Y.Doc();
  try {
    const updates: Uint8Array[] = [];
    doc.on('update', (update: Uint8Array) => {
      updates.push(update);
    });

    runEdit(doc, options.text, options.granularity);

    // 逻辑时间轴：逐字符按打字节奏排开，整段事务发生在 t=0
    const timeline = updates.map((update, index) => ({
      t:
        options.granularity === 'per-char'
          ? index * CHAR_INTERVAL
          : 0,
      bytes: update.length,
    }));

    const storeTimes = simulateStoreDebounce(timeline);
    const snapshotBytes = options.text.length > 0 ? Y.encodeStateAsUpdate(doc).length : 0;

    // 恢复演练：把最后一次快照应用进新 Y.Doc，核对落库内容
    let restored = '';
    if (storeTimes.length > 0) {
      const restoredDoc = new Y.Doc();
      try {
        Y.applyUpdate(restoredDoc, Y.encodeStateAsUpdate(doc));
        restored = restoredDoc.getText('demo').toString();
      } finally {
        restoredDoc.destroy();
      }
    }

    return {
      text: options.text,
      clients: options.clients,
      granularity: options.granularity,
      updates: updates.length,
      updateBytes: updates.reduce((total, update) => total + update.length, 0),
      sends: updates.length * options.clients,
      stores: storeTimes.length,
      storeTimes,
      snapshotBytes,
      restored,
      timeline,
    };
  } finally {
    doc.destroy();
  }
}

const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_BODY = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

export function createFanoutModel(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FanoutSnapshot) => void,
): FanoutInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: FanoutOptions = {
    text: '一次编辑的成本花在这里',
    clients: 4,
    granularity: 'per-char',
  };

  function draw(): void {
    const data = simulate(options);
    const size = readCanvasSize(canvas);
    const width = Math.max(380, size.width);
    const height = Math.max(330, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 20;
    const panelWidth = width - margin * 2;
    const editTop = 44;
    const editHeight = 78;
    const wireTop = editTop + editHeight + 14;
    const wireHeight = 96;
    const storeTop = wireTop + wireHeight + 14;
    const storeHeight = 74;

    // 面板一：客户端编辑会话（输入与粒度）
    drawPanel(
      drawingContext,
      margin,
      editTop,
      panelWidth,
      editHeight,
      `编辑会话 · ${GRANULARITY_LABELS[data.granularity]} · ${data.clients} 个连接`,
      data.text,
    );

    // 面板二：update 时间轴（客户端 → 服务器），每条 update 广播给全部连接
    drawPanel(
      drawingContext,
      margin,
      wireTop,
      panelWidth,
      wireHeight,
      'update 时间轴（客户端 → 服务器，每条广播给全部连接）',
      '',
    );
    if (data.timeline.length === 0) {
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText('（无编辑事务）', margin + 14, wireTop + 62);
    } else {
      const slotWidth = Math.min(
        56,
        Math.floor((panelWidth - 28) / data.timeline.length),
      );
      data.timeline.forEach((entry, index) => {
        drawBlock(
          drawingContext,
          margin + 14 + index * slotWidth,
          wireTop + 42,
          Math.max(2, slotWidth - 4),
          22,
          slotWidth >= 30 ? `u${index + 1}` : '',
          '#eef2ff',
          '#c7d2fe',
          '#3f4dbf',
        );
      });
    }
    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(
      `${data.updates} 条 · ${data.updateBytes} 字节 → 广播 ${data.sends} 次 send（条数 × ${data.clients} 连接，含发送者回声）`,
      margin + 14,
      wireTop + wireHeight - 10,
    );

    // 面板三：防抖落库（服务器 → 存储），落库次数与 update 条数无关
    drawPanel(
      drawingContext,
      margin,
      storeTop,
      panelWidth,
      storeHeight,
      '防抖落库（服务器 → 存储）',
      '',
    );
    if (data.storeTimes.length === 0) {
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText('（无落库）', margin + 14, storeTop + 52);
    } else {
      const slotWidth = Math.min(
        120,
        Math.floor((panelWidth - 28) / data.storeTimes.length),
      );
      data.storeTimes.forEach((time, index) => {
        drawBlock(
          drawingContext,
          margin + 14 + index * slotWidth,
          storeTop + 40,
          Math.max(2, slotWidth - 8),
          22,
          `s${index + 1}·${(time / 1000).toFixed(1)}s`,
          '#ecfdf5',
          '#a7f3d0',
          '#065f46',
        );
      });
    }
    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = '#64748b';
    drawingContext.fillText(
      `debounce ${SERVER_DEBOUNCE}ms / maxDebounce ${SERVER_MAX_DEBOUNCE}ms · 快照 ${data.snapshotBytes} 字节（全量）`,
      margin + 14,
      storeTop + storeHeight - 10,
    );

    const matches = data.restored === data.text;
    const footer =
      data.stores > 0
        ? `落库 ${data.stores} 次与 update 条数无关 · 快照恢复${matches ? '与原文一致' : '与原文不一致'}`
        : '输入文本后观察 update 条数、广播次数与落库次数';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillStyle = data.stores > 0 && matches ? '#166534' : '#64748b';
    drawingContext.fillText(
      footer,
      (width - drawingContext.measureText(footer).width) / 2,
      height - 14,
    );

    emit(data);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      options = { ...next };
      draw();
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
  ctx.fillText(title, x + 14, y + 24);

  ctx.strokeStyle = '#edf1f8';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 34);
  ctx.lineTo(x + w - 10, y + 34);
  ctx.stroke();

  if (!body) {
    return;
  }

  const maxLines = Math.max(1, Math.floor((h - 52) / 20));
  ctx.font = FONT_BODY;
  const lines = wrapText(ctx, body, w - 28, maxLines);
  if (lines.length === 0) {
    ctx.font = FONT_LABEL;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('（空文档）', x + 14, y + 56);
    return;
  }
  ctx.fillStyle = '#334155';
  lines.forEach((line, index) => {
    ctx.fillText(line, x + 14, y + 56 + index * 20);
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
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
  if (label) {
    ctx.fillStyle = textColor;
    ctx.font = FONT_LABEL;
    ctx.fillText(label, x + 4, y + h / 2 + 4);
  }
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
