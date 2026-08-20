/**
 * 范例外壳：把 format-event.ts 的运行时状态绘制成「触发方 → A / B / C → 兜底」的
 * 调用链视图与日志流。只负责呈现（卡片、状态、结果与日志），属于支撑代码，
 * 不进入 Show code。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';
import { createFormatDemo } from './format-event';
import type {
  FormatEventArgs,
  FormatLogEntry,
  FormatSnapshot,
} from './format-event';

export interface FormatStageInstance {
  update(args: FormatEventArgs): void;
  dispose(): void;
}

interface StageState {
  snapshot: FormatSnapshot;
  logs: FormatLogEntry[];
  args: FormatEventArgs;
}

const STATUS_LABELS: Record<FormatSnapshot['status'], string> = {
  sync: '已同步返回',
  pending: '等待中',
  fulfilled: '已兑现',
  rejected: '已拒绝',
};

const STATUS_COLORS: Record<FormatSnapshot['status'], string> = {
  sync: '#64748b',
  pending: '#d97706',
  fulfilled: '#16a34a',
  rejected: '#dc2626',
};

const TAG_COLORS: Record<FormatLogEntry['tag'], string> = {
  触发: '#93c5fd',
  监听器: '#4ade80',
  兜底: '#c084fc',
  错误: '#f87171',
};

const LISTENER_IDS = ['A', 'B', 'C'] as const;

export function createFormatStage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FormatSnapshot) => void,
): FormatStageInstance {
  const state: StageState = {
    snapshot: {
      mode: 'emit',
      executed: [],
      inner: false,
      status: 'sync',
      result: '尚未触发',
      run: 0,
    },
    logs: [],
    args: { mode: 'emit', responder: 'none', asyncB: false, throwB: false },
  };

  const demo = createFormatDemo((snapshot, logs) => {
    state.snapshot = snapshot;
    state.logs = logs;
    emit(snapshot);
    draw();
  });

  function fitText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string {
    if (context.measureText(text).width <= maxWidth) {
      return text;
    }
    let end = text.length - 1;
    while (end > 0 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
      end -= 1;
    }
    return `${text.slice(0, end)}…`;
  }

  function drawBox(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    stroke: string,
  ) {
    context.fillStyle = '#ffffff';
    context.strokeStyle = stroke;
    context.lineWidth = 1.5;
    context.beginPath();
    context.roundRect(x, y, w, h, 8);
    context.fill();
    context.stroke();
  }

  function drawArrow(
    context: CanvasRenderingContext2D,
    x1: number,
    y: number,
    x2: number,
    color: string,
    dashed: boolean,
  ) {
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    if (dashed) {
      context.setLineDash([4, 3]);
    }
    context.beginPath();
    context.moveTo(x1, y);
    context.lineTo(x2, y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x2, y - 4.5);
    context.lineTo(x2 + 7, y);
    context.lineTo(x2, y + 4.5);
    context.closePath();
    context.fill();
  }

  /** 监听器卡片的行为说明：异步 / 抛错 / 抢答 / 让位 */
  function behaviorText(id: (typeof LISTENER_IDS)[number], args: FormatEventArgs): string {
    if (id === 'B') {
      const parts: string[] = [];
      if (args.asyncB) parts.push('异步');
      if (args.throwB) parts.push('抛错');
      if (args.responder === 'B') parts.push('抢答');
      if (!parts.length) parts.push('让位');
      return parts.join(' · ');
    }
    return args.responder === id ? '抢答' : '让位';
  }

  function draw() {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('当前浏览器不支持 Canvas 2D。');
    }

    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const sans = 'ui-sans-serif, system-ui, sans-serif';
    const margin = width < 480 ? 16 : 48;
    const compact = width < 640;
    const { snapshot, args } = state;

    // 标题行
    context.fillStyle = '#172033';
    context.font = `600 ${compact ? 13 : 15}px ${sans}`;
    context.fillText('分发模式对比台', margin, margin + 14);
    context.fillStyle = '#94a3b8';
    context.font = `11px ${sans}`;
    const hint = 'cordis 正运行于浏览器 · 点击画布触发一次';
    context.fillText(hint, width - margin - context.measureText(hint).width, margin + 14);

    // 调用链：触发方 → A → B → C → inner 兜底
    const chainY = margin + 40;
    const boxH = compact ? 50 : 58;
    const gap = compact ? 10 : 18;
    const avail = width - margin * 2;
    const innerW = compact ? 62 : 84;
    const triggerW = compact ? 92 : 128;
    const cardW = Math.max(48, (avail - triggerW - innerW - gap * 4) / 4);
    const chainCY = chainY + boxH / 2;

    const nodeStates = LISTENER_IDS.map((id) => {
      const executedAt = snapshot.executed.indexOf(id);
      const failed = args.throwB && id === 'B' && executedAt >= 0
        && (snapshot.result.includes('抛出') || snapshot.status === 'rejected');
      return {
        id,
        executed: executedAt >= 0,
        failed,
        responding: args.responder === id,
      };
    });
    const innerReached = snapshot.inner;

    // 触发方卡片：当前分发模式
    const activeStroke = snapshot.run > 0 ? '#4f7cff' : '#dbe3f0';
    drawBox(context, margin, chainY, triggerW, boxH, activeStroke);
    context.fillStyle = '#172033';
    context.font = `600 ${compact ? 11 : 13}px ${mono}`;
    context.fillText(fitText(context, `ctx.${snapshot.mode}`, triggerW - 20), margin + 10, chainY + (compact ? 19 : 22));
    context.fillStyle = '#64748b';
    context.font = `${compact ? 10 : 11}px ${mono}`;
    context.fillText(fitText(context, "('format', …)", triggerW - 20), margin + 10, chainY + (compact ? 35 : 41));

    // 监听器卡片与 inner 兜底
    let cursorX = margin + triggerW;
    const cards = [
      ...nodeStates.map((node) => ({
        title: node.id as string,
        label: behaviorText(node.id, args),
        inner: false,
        x: 0,
        state: node,
      })),
      {
        title: 'inner',
        label: '兜底实现',
        inner: true,
        x: 0,
        state: { executed: innerReached, failed: false, responding: false },
      },
    ];
    for (const card of cards) {
      const cardWidth = card.inner ? innerW : cardW;
      card.x = cursorX + gap;
      const stroke = card.state.failed
        ? '#dc2626'
        : card.state.responding
          ? '#d97706'
          : card.state.executed
            ? '#16a34a'
            : '#dbe3f0';
      drawBox(context, card.x, chainY, cardWidth, boxH, stroke);
      context.fillStyle = card.state.executed ? '#172033' : '#94a3b8';
      context.font = `600 ${compact ? 13 : 15}px ${mono}`;
      context.fillText(card.title, card.x + 10, chainY + (compact ? 20 : 23));
      context.fillStyle = '#64748b';
      context.font = `${compact ? 10 : 11}px ${sans}`;
      context.fillText(fitText(context, card.label, cardWidth - 20), card.x + 10, chainY + (compact ? 36 : 42));
      cursorX = card.x + cardWidth;
    }

    // 节点间箭头：执行路径为实线蓝，未走到的段为虚线灰
    const segments = [
      { from: margin + triggerW, to: cards[0]!.x, active: cards[0]!.state.executed },
      { from: cards[0]!.x + cardW, to: cards[1]!.x, active: cards[1]!.state.executed },
      { from: cards[1]!.x + cardW, to: cards[2]!.x, active: cards[2]!.state.executed },
      { from: cards[2]!.x + cardW, to: cards[3]!.x, active: innerReached },
    ];
    for (const segment of segments) {
      drawArrow(
        context,
        segment.from,
        chainCY,
        segment.to - 4,
        segment.active ? '#4f7cff' : '#b6c2d4',
        !segment.active,
      );
    }

    // 触发结果行：状态徽章 + 结果文本
    const resultY = chainY + boxH + 26;
    const badgeText = STATUS_LABELS[snapshot.status];
    context.font = '600 11px sans-serif';
    const badgeW = context.measureText(badgeText).width + 16;
    context.fillStyle = STATUS_COLORS[snapshot.status];
    context.beginPath();
    context.roundRect(margin, resultY, badgeW, 19, 9.5);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(badgeText, margin + 8, resultY + 13);
    context.fillStyle = '#172033';
    context.font = `${compact ? 11 : 12}px ${mono}`;
    context.fillText(
      fitText(context, `触发结果：${snapshot.result}`, width - margin * 2 - badgeW - 14),
      margin + badgeW + 12,
      resultY + 13,
    );

    // 点击提示
    const hintY = resultY + 34;
    context.fillStyle = '#475569';
    context.font = `12px ${mono}`;
    context.fillText(
      fitText(
        context,
        `点击画布：ctx.${args.mode}('format', 'hello')${
          args.mode === 'waterfall' ? '，末参是兜底实现' : ''
        }`,
        width - margin * 2,
      ),
      margin,
      hintY,
    );

    // 日志流：深色控制台，最新一条在最下
    const consoleBottom = height - 12;
    const consoleH = Math.max(60, consoleBottom - (hintY + 12));
    const consoleTop = Math.min(hintY + 12, consoleBottom - consoleH);
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.roundRect(margin, consoleTop, width - margin * 2, consoleH, 8);
    context.fill();
    context.fillStyle = '#94a3b8';
    context.font = `11px ${sans}`;
    context.fillText('日志流（相对毫秒 · 执行顺序与返回值）', margin + 14, consoleTop + 18);

    const lineH = 17;
    const maxLines = Math.max(1, Math.floor((consoleH - 32) / lineH));
    const visible = state.logs.slice(-maxLines);
    visible.forEach((entry, index) => {
      const y = consoleTop + consoleH - 12 - (visible.length - 1 - index) * lineH;
      let cursor = margin + 14;
      context.font = `12px ${mono}`;
      const time = `+${entry.at}ms`;
      context.fillStyle = '#64748b';
      context.fillText(time, cursor, y);
      cursor += context.measureText(time).width + 10;
      context.fillStyle = TAG_COLORS[entry.tag] ?? '#cbd5e1';
      const tag = `[${entry.tag}]`;
      context.fillText(tag, cursor, y);
      cursor += context.measureText(tag).width + 10;
      context.fillStyle = '#cbd5e1';
      context.fillText(
        fitText(context, entry.text, width - margin * 2 - 28 - (cursor - margin - 14)),
        cursor,
        y,
      );
    });
  }

  const observer = createResizeObserver(canvas, draw);
  const onClick = () => demo.trigger();
  canvas.addEventListener('click', onClick);
  canvas.style.cursor = 'pointer';

  return {
    update(args) {
      state.args = args;
      demo.update(args);
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      observer.disconnect();
      demo.dispose();
    },
  };
}
