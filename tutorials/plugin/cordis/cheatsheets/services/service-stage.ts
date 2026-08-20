/**
 * 范例外壳：把 counter-service.ts 的运行时状态绘制成「根上下文 → 提供者 / 消费者 →
 * 服务槽位」结构图与日志流。只负责呈现（节点、状态徽章、槽位读数与日志），属于支撑
 * 代码，不进入 Show code。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';
import { createServiceDemo } from './counter-service';
import type {
  ServiceDemoArgs,
  ServiceDemoLog,
  ServiceDemoSnapshot,
} from './counter-service';

export interface ServiceStageInstance {
  update(args: ServiceDemoArgs): void;
  dispose(): void;
}

interface StageState {
  snapshot: ServiceDemoSnapshot;
  logs: ServiceDemoLog[];
  args: ServiceDemoArgs;
}

const STATE_COLORS: Record<string, string> = {
  ACTIVE: '#16a34a',
  LOADING: '#d97706',
  UNLOADING: '#d97706',
  PENDING: '#64748b',
  DISPOSED: '#94a3b8',
  FAILED: '#dc2626',
  未加载: '#94a3b8',
};

const TAG_COLORS: Record<ServiceDemoLog['tag'], string> = {
  service: '#93c5fd',
  提供者: '#4ade80',
  消费: '#c084fc',
  错误: '#f87171',
};

export function createServiceStage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ServiceDemoSnapshot) => void,
): ServiceStageInstance {
  const state: StageState = {
    snapshot: {
      state: '未加载',
      impl: '—',
      count: null,
      calls: 0,
      uid: null,
      consumerUid: null,
      extra: null,
    },
    logs: [],
    args: { provider: true, impl: 'linear', step: 1, duplicate: false },
  };

  const demo = createServiceDemo((snapshot, logs) => {
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
  ) {
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#dbe3f0';
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, w, h, 8);
    context.fill();
    context.stroke();
  }

  function drawArrow(
    context: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    dashed: boolean,
  ) {
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    if (dashed) {
      context.setLineDash([4, 3]);
    }
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.setLineDash([]);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(
      x2 - 7 * Math.cos(angle - Math.PI / 6),
      y2 - 7 * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(
      x2 - 7 * Math.cos(angle + Math.PI / 6),
      y2 - 7 * Math.sin(angle + Math.PI / 6),
    );
    context.closePath();
    context.fill();
  }

  function draw() {
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

    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const sans = 'ui-sans-serif, system-ui, sans-serif';
    const margin = width < 480 ? 16 : 48;
    const compact = width < 640;
    const { snapshot, args } = state;

    // 标题行
    context.fillStyle = '#172033';
    context.font = `600 ${compact ? 13 : 15}px ${sans}`;
    context.fillText('服务注册与消费的运行时形状', margin, margin + 14);
    context.fillStyle = '#94a3b8';
    context.font = `11px ${sans}`;
    const note = 'cordis 正运行于浏览器 · 点击画布消费一次';
    context.fillText(note, width - margin - context.measureText(note).width, margin + 14);

    // 左列：根上下文；右列：提供者 → 服务槽位 → 消费者
    const boxY = margin + 36;
    const boxH = 54;
    const rootW = compact ? 128 : 164;
    const colW = compact ? 178 : 220;
    const gap = compact ? 40 : 56;
    const rootX = margin;
    const colX = rootX + rootW + gap;
    const rootCY = boxY + boxH / 2;

    drawBox(context, rootX, boxY, rootW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('new Context()', rootX + 14, boxY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText('root fiber · ACTIVE', rootX + 14, boxY + 41);

    // 提供者节点与状态徽章
    drawBox(context, colX, boxY, colW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText(fitText(context, snapshot.impl, colW - 96), colX + 14, boxY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText(
      `uid ${snapshot.uid ?? '-'} · 提供 counter`,
      colX + 14,
      boxY + 41,
    );
    const stateText = snapshot.state;
    context.font = '600 11px sans-serif';
    const badgeW = context.measureText(stateText).width + 16;
    context.fillStyle = STATE_COLORS[stateText] ?? '#94a3b8';
    context.beginPath();
    context.roundRect(colX + colW - badgeW - 10, boxY + 8, badgeW, 19, 9.5);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(stateText, colX + colW - badgeW - 2, boxY + 21);

    // root → 提供者连线
    drawArrow(context, rootX + rootW + 6, rootCY, colX - 9, rootCY, '#4f7cff', false);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    const pluginLabel = 'ctx.plugin()';
    context.fillText(
      pluginLabel,
      rootX + rootW + gap / 2 - context.measureText(pluginLabel).width / 2,
      rootCY - 10,
    );

    // 重复注册提示行（红色，仅尝试过时出现）
    let cursorY = boxY + boxH + 16;
    if (snapshot.extra) {
      context.fillStyle = '#dc2626';
      context.font = `12px ${mono}`;
      context.fillText(
        fitText(context, `第二个同名提供者：${snapshot.extra}（注册被拒绝）`, colW),
        colX,
        cursorY,
      );
    }

    // 服务槽位：挂在提供者下方的具名属性
    const pillY = cursorY + (snapshot.extra ? 10 : 0) + 8;
    const pillH = 30;
    const alive = snapshot.count !== null;
    context.fillStyle = alive ? '#0f172a' : '#e2e8f0';
    context.beginPath();
    context.roundRect(colX, pillY, colW, pillH, 15);
    context.fill();
    context.font = `600 12px ${mono}`;
    context.fillStyle = alive ? '#93c5fd' : '#64748b';
    context.fillText('ctx.counter', colX + 16, pillY + 20);
    context.font = `12px ${mono}`;
    context.fillStyle = alive ? '#e2e8f0' : '#94a3b8';
    const pillValue = alive
      ? `${snapshot.impl} 实例 · count = ${snapshot.count}`
      : 'undefined';
    context.fillText(
      fitText(context, pillValue, colW - 30 - context.measureText('ctx.counter').width - 16),
      colX + 16 + context.measureText('ctx.counter').width + 14,
      pillY + 20,
    );

    // 消费者节点（兄弟作用域）：root 的另一个子插件
    const consumerY = pillY + pillH + 30;
    drawBox(context, colX, consumerY, colW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('consumer', colX + 14, consumerY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText(
      `uid ${snapshot.consumerUid ?? '-'} · 不声明 inject`,
      colX + 14,
      consumerY + 41,
    );

    // root → 消费者连线（从 root 框下方绕行）
    const rootBottom = boxY + boxH;
    const consumerCY = consumerY + boxH / 2;
    context.strokeStyle = '#4f7cff';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(rootX + rootW / 2, rootBottom + 6);
    context.lineTo(rootX + rootW / 2, consumerCY);
    context.lineTo(colX - 9, consumerCY);
    context.stroke();
    context.fillStyle = '#4f7cff';
    context.beginPath();
    context.moveTo(colX - 3, consumerCY - 4.5);
    context.lineTo(colX + 4, consumerCY);
    context.lineTo(colX - 3, consumerCY + 4.5);
    context.closePath();
    context.fill();

    // 消费者 → 服务槽位：兄弟作用域属性访问，始终被拒绝（虚线灰）
    const accessColor = '#b6c2d4';
    drawArrow(
      context,
      colX + colW / 2,
      consumerY - 4,
      colX + colW / 2,
      pillY + pillH + 5,
      accessColor,
      true,
    );
    context.fillStyle = accessColor;
    context.font = `11px ${mono}`;
    const accessLabel = fitText(context, 'ctx.counter ✗ without inject', colW - 20);
    context.fillText(
      accessLabel,
      colX + colW - 4 - context.measureText(accessLabel).width,
      consumerY - 12,
    );

    // 点击提示
    const hintY = consumerY + boxH + 20;
    context.fillStyle = '#475569';
    context.font = `12px ${mono}`;
    context.fillText(
      fitText(
        context,
        `点击画布：root.counter.bump(${args.step}) → 应用侧 + 兄弟作用域两条访问路径`,
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
    context.fillText('日志流（服务事件与消费结果）', margin + 14, consoleTop + 18);

    const lineH = 17;
    const maxLines = Math.max(1, Math.floor((consoleH - 32) / lineH));
    const visible = state.logs.slice(-maxLines);
    visible.forEach((entry, index) => {
      const y = consoleTop + consoleH - 12 - (visible.length - 1 - index) * lineH;
      let cursor = margin + 14;
      context.font = `12px ${mono}`;
      context.fillStyle = '#64748b';
      context.fillText(entry.time, cursor, y);
      cursor += context.measureText(entry.time).width + 10;
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
  const onClick = () => demo.consume();
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
