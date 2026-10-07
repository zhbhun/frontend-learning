/**
 * 范例介绍：模拟一次窗口加载的时间线，演示主进程推送的送达条件。
 * 输入：主进程的推送时机（窗口创建后立即 / did-finish-load 之后 / 收到就绪信号后）
 *       与接收端的监听注册位置（preload 里 / 页面脚本同步注册 / 页面异步初始化后注册）。
 * 操作：切换两个控件，观察消息箭头落在时间线的哪个位置、到达还是丢弃。
 * 预期：推送时刻晚于监听注册时刻 → 到达；否则丢弃——消息不排队、不补发。
 * 阅读主线：推送没有送达保证，「什么时候发」和「怎么发」同样需要设计。
 * 这是行为模型模拟，不等于运行 Electron；真实项目的验证步骤见正文「快速上手」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PushTiming =
  | '立即（窗口创建后）'
  | 'did-finish-load 之后'
  | '收到就绪信号后';

export type ListenAt =
  | 'preload 里'
  | '页面脚本同步注册'
  | '页面异步初始化后注册';

export interface PushSimOptions {
  pushTiming: PushTiming;
  listenAt: ListenAt;
}

export interface PushSimSnapshot {
  pushTiming: PushTiming;
  listenAt: ListenAt;
  delivered: boolean;
}

export interface PushSimInstance {
  update(options: PushSimOptions): void;
  dispose(): void;
}

// 时间线模型：t0-t5 六个时刻；送达判断 = 推送时刻严格晚于监听注册时刻
const PUSH_TIME: Record<PushTiming, number> = {
  '立即（窗口创建后）': 0,
  'did-finish-load 之后': 3,
  '收到就绪信号后': 5,
};

const LISTEN_TIME: Record<ListenAt, number> = {
  'preload 里': 1,
  '页面脚本同步注册': 2,
  '页面异步初始化后注册': 4,
};

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  ok: '#15803d',
  blocked: '#dc2626',
  pushTint: 'rgba(79, 124, 255, 0.14)',
  listenTint: 'rgba(21, 128, 61, 0.14)',
  mono: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
};

// 面板与时间行的固定布局：左右两栏，中间 84px 间隙显示消息去向
const LAYOUT = {
  top: 96,
  height: 270,
  leftPanel: { x: 48, width: 270 },
  rightPanel: { x: 402, width: 270 },
  gapLeft: 322,
  gapRight: 398,
  rowY: [150, 186, 222, 258, 294, 330],
};

interface TimelineRow {
  time: number;
  label: string;
}

const LEFT_ROWS: TimelineRow[] = [
  { time: 0, label: '创建窗口，loadFile 开始' },
  { time: 3, label: 'did-finish-load' },
  { time: 5, label: '收到就绪信号 → send' },
];

const RIGHT_ROWS: TimelineRow[] = [
  { time: 1, label: 'preload 执行 · 注册点 A' },
  { time: 2, label: '页面脚本执行 · 注册点 B' },
  { time: 4, label: '异步初始化完成 · 注册点 C' },
  { time: 5, label: '就绪信号（先注册，再喊就绪）' },
];

export function createPushSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PushSimSnapshot) => void,
): PushSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PushSimOptions = {
    pushTiming: '立即（窗口创建后）',
    listenAt: '页面脚本同步注册',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = 440;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const pushTime = PUSH_TIME[current.pushTiming];
    const listenTime = LISTEN_TIME[current.listenAt];
    // 送达判断与正文一致：推送时刻晚于监听注册时刻才到达
    const delivered = pushTime > listenTime;

    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.fillText(
      '切换「推送时机」与「监听注册」，观察中间的消息去向',
      LAYOUT.leftPanel.x,
      56,
    );

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillText('时间从上往下', LAYOUT.leftPanel.x, 82);

    drawPanel(LAYOUT.leftPanel.x, '主进程 · 事件源与推送');
    drawPanel(LAYOUT.rightPanel.x, '渲染进程 · 监听注册');

    drawRows(LEFT_ROWS, LAYOUT.leftPanel.x, pushTime, COLORS.pushTint);
    drawRows(RIGHT_ROWS, LAYOUT.rightPanel.x, listenTime, COLORS.listenTint);
    drawTransfer(pushTime, listenTime, delivered);

    drawVerdict(delivered);

    emit({
      pushTiming: current.pushTiming,
      listenAt: current.listenAt,
      delivered,
    });
  }

  function drawPanel(x: number, title: string) {
    drawingContext.fillStyle = COLORS.panelBg;
    drawingContext.strokeStyle = COLORS.panelBorder;
    drawingContext.lineWidth = 1;
    roundRect(x, LAYOUT.top, LAYOUT.leftPanel.width, LAYOUT.height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.fillText(title, x + 16, LAYOUT.top + 28);
  }

  function drawRows(
    rows: TimelineRow[],
    panelX: number,
    selectedTime: number,
    tint: string,
  ) {
    for (const row of rows) {
      const y = LAYOUT.rowY[row.time];

      if (row.time === selectedTime) {
        drawingContext.fillStyle = tint;
        roundRect(panelX + 8, y - 15, LAYOUT.leftPanel.width - 16, 28, 6);
        drawingContext.fill();
      }

      drawingContext.textAlign = 'left';
      drawingContext.font = COLORS.monoSmall;
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText(`t${row.time}`, panelX + 16, y + 4);

      drawingContext.font = COLORS.mono;
      drawingContext.fillStyle = COLORS.text;
      drawingContext.fillText(row.label, panelX + 46, y + 4);
    }
  }

  function drawTransfer(
    pushTime: number,
    listenTime: number,
    delivered: boolean,
  ) {
    const pushY = LAYOUT.rowY[pushTime];
    drawingContext.textAlign = 'center';

    if (delivered) {
      const listenY = LAYOUT.rowY[listenTime];
      drawArrow(LAYOUT.gapLeft, pushY, LAYOUT.gapRight, listenY, COLORS.ok);
      drawingContext.font = COLORS.monoSmall;
      drawingContext.fillStyle = COLORS.ok;
      drawingContext.fillText(
        '到达',
        (LAYOUT.gapLeft + LAYOUT.gapRight) / 2,
        Math.min(pushY, listenY) - 10,
      );
    } else {
      drawArrow(
        LAYOUT.gapLeft,
        pushY,
        LAYOUT.gapLeft + 28,
        pushY,
        COLORS.blocked,
      );
      drawCross(LAYOUT.gapLeft + 44, pushY);
      drawingContext.font = COLORS.monoSmall;
      drawingContext.fillStyle = COLORS.blocked;
      drawingContext.fillText(
        '没有监听',
        (LAYOUT.gapLeft + LAYOUT.gapRight) / 2,
        pushY + 24,
      );
    }

    drawingContext.textAlign = 'left';
  }

  function drawVerdict(delivered: boolean) {
    const x = LAYOUT.leftPanel.x;
    const y = LAYOUT.top + LAYOUT.height + 32;
    drawingContext.textAlign = 'left';
    drawingContext.font = COLORS.note;

    drawingContext.fillStyle = delivered ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(
      delivered
        ? '消息结果：到达——推送时刻晚于监听注册时刻'
        : '消息结果：丢失——发送时接收端还没有监听，消息不排队',
      x,
      y,
    );

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      '行为模型模拟，不等于运行 Electron；真实项目的验证步骤见正文「快速上手」',
      x,
      y + 22,
    );
  }

  function drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    drawingContext.strokeStyle = color;
    drawingContext.fillStyle = color;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2, y2);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(x2, y2);
    drawingContext.lineTo(
      x2 - 9 * Math.cos(angle - Math.PI / 6),
      y2 - 9 * Math.sin(angle - Math.PI / 6),
    );
    drawingContext.lineTo(
      x2 - 9 * Math.cos(angle + Math.PI / 6),
      y2 - 9 * Math.sin(angle + Math.PI / 6),
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
