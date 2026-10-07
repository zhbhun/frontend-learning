/**
 * 范例介绍：模拟同一条消息在两条渲染进程间通信路线下的走向。
 * 输入：通信路线（主进程中转 / MessagePort 直连）与窗口 B 状态（在线 / 刷新后未重建）。
 * 操作：切换两个控件，观察消息箭头的路径、主进程是否可见、最终到达还是丢失。
 * 预期：中转下每条消息都经主进程转发中心（B 未就绪则按不排队规则丢失）；
 *      直连下主进程只出现在移交阶段，专线消息主进程看不到，刷新后旧端口失效。
 * 阅读主线：两条路线的分野是「消息经不经过主进程」。
 * 这是行为模型模拟，不等于运行 Electron；真实项目的验证步骤见正文「快速上手」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RouteMode = '主进程中转' | 'MessagePort 直连';
export type WindowBState = '在线' | '刷新后未重建';

export interface RouteSimOptions {
  route: RouteMode;
  windowB: WindowBState;
}

export interface RouteSimSnapshot {
  route: RouteMode;
  windowB: WindowBState;
  delivered: boolean;
  mainSeesMessage: boolean;
}

export interface RouteSimInstance {
  update(options: RouteSimOptions): void;
  dispose(): void;
}

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelDim: '#f1f5f9',
  panelBorder: '#cbd5e1',
  ok: '#15803d',
  blocked: '#dc2626',
  portTint: 'rgba(79, 124, 255, 0.8)',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
};

// 布局：三个盒子横排，中转箭头走盒间，直连专线走盒下
const LAYOUT = {
  boxTop: 170,
  boxHeight: 78,
  boxA: { x: 48, width: 180 },
  boxMain: { x: 270, width: 180 },
  boxB: { x: 492, width: 180 },
  handoffY: 148,
  wireY: 268,
  legendY: 288,
  verdictY: 330,
};

export function createRouteSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RouteSimSnapshot) => void,
): RouteSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: RouteSimOptions = {
    route: '主进程中转',
    windowB: '在线',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = 410;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.fillText(
      '从窗口 A 发送同一条消息，看它在两条路线下各走到哪',
      LAYOUT.boxA.x,
      56,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillText(
      '切换「通信路线」与「窗口 B 状态」，观察路径与主进程可见性',
      LAYOUT.boxA.x,
      82,
    );

    const isRelay = current.route === '主进程中转';
    const bOnline = current.windowB === '在线';
    const delivered = bOnline;

    if (isRelay) {
      drawRelayRoute(bOnline);
    } else {
      drawPortRoute(bOnline);
    }

    drawBoxes(isRelay, bOnline);
    drawVerdict(isRelay, bOnline, delivered);

    emit({
      route: current.route,
      windowB: current.windowB,
      delivered,
      mainSeesMessage: isRelay,
    });
  }

  function drawBoxes(isRelay: boolean, bOnline: boolean) {
    drawBox(LAYOUT.boxA.x, '窗口 A', '页面 · preload 暴露面', '发送方', COLORS.panelBg, false);
    drawBox(
      LAYOUT.boxMain.x,
      '主进程',
      isRelay ? '转发中心 · 每条消息可见' : '移交后不再参与',
      isRelay ? '路由 + 校验来源' : '只在 did-finish-load 握手',
      isRelay ? COLORS.panelBg : COLORS.panelDim,
      !isRelay,
    );
    drawBox(
      LAYOUT.boxB.x,
      '窗口 B',
      '页面 · preload 暴露面',
      bOnline
        ? isRelay
          ? '监听已就位'
          : '已持有专线端口'
        : isRelay
          ? '刷新后未重新订阅'
          : '旧端口已 close',
      COLORS.panelBg,
      !bOnline,
      bOnline ? COLORS.ok : COLORS.blocked,
    );
  }

  function drawBox(
    x: number,
    title: string,
    subtitle: string,
    status: string,
    fill: string,
    dimmed: boolean,
    statusColor?: string,
  ) {
    drawingContext.fillStyle = fill;
    drawingContext.strokeStyle = dimmed ? '#e2e8f0' : COLORS.panelBorder;
    drawingContext.lineWidth = 1;
    roundRect(x, LAYOUT.boxTop, LAYOUT.boxA.width, LAYOUT.boxHeight, 8);
    drawingContext.fill();
    if (dimmed) {
      drawingContext.setLineDash([5, 4]);
    }
    drawingContext.stroke();
    drawingContext.setLineDash([]);

    const cx = x + LAYOUT.boxA.width / 2;
    drawingContext.textAlign = 'center';
    drawingContext.fillStyle = dimmed ? COLORS.muted : COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText(title, cx, LAYOUT.boxTop + 26);

    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = dimmed ? COLORS.muted : COLORS.text;
    drawingContext.fillText(subtitle, cx, LAYOUT.boxTop + 46);

    drawingContext.fillStyle = statusColor ?? COLORS.muted;
    drawingContext.fillText(status, cx, LAYOUT.boxTop + 66);
    drawingContext.textAlign = 'left';
  }

  function drawRelayRoute(bOnline: boolean) {
    const midY = LAYOUT.boxTop + LAYOUT.boxHeight / 2;
    const gapLeft = LAYOUT.boxA.x + LAYOUT.boxA.width; // 228
    const gapRight = LAYOUT.boxMain.x; // 270
    const gap2Left = LAYOUT.boxMain.x + LAYOUT.boxMain.width; // 450
    const gap2Right = LAYOUT.boxB.x; // 492

    // 第一步：A 经通道发给主进程（渲染 → 主进程，「IPC 概念」的方向一）
    drawArrow(gapLeft, midY, gapRight, midY, COLORS.text);
    // 第二步：转发中心定向推给窗口 B（主 → 渲染定向，「主进程推送」）
    if (bOnline) {
      drawArrow(gap2Left, midY, gap2Right, midY, COLORS.ok);
    } else {
      drawArrow(gap2Left, midY, gap2Left + 20, midY, COLORS.blocked);
      drawCross(gap2Left + 32, midY);
      drawingContext.textAlign = 'center';
      drawingContext.font = COLORS.monoSmall;
      drawingContext.fillStyle = COLORS.blocked;
      drawingContext.fillText('没有监听', (gap2Left + gap2Right) / 2, midY - 12);
      drawingContext.textAlign = 'left';
    }

    drawingContext.textAlign = 'center';
    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      '① ipcRenderer.send → ipcMain.on　② 转发中心 webContents.send 定向转发',
      (LAYOUT.boxA.x + LAYOUT.boxB.x + LAYOUT.boxA.width) / 2,
      LAYOUT.legendY,
    );
    drawingContext.textAlign = 'left';
  }

  function drawPortRoute(bOnline: boolean) {
    const mainCx = LAYOUT.boxMain.x + LAYOUT.boxMain.width / 2;
    const aTop = LAYOUT.boxA.x + LAYOUT.boxA.width / 2;
    const bTop = LAYOUT.boxB.x + LAYOUT.boxA.width / 2;

    // 第一步：移交——主进程把一对端口各递给两个窗口，移交即转让所有权
    drawingContext.strokeStyle = COLORS.portTint;
    drawingContext.fillStyle = COLORS.portTint;
    drawingContext.lineWidth = 1.5;
    drawingContext.setLineDash([5, 4]);
    drawArrow(mainCx - 20, LAYOUT.handoffY, aTop + 16, LAYOUT.handoffY, COLORS.portTint);
    drawArrow(mainCx + 20, LAYOUT.handoffY, bTop - 16, LAYOUT.handoffY, COLORS.portTint);
    drawingContext.setLineDash([]);
    drawingContext.textAlign = 'center';
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.portTint;
    drawingContext.fillText('① did-finish-load 后：移交一对端口（主进程退出）', mainCx, LAYOUT.handoffY - 10);
    drawingContext.textAlign = 'left';

    // 第二步：专线——窗口 A 与窗口 B 直接互发，路径绕开主进程
    const wireY = LAYOUT.wireY;
    const aBottom = LAYOUT.boxA.x + LAYOUT.boxA.width / 2;
    const bBottom = LAYOUT.boxB.x + LAYOUT.boxA.width / 2;
    if (bOnline) {
      drawingContext.strokeStyle = COLORS.ok;
      drawingContext.fillStyle = COLORS.ok;
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.moveTo(aBottom, wireY);
      drawingContext.lineTo(bBottom, wireY);
      drawingContext.stroke();
      drawArrowhead(bBottom, wireY, 0, COLORS.ok);
    } else {
      drawingContext.strokeStyle = '#e2e8f0';
      drawingContext.lineWidth = 2;
      drawingContext.setLineDash([5, 4]);
      drawingContext.beginPath();
      drawingContext.moveTo(aBottom, wireY);
      drawingContext.lineTo(bBottom - 26, wireY);
      drawingContext.stroke();
      drawingContext.setLineDash([]);
      drawCross(bBottom - 14, wireY);
    }

    drawingContext.textAlign = 'center';
    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = bOnline ? COLORS.text : COLORS.blocked;
    drawingContext.fillText(
      bOnline
        ? '② 专线：port.postMessage ⇄ onmessage（无通道名，只有对端）'
        : '② 专线已断：旧端口随页面上下文销毁，对端收到 close',
      mainCx,
      wireY + 22,
    );
    drawingContext.textAlign = 'left';
  }

  function drawVerdict(isRelay: boolean, bOnline: boolean, delivered: boolean) {
    const x = LAYOUT.boxA.x;
    drawingContext.textAlign = 'left';
    drawingContext.font = COLORS.note;

    const verdict = isRelay
      ? bOnline
        ? '消息结果：到达 —— 经主进程转发，窗口 B 的监听已就位'
        : '消息结果：丢失 —— B 未重新订阅，转发同样不排队、不补发'
      : bOnline
        ? '消息结果：到达 —— 端口专线直达 B，主进程看不到这条消息'
        : '消息结果：丢失 —— 对端旧端口已 close；did-finish-load 再握手即重建';

    drawingContext.fillStyle = delivered ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(verdict, x, LAYOUT.verdictY);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      isRelay
        ? '主进程看到这条消息：看到 —— 每条必经转发中心，可留痕、可校验来源'
        : '主进程看到这条消息：看不到 —— 移交完成后消息不再经过主进程',
      x,
      LAYOUT.verdictY + 24,
    );

    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillText(
      '行为模型模拟，不等于运行 Electron；真实项目的验证步骤见正文「快速上手」',
      x,
      LAYOUT.verdictY + 48,
    );
  }

  function drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) {
    drawingContext.strokeStyle = color;
    drawingContext.fillStyle = color;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2, y2);
    drawingContext.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    drawArrowhead(x2, y2, angle, color);
  }

  function drawArrowhead(x: number, y: number, angle: number, color: string) {
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    drawingContext.moveTo(x, y);
    drawingContext.lineTo(
      x - 9 * Math.cos(angle - Math.PI / 6),
      y - 9 * Math.sin(angle - Math.PI / 6),
    );
    drawingContext.lineTo(
      x - 9 * Math.cos(angle + Math.PI / 6),
      y - 9 * Math.sin(angle + Math.PI / 6),
    );
    drawingContext.closePath();
    drawingContext.fill();
  }

  function drawCross(x: number, y: number) {
    drawingContext.strokeStyle = COLORS.blocked;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x - 7, y - 7);
    drawingContext.lineTo(x + 7, y + 7);
    drawingContext.moveTo(x + 7, y - 7);
    drawingContext.lineTo(x - 7, y + 7);
    drawingContext.stroke();
  }

  function roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
