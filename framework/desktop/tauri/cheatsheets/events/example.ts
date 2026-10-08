/**
 * 范例介绍:模拟一次事件投递——发射端把「事件名 + payload」投上事件总线,总线按投递目标过滤,
 *   各监听者按注册时声明的 target 决定收不收。
 * 输入:发送方(前端 emit 广播 / 前端 emitTo 定向 settings / Rust app.emit 广播 / Rust app.emit_to 定向 main)
 *   与所关注监听(六种常见注册方式之一)。
 * 主要操作:切换发送方后,圆点沿「发射端 → 事件总线」移动,随后各监听行逐个结算:
 *   收到的行亮起并画出连线,未收到的行保持灰色无连线;所关注行带高亮标题。
 * 预期结果:广播时六个监听全部收到;emitTo('settings') 只有 settings 的命名空间监听与 Rust listen_any 收到;
 *   emit_to("main") 时 main 的三个监听与 listen_any 收到,Rust app.listen(target 为 App)收不到定向投递。
 * 阅读主线:投递结果 = 发射端的投递目标 × 监听端注册时的 target;发射端在前端还是 Rust 不影响这条规则。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EmitterVariant =
  | 'frontend-emit'
  | 'frontend-emit-to'
  | 'rust-emit'
  | 'rust-emit-to';

export type FocusVariant =
  | 'main-namespace'
  | 'main-target'
  | 'main-instance'
  | 'settings-namespace'
  | 'rust-listen'
  | 'rust-listen-any';

export interface ExampleArgs {
  emitter: EmitterVariant;
  focus: FocusVariant;
}

export interface ExampleSnapshot {
  /** 读数:发送方(端别 + 发射方式)。 */
  emitterLabel: string;
  /** 读数:投递范围。 */
  deliveryScope: string;
  /** 读数:收到本次投递的监听(数量 + 短名)。 */
  receivedSummary: string;
  /** 读数:所关注监听是否收到。 */
  focusResult: string;
}

interface ListenerRow {
  key: FocusVariant;
  /** 行标题:注册调用。 */
  title: string;
  /** 第二行:所属端与监听 target。 */
  target: string;
  /** 「收到的监听」摘要中使用的短名。 */
  shortName: string;
}

/* 六种常见注册方式(对应正文「投递规则」一节的核对点)。 */
const ROWS: ListenerRow[] = [
  {
    key: 'main-namespace',
    title: "listen('ping')",
    target: 'main 窗口 · target: Any',
    shortName: 'main·listen',
  },
  {
    key: 'main-target',
    title: "listen('ping', {…})",
    target: "main 窗口 · target: 'main'",
    shortName: 'main·target',
  },
  {
    key: 'main-instance',
    title: "实例 listen('ping')",
    target: 'target: WebviewWindow{ main }',
    shortName: 'main·实例',
  },
  {
    key: 'settings-namespace',
    title: "listen('ping')",
    target: 'settings 窗口 · target: Any',
    shortName: 'settings·listen',
  },
  {
    key: 'rust-listen',
    title: "app.listen('ping')",
    target: 'Rust · target: App',
    shortName: 'app.listen',
  },
  {
    key: 'rust-listen-any',
    title: "app.listen_any('ping')",
    target: 'Rust · target: Any',
    shortName: 'listen_any',
  },
];

interface EmitterPreset {
  label: string;
  /** 发射端绘制身份。 */
  side: string;
  codeLines: string[];
  scope: string;
  /** 总线下方的过滤标签。 */
  filterLabel: string;
  receivers: FocusVariant[];
}

const ALL_KEYS: FocusVariant[] = ROWS.map((row) => row.key);

/* 四种发送方与各自的投递范围(投递语义与官方 Emitter / event API 文档一致)。 */
const EMITTERS: Record<EmitterVariant, EmitterPreset> = {
  'frontend-emit': {
    label: '前端 emit(广播)',
    side: '前端 · main 窗口',
    codeLines: ["await emit('ping', { tick: 3 })"],
    scope: '所有目标(广播)',
    filterLabel: '不过滤:所有 target',
    receivers: [...ALL_KEYS],
  },
  'frontend-emit-to': {
    label: "前端 emitTo('settings')",
    side: '前端 · main 窗口',
    codeLines: ["await emitTo('settings', 'ping',", '    { tick: 3 })'],
    scope: 'label 为 settings 的目标',
    filterLabel: 'AnyLabel{ settings }',
    receivers: ['settings-namespace', 'rust-listen-any'],
  },
  'rust-emit': {
    label: 'Rust app.emit(广播)',
    side: 'Rust · AppHandle',
    codeLines: ['app.emit("ping", { tick: 3 })?;'],
    scope: '所有目标(广播)',
    filterLabel: '不过滤:所有 target',
    receivers: [...ALL_KEYS],
  },
  'rust-emit-to': {
    label: 'Rust app.emit_to("main")',
    side: 'Rust · AppHandle',
    codeLines: ['app.emit_to("main", "ping",', '    { tick: 3 })?;'],
    scope: 'label 为 main 的目标',
    filterLabel: 'AnyLabel{ main }',
    receivers: ['main-namespace', 'main-target', 'main-instance', 'rust-listen-any'],
  },
};

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#cbd5e1';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const PENDING = '#b45309';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

/* 投递动画:圆点从发射端走到总线 LINK_MS,之后各监听行按间隔逐个结算。 */
const LINK_MS = 380;
const ROW_STAGGER_MS = 60;
const TOTAL_MS = LINK_MS + ROWS.length * ROW_STAGGER_MS + 140;

const CANVAS_W = 700;
const CANVAS_H = 400;

/* 布局:发射端(左)→ 事件总线(中)→ 监听行(右)。 */
const SENDER_X = 24;
const SENDER_Y = 72;
const SENDER_W = 200;
const SENDER_H = 64;
const BUS_X = 268;
const BUS_W = 156;
const BUS_H = 64;
const FILTER_Y = 150;
const FILTER_H = 26;
const ROWS_X = 456;
const ROWS_TOP = 48;
const ROW_H = 44;
const ROW_GAP = 10;
const ARROW_Y = SENDER_Y + SENDER_H / 2;

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleArgs = { emitter: 'frontend-emit', focus: 'main-instance' };
  let startedAt = 0;
  let rafId = 0;

  function cancelAnimation(): void {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function arrow(fromX: number, toX: number, y: number, color: string): void {
    drawingContext.strokeStyle = color;
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, y);
    drawingContext.lineTo(toX - 6, y);
    drawingContext.stroke();
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    drawingContext.moveTo(toX, y);
    drawingContext.lineTo(toX - 7, y - 4);
    drawingContext.lineTo(toX - 7, y + 4);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(CANVAS_W, size.width);
    const height = Math.max(CANVAS_H, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const preset = EMITTERS[current.emitter];
    const focusRow = ROWS.find((row) => row.key === current.focus) ?? ROWS[0];
    const elapsed = startedAt === 0 ? TOTAL_MS : performance.now() - startedAt;
    const settled = (index: number) =>
      startedAt === 0 || elapsed >= LINK_MS + index * ROW_STAGGER_MS;
    const received = new Set(preset.receivers);

    // 顶部:本次演示共用的事件名与 payload。
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      "监听的事件名:'ping'    payload:{ tick: 3 }",
      SENDER_X,
      26,
    );

    // 左:发射端。
    drawingContext.fillStyle = BOX_BG;
    roundRect(SENDER_X, SENDER_Y, SENDER_W, SENDER_H, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = BOX_BORDER;
    drawingContext.stroke();
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('发射端', SENDER_X + 12, SENDER_Y + 22);
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(preset.side, SENDER_X + 12, SENDER_Y + 45);

    drawingContext.fillStyle = TEXT;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    preset.codeLines.forEach((line, index) => {
      drawingContext.fillText(
        line,
        SENDER_X,
        SENDER_Y + SENDER_H + 22 + index * 17,
      );
    });

    // 中:事件总线 + 本次投递的过滤条件。
    arrow(SENDER_X + SENDER_W, BUS_X, ARROW_Y, PALE);
    drawingContext.fillStyle = BOX_BG;
    roundRect(BUS_X, SENDER_Y, BUS_W, BUS_H, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = BOX_BORDER;
    drawingContext.stroke();
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('事件总线', BUS_X + 14, SENDER_Y + 26);
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText("'ping'", BUS_X + 14, SENDER_Y + 46);

    drawingContext.fillStyle = '#f1f5f9';
    roundRect(BUS_X, FILTER_Y, BUS_W, FILTER_H, 5);
    drawingContext.fill();
    drawingContext.fillStyle = DIM;
    drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(preset.filterLabel, BUS_X + 10, FILTER_Y + 17);

    // 右:监听行。投递中显示「…」,结算后收到的行画连线并亮起。
    const rowW = width - ROWS_X - 20;
    ROWS.forEach((row, index) => {
      const rowY = ROWS_TOP + index * (ROW_H + ROW_GAP);
      const isReceiver = received.has(row.key);
      const isFocus = row.key === current.focus;
      const rowSettled = settled(index);

      if (isReceiver) {
        drawingContext.strokeStyle = rowSettled ? ACCENT : PALE;
        drawingContext.beginPath();
        drawingContext.moveTo(BUS_X + BUS_W, ARROW_Y);
        drawingContext.lineTo(ROWS_X - 6, rowY + ROW_H / 2);
        drawingContext.stroke();
        if (rowSettled) {
          drawingContext.fillStyle = ACCENT;
          drawingContext.beginPath();
          drawingContext.moveTo(ROWS_X, rowY + ROW_H / 2);
          drawingContext.lineTo(ROWS_X - 7, rowY + ROW_H / 2 - 4);
          drawingContext.lineTo(ROWS_X - 7, rowY + ROW_H / 2 + 4);
          drawingContext.closePath();
          drawingContext.fill();
        }
      }

      drawingContext.fillStyle = BOX_BG;
      roundRect(ROWS_X, rowY, rowW, ROW_H, 6);
      drawingContext.fill();
      drawingContext.strokeStyle = isFocus ? ACCENT : BOX_BORDER;
      drawingContext.lineWidth = isFocus ? 1.5 : 1;
      drawingContext.stroke();
      drawingContext.lineWidth = 1;

      drawingContext.fillStyle = isFocus ? ACCENT : TEXT;
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(row.title, ROWS_X + 12, rowY + 19);

      drawingContext.fillStyle = DIM;
      drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(row.target, ROWS_X + 12, rowY + 35);

      drawingContext.textAlign = 'right';
      if (!rowSettled) {
        drawingContext.fillStyle = PENDING;
        drawingContext.fillText('…', ROWS_X + rowW - 12, rowY + 20);
      } else if (isReceiver) {
        drawingContext.fillStyle = OK;
        drawingContext.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText('收到', ROWS_X + rowW - 12, rowY + 20);
      } else {
        drawingContext.fillStyle = PALE;
        drawingContext.fillText('未收到', ROWS_X + rowW - 12, rowY + 20);
      }
      drawingContext.textAlign = 'left';
    });

    // 投递圆点:仅在动画前半段出现,沿「发射端 → 总线」移动。
    if (startedAt !== 0 && elapsed < LINK_MS) {
      const progress = elapsed / LINK_MS;
      const start = SENDER_X + SENDER_W;
      const end = BUS_X + BUS_W / 2;
      const dotX = start + (end - start) * progress;
      drawingContext.fillStyle = ACCENT;
      drawingContext.beginPath();
      drawingContext.arc(dotX, ARROW_Y, 4.5, 0, Math.PI * 2);
      drawingContext.fill();
    }

    const receivedRows = ROWS.filter((row) => received.has(row.key));
    const pending = startedAt !== 0 && elapsed < TOTAL_MS;
    emit({
      emitterLabel: preset.label,
      deliveryScope: preset.scope,
      receivedSummary: pending
        ? '投递中…'
        : `${receivedRows.length}/6:${receivedRows
            .map((row) => row.shortName)
            .join('、')}`,
      focusResult: pending
        ? '投递中…'
        : `${focusRow.shortName}:${received.has(focusRow.key) ? '收到' : '未收到'}`,
    });
  }

  function tick(): void {
    const elapsed = performance.now() - startedAt;
    if (elapsed >= TOTAL_MS) {
      rafId = 0;
      draw();
      return;
    }
    draw();
    rafId = window.requestAnimationFrame(tick);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      cancelAnimation();
      current = options;
      // 每次切换输入都重放投递过程,读数随结算逐格刷新。
      startedAt = performance.now();
      draw();
      rafId = window.requestAnimationFrame(tick);
    },
    dispose() {
      cancelAnimation();
      resizeObserver.disconnect();
    },
  };
}
