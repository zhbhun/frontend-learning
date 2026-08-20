/**
 * 范例外壳：把 herald-plugin.ts 的运行时状态绘制成「类型层声明 → 运行时链路」的对照图。
 * 左侧是根上下文与消费者（事件链路），右侧是提供者、Config 与服务槽位（服务链路）；
 * 槽位在线 / 离线用实心 / 空心胶囊区分。只负责呈现，属于支撑代码，不进入 Show code。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';
import { createHeraldDemo } from './herald-plugin';
import type {
  HeraldDemoArgs,
  HeraldDemoInstance,
  HeraldDemoSnapshot,
} from './herald-plugin';

export interface HeraldStageInstance {
  update(args: HeraldDemoArgs): void;
  dispose(): void;
}

interface StageState {
  snapshot: HeraldDemoSnapshot;
  args: HeraldDemoArgs;
}

const STATE_COLORS: Record<string, string> = {
  ACTIVE: '#16a34a',
  LOADING: '#d97706',
  UNLOADING: '#d97706',
  PENDING: '#64748b',
  FAILED: '#dc2626',
  已卸载: '#94a3b8',
};

export function createHeraldStage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HeraldDemoSnapshot) => void,
): HeraldStageInstance {
  const state: StageState = {
    snapshot: {
      receivedPitch: null,
      announceResult: null,
      calls: 0,
      providerState: '已卸载',
      decorate: true,
    },
    args: { pitch: 3, topic: 'cordis', decorate: true, provider: true },
  };

  const demo: HeraldDemoInstance = createHeraldDemo((snapshot) => {
    state.snapshot = snapshot;
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

  function drawLabel(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
  ) {
    context.fillStyle = color;
    context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(text, x, y);
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
    context.fillText('声明合并三条链路的运行时对齐', margin, margin + 14);
    context.fillStyle = '#94a3b8';
    context.font = `11px ${sans}`;
    const note = 'cordis 运行于浏览器 · 点击画布触发一次事件 + 消费';
    context.fillText(note, width - margin - context.measureText(note).width, margin + 14);

    // 左列：根上下文；右列：提供者 → Config → 服务槽位
    const boxY = margin + 36;
    const boxH = 54;
    const rootW = compact ? 118 : 158;
    const colW = compact ? 182 : 230;
    const gap = compact ? 38 : 54;
    const rootX = margin;
    const colX = rootX + rootW + gap;
    const rootCY = boxY + boxH / 2;

    drawBox(context, rootX, boxY, rootW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('new Context()', rootX + 14, boxY + 23);
    context.font = `11px ${mono}`;
    context.fillStyle = '#4f7cff';
    context.fillText(
      fitText(context, '类型层：ctx.herald', rootW - 28),
      rootX + 14,
      boxY + 41,
    );

    // 提供者节点与状态徽章
    drawBox(context, colX, boxY, colW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('HeraldService', colX + 14, boxY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText(
      `static provide = 'herald' · decorate = ${snapshot.decorate}`,
      colX + 14,
      boxY + 41,
    );
    const stateText = snapshot.providerState.startsWith('FAILED')
      ? 'FAILED'
      : snapshot.providerState;
    context.font = '600 11px sans-serif';
    const badgeW = context.measureText(stateText).width + 16;
    context.fillStyle = STATE_COLORS[stateText] ?? '#94a3b8';
    context.beginPath();
    context.roundRect(colX + colW - badgeW - 10, boxY + 8, badgeW, 19, 9.5);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(stateText, colX + colW - badgeW - 2, boxY + 21);
    if (snapshot.providerState.startsWith('FAILED')) {
      context.fillStyle = '#dc2626';
      context.font = `11px ${mono}`;
      context.fillText(
        fitText(context, snapshot.providerState, colW - 24),
        colX + 14,
        boxY + boxH + 14,
      );
    }

    // root → 提供者连线（装载）
    drawArrow(context, rootX + rootW + 6, rootCY, colX - 9, rootCY, '#4f7cff', false);
    drawLabel(
      context,
      'root.plugin(HeraldService, config)',
      rootX + rootW + 8,
      rootCY - 8,
      '#64748b',
    );

    // 服务槽位：挂在提供者下方的具名属性；按提供者状态判断在线（未点击时也正确）
    const pillY = boxY + boxH + 24;
    const pillH = 30;
    const alive = snapshot.providerState === 'ACTIVE';
    context.fillStyle = alive ? '#0f172a' : '#e2e8f0';
    context.beginPath();
    context.roundRect(colX, pillY, colW, pillH, 15);
    context.fill();
    context.font = `600 12px ${mono}`;
    context.fillStyle = alive ? '#93c5fd' : '#64748b';
    context.fillText('ctx.herald', colX + 16, pillY + 20);
    context.font = `12px ${mono}`;
    context.fillStyle = alive ? '#e2e8f0' : '#94a3b8';
    const pillValue = alive
      ? `HeraldService 实例 · calls = ${snapshot.calls}`
      : 'undefined（类型层仍说是 HeraldApi）';
    context.fillText(
      fitText(
        context,
        pillValue,
        colW - 30 - context.measureText('ctx.herald').width - 16,
      ),
      colX + 16 + context.measureText('ctx.herald').width + 14,
      pillY + 20,
    );

    // 消费者节点（事件链路）：root 的另一个子插件
    const consumerY = pillY + pillH + 34;
    drawBox(context, colX, consumerY, colW, boxH);
    context.fillStyle = '#172033';
    context.font = `600 13px ${mono}`;
    context.fillText('heraldConsumer', colX + 14, consumerY + 23);
    context.fillStyle = '#64748b';
    context.font = `11px ${mono}`;
    context.fillText(
      `ctx.on('herald/chime', p => …) · 收到 ${snapshot.receivedPitch ?? '—'}`,
      colX + 14,
      consumerY + 41,
    );

    // root → 消费者连线（事件触发，从 root 框下方绕行）
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
    drawLabel(
      context,
      `root.emit('herald/chime', ${args.pitch})`,
      rootX + rootW / 2 + 8,
      consumerCY - 8,
      '#64748b',
    );

    // 点击提示
    const hintY = consumerY + boxH + 20;
    context.fillStyle = '#475569';
    context.font = `12px ${mono}`;
    const hint = alive
      ? `点击画布：emit('herald/chime', ${args.pitch}) → 监听器；root.herald.announce('${args.topic}')`
      : `点击画布：emit('herald/chime', ${args.pitch}) 仍到达监听器；root.herald 是 undefined`;
    context.fillText(fitText(context, hint, width - margin * 2), margin, hintY);

    // 两条链路的结论条
    const barY = hintY + 18;
    context.font = `12px ${mono}`;
    context.fillStyle = '#16a34a';
    context.fillText(
      fitText(
        context,
        `事件链路：${snapshot.receivedPitch ?? '—'} ← 'herald/chime' 的 number 原样到达`,
        width - margin * 2,
      ),
      margin,
      barY + 14,
    );
    context.fillStyle = snapshot.announceResult ? '#16a34a' : '#d97706';
    context.fillText(
      fitText(
        context,
        snapshot.announceResult
          ? `服务链路：announce('${args.topic}') → ${snapshot.announceResult}`
          : '服务链路：不可用——提供者离线，类型层不知道这件事',
        width - margin * 2,
      ),
      margin,
      barY + 32,
    );
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
