/**
 * 范例外壳：把 minimal-app.ts 的运行时状态绘制成「根上下文 → 插件 fiber」结构图与日志流。
 * 只负责呈现（节点、状态徽章、config 与日志），属于支撑代码，不进入 Show code。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';
import { createMinimalApp } from './minimal-app';
import type { MinimalAppArgs, MinimalAppLog, MinimalAppSnapshot } from './minimal-app';

export interface AppStageInstance {
  update(args: MinimalAppArgs): void;
  dispose(): void;
}

interface StageState {
  snapshot: MinimalAppSnapshot;
  logs: MinimalAppLog[];
  args: MinimalAppArgs;
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

const TAG_COLORS: Record<MinimalAppLog['tag'], string> = {
  插件: '#4ade80',
  effect: '#fbbf24',
  应用: '#93c5fd',
};

export function createAppStage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MinimalAppSnapshot) => void,
): AppStageInstance {
  const state: StageState = {
    snapshot: { state: '未加载', uid: null, registry: 0, ticks: 0 },
    logs: [],
    args: { loaded: false, message: '', interval: 600 },
  };

  const app = createMinimalApp((snapshot, logs) => {
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
    const { snapshot, logs, args } = state;

    // 标题行
    context.fillStyle = '#172033';
    context.font = `600 ${compact ? 13 : 15}px ${sans}`;
    context.fillText('最小应用的运行时形状', margin, margin + 14);
    context.fillStyle = '#94a3b8';
    context.font = `11px ${sans}`;
    const note = 'cordis 正运行于浏览器';
    context.fillText(note, width - margin - context.measureText(note).width, margin + 14);

    // 两个节点：根上下文 → 插件 fiber
    const boxY = margin + 40;
    const boxH = 54;
    const rootW = compact ? 132 : 168;
    const pluginW = compact ? 172 : 216;
    const gap = compact ? 46 : 64;
    const rootX = margin;
    const pluginX = rootX + rootW + gap;
    const centerY = boxY + boxH / 2;

    drawBox(context, rootX, boxY, rootW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('new Context()', rootX + 14, boxY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText('root fiber · ACTIVE', rootX + 14, boxY + 41);

    drawBox(context, pluginX, boxY, pluginW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('heartbeat', pluginX + 14, boxY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText(
      `uid ${snapshot.uid ?? '-'} · tick ${snapshot.ticks}`,
      pluginX + 14,
      boxY + 41,
    );

    // 状态徽章：画在插件框右上角，保证窄画布也不溢出
    const stateText = snapshot.state;
    context.font = '600 11px sans-serif';
    const badgeW = context.measureText(stateText).width + 16;
    const badgeX = pluginX + pluginW - badgeW - 10;
    const badgeY = boxY + 8;
    context.fillStyle = STATE_COLORS[stateText] ?? '#94a3b8';
    context.beginPath();
    context.roundRect(badgeX, badgeY, badgeW, 19, 9.5);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(stateText, badgeX + 8, badgeY + 13);

    // 连线：加载中为实线，卸载后为虚线
    const active = stateText === 'ACTIVE';
    context.strokeStyle = active ? '#4f7cff' : '#b6c2d4';
    context.lineWidth = 1.5;
    if (!active) {
      context.setLineDash([4, 3]);
    }
    context.beginPath();
    context.moveTo(rootX + rootW + 6, centerY);
    context.lineTo(pluginX - 9, centerY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = active ? '#4f7cff' : '#b6c2d4';
    context.beginPath();
    context.moveTo(pluginX - 3, centerY - 4.5);
    context.lineTo(pluginX + 4, centerY);
    context.lineTo(pluginX - 3, centerY + 4.5);
    context.closePath();
    context.fill();
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    const arrowLabel = 'ctx.plugin()';
    const arrowLabelX = rootX + rootW + gap / 2 - context.measureText(arrowLabel).width / 2;
    context.fillText(arrowLabel, arrowLabelX, centerY - 10);

    // 插件当前配置
    context.fillStyle = '#475569';
    context.font = `12px ${mono}`;
    const cfgY = boxY + boxH + 22;
    context.fillText(
      fitText(context, `config.message = ${JSON.stringify(args.message)}`, width - margin - pluginX),
      pluginX,
      cfgY,
    );
    context.fillText(`config.interval = ${args.interval}ms`, pluginX, cfgY + 18);

    // 日志流：深色控制台，最新一条在最下
    const consoleBottom = height - 104;
    const consoleH = Math.max(64, consoleBottom - (cfgY + 36));
    const consoleTop = Math.min(cfgY + 36, consoleBottom - consoleH);
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.roundRect(margin, consoleTop, width - margin * 2, consoleH, 8);
    context.fill();
    context.fillStyle = '#94a3b8';
    context.font = `11px ${sans}`;
    context.fillText('日志流（插件生命周期与副作用撤销）', margin + 14, consoleTop + 20);

    const lineH = 17;
    const maxLines = Math.max(1, Math.floor((consoleH - 34) / lineH));
    const visible = logs.slice(-maxLines);
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

  return {
    update(args) {
      state.args = args;
      app.update(args);
    },
    dispose() {
      observer.disconnect();
      app.dispose();
    },
  };
}
