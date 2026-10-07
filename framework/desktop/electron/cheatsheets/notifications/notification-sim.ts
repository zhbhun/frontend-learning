/**
 * 范例介绍：模拟一次通知从主进程 show() 到用户点击的完整事件流。
 * 输入：控件 silent（不发系统提示音）、focusOnClick（click 事件里是否调用 win.show()）。
 * 操作：点「发通知」模拟渲染端经 IPC 触发；通知横幅出现后，点横幅触发 click，
 *       点横幅右上角 × 触发 close。
 * 预期：事件按 show → click →（可选 win.show()）→ close 顺序进入日志；
 *       勾选 focusOnClick 时点击横幅后窗口到前台聚焦，不勾选时窗口仍留在后台——
 *       即「点击通知不会自动聚焦窗口，要自己在 click 里调 win.show()」。
 * 阅读主线：通知是一段事件流——构造只创建对象，show() 才显示，用户行为以
 *           click / close 事件回流到主进程。本图按 macOS 横幅样式绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface NotificationSimOptions {
  silent: boolean;
  focusOnClick: boolean;
}

export interface NotificationSimSnapshot {
  eventsText: string;
  windowState: string;
  bannerState: string;
}

export interface NotificationSimInstance {
  update(options: NotificationSimOptions): void;
  dispose(): void;
}

type Phase = 'idle' | 'shown' | 'clicked' | 'closed';

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  boxBg: '#ffffff',
  boxBorder: '#cbd5e1',
  panelBg: '#f8fafc',
  windowIdle: '#e2e8f0',
  windowIdleBar: '#94a3b8',
  windowFocus: '#dbeafe',
  windowFocusBar: '#4f7cff',
  buttonBg: '#4f7cff',
  buttonHover: '#3b63e0',
  bannerBg: '#1f2937',
  bannerText: '#f8fafc',
  bannerMuted: '#9ca3af',
  closeHover: 'rgba(255, 255, 255, 0.18)',
  accent: '#4f7cff',
  ok: '#15803d',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '10px ui-monospace, SFMono-Regular, Menlo, monospace',
  label: '11px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  button: '600 14px ui-sans-serif, system-ui, sans-serif',
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LAYOUT = {
  title: { x: 48, y: 38 },
  windowBox: { x: 48, y: 66, width: 220, height: 200 },
  sendButton: { x: 76, y: 196, width: 120, height: 34 },
  arrow: { x: 276, y: 166 },
  banner: { x: 388, y: 96, width: 324, height: 76 },
  logBox: { x: 48, y: 296, width: 664, height: 96 },
};

export function createNotificationSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NotificationSimSnapshot) => void,
): NotificationSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: NotificationSimOptions = { silent: false, focusOnClick: true };
  let phase: Phase = 'idle';
  // 事件序列与真实回调同名：show / click / win.show() / close
  let events: string[] = [];
  let windowFocused = false;
  let hoverSend = false;
  let hoverBanner = false;
  let hoverClose = false;

  function reset(): void {
    events = [];
    windowFocused = false;
    phase = 'idle';
  }

  function snapshot(): NotificationSimSnapshot {
    const bannerState =
      phase === 'idle'
        ? '—（未发送）'
        : phase === 'shown'
          ? '显示中（可点击 / 关闭）'
          : phase === 'clicked'
            ? '已进通知中心'
            : '已关闭';
    return {
      eventsText: events.length > 0 ? events.join(' → ') : '—（等待操作）',
      windowState: windowFocused ? '前台聚焦' : '后台',
      bannerState,
    };
  }

  function roundRect(rect: Rect, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(rect.x + radius, rect.y);
    ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
    ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
    ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
    ctx.closePath();
  }

  function drawBox(rect: Rect, bg: string, border: string): void {
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    roundRect(rect, 8);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(): void {
    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.note;
    ctx.textAlign = 'left';
    ctx.fillText(
      '点「发通知」走一遍事件流：出现横幅后点横幅或点 ×',
      LAYOUT.title.x,
      LAYOUT.title.y,
    );
  }

  function drawWindow(): void {
    const box = LAYOUT.windowBox;
    drawBox(box, COLORS.panelBg, COLORS.boxBorder);

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText('应用窗口（模拟）', box.x + 16, box.y + 22);

    // 窗口 mock：聚焦时整块提亮，模拟被 win.show() 拉到前台
    const mock: Rect = { x: box.x + 16, y: box.y + 36, width: box.width - 32, height: 84 };
    ctx.fillStyle = windowFocused ? COLORS.windowFocus : COLORS.windowIdle;
    roundRect(mock, 6);
    ctx.fill();
    ctx.fillStyle = windowFocused ? COLORS.windowFocusBar : COLORS.windowIdleBar;
    roundRect({ x: mock.x, y: mock.y, width: mock.width, height: 18 }, 6);
    ctx.fill();
    ctx.fillStyle = windowFocused ? COLORS.text : COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText('导出报表', mock.x + 10, mock.y + 38);
    ctx.fillText(windowFocused ? '状态：前台聚焦' : '状态：后台', mock.x + 10, mock.y + 60);

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText('渲染进程：invoke("notify:send")', box.x + 16, box.y + 172);

    drawSendButton();
  }

  function drawSendButton(): void {
    const rect = LAYOUT.sendButton;
    ctx.fillStyle = hoverSend ? COLORS.buttonHover : COLORS.buttonBg;
    roundRect(rect, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = COLORS.button;
    ctx.textAlign = 'center';
    ctx.fillText('发通知', rect.x + rect.width / 2, rect.y + rect.height / 2 + 5);
    ctx.textAlign = 'left';
  }

  function drawArrow(): void {
    ctx.strokeStyle = COLORS.muted;
    ctx.fillStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(LAYOUT.arrow.x, LAYOUT.arrow.y);
    ctx.lineTo(LAYOUT.arrow.x + 88, LAYOUT.arrow.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(LAYOUT.arrow.x + 88, LAYOUT.arrow.y);
    ctx.lineTo(LAYOUT.arrow.x + 80, LAYOUT.arrow.y - 4);
    ctx.lineTo(LAYOUT.arrow.x + 80, LAYOUT.arrow.y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.font = COLORS.monoSmall;
    ctx.textAlign = 'center';
    ctx.fillText('IPC', LAYOUT.arrow.x + 44, LAYOUT.arrow.y - 10);
    ctx.textAlign = 'left';
  }

  function drawBanner(): void {
    if (phase === 'idle') {
      ctx.fillStyle = COLORS.muted;
      ctx.font = COLORS.label;
      ctx.fillText('通知横幅出现在这里', LAYOUT.banner.x, LAYOUT.banner.y + 40);
      return;
    }

    const banner = LAYOUT.banner;
    if (phase === 'shown') {
      ctx.fillStyle = COLORS.bannerBg;
      roundRect(banner, 12);
      ctx.fill();

      // 应用图标占位
      ctx.fillStyle = COLORS.accent;
      roundRect({ x: banner.x + 16, y: banner.y + 16, width: 44, height: 44 }, 10);
      ctx.fill();

      ctx.fillStyle = COLORS.bannerText;
      ctx.font = COLORS.header;
      ctx.fillText('新消息', banner.x + 76, banner.y + 32);
      ctx.font = COLORS.note;
      ctx.fillText('报表导出完成', banner.x + 76, banner.y + 54);
      ctx.fillStyle = options.silent ? COLORS.bannerMuted : COLORS.ok;
      ctx.font = COLORS.monoSmall;
      ctx.fillText(options.silent ? 'silent：无提示音' : '系统提示音', banner.x + 76, banner.y + 70);

      // 关闭 ×
      const close = closeRect();
      if (hoverClose) {
        ctx.fillStyle = COLORS.closeHover;
        roundRect(close, 6);
        ctx.fill();
      }
      ctx.strokeStyle = COLORS.bannerMuted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(close.x + 6, close.y + 6);
      ctx.lineTo(close.x + close.width - 6, close.y + close.height - 6);
      ctx.moveTo(close.x + close.width - 6, close.y + 6);
      ctx.lineTo(close.x + 6, close.y + close.height - 6);
      ctx.stroke();

      if (hoverBanner) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        roundRect(banner, 12);
        ctx.stroke();
      }
      return;
    }

    // clicked / closed：横幅收进通知中心，只留一行占位
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText(
      phase === 'clicked' ? '横幅收起，通知留在通知中心' : '通知已关闭',
      banner.x,
      banner.y + 40,
    );
  }

  function drawLog(): void {
    const box = LAYOUT.logBox;
    drawBox(box, COLORS.boxBg, COLORS.boxBorder);

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText('事件日志（主进程收到的回调顺序）', box.x + 16, box.y + 22);

    ctx.fillStyle = events.length > 0 ? COLORS.ok : COLORS.muted;
    ctx.font = COLORS.mono;
    const text =
      events.length > 0
        ? events.map((item, index) => `${index + 1} ${item}`).join('   ')
        : '等待操作…';
    ctx.fillText(text, box.x + 16, box.y + 52);

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.monoSmall;
    ctx.fillText(
      '对照正文：click 不会自动聚焦窗口，win.show() 是你在事件里自己调的',
      box.x + 16,
      box.y + 76,
    );
  }

  function closeRect(): Rect {
    const banner = LAYOUT.banner;
    return { x: banner.x + banner.width - 34, y: banner.y + 10, width: 24, height: 24 };
  }

  function drawFrame(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 416;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    drawTitle();
    drawWindow();
    drawArrow();
    drawBanner();
    drawLog();

    emit(snapshot());
  }

  function pointInRect(px: number, py: number, rect: Rect): boolean {
    return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function onMouseDown(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);

    if (pointInRect(x, y, LAYOUT.sendButton)) {
      // 重新发送视为新一轮：清空上一轮的事件序列
      reset();
      events = ['show'];
      phase = 'shown';
      drawFrame();
      return;
    }

    if (phase === 'shown' && pointInRect(x, y, closeRect())) {
      events = [...events, 'close'];
      phase = 'closed';
      drawFrame();
      return;
    }

    if (phase === 'shown' && pointInRect(x, y, LAYOUT.banner)) {
      // 用户点横幅：回调 click；聚焦窗口是你在回调里自己调的 win.show()
      events = [...events, 'click'];
      if (options.focusOnClick) {
        events = [...events, 'win.show()'];
        windowFocused = true;
      }
      phase = 'clicked';
      drawFrame();
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const overSend = pointInRect(x, y, LAYOUT.sendButton);
    const overClose = phase === 'shown' && pointInRect(x, y, closeRect());
    const overBanner = phase === 'shown' && pointInRect(x, y, LAYOUT.banner);
    const pointer = overSend || overClose || overBanner;

    if (overSend !== hoverSend || overBanner !== hoverBanner || overClose !== hoverClose) {
      hoverSend = overSend;
      hoverBanner = overBanner;
      hoverClose = overClose;
      canvas.style.cursor = pointer ? 'pointer' : 'default';
      drawFrame();
    }
  }

  function onMouseLeave(): void {
    if (hoverSend || hoverBanner || hoverClose) {
      hoverSend = false;
      hoverBanner = false;
      hoverClose = false;
      canvas.style.cursor = 'default';
      drawFrame();
    }
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  const resizeObserver = createResizeObserver(canvas, () => drawFrame());

  return {
    update(next) {
      // 切换控件改变的是下一轮发送的行为，清掉旧一轮的结果
      options = next;
      reset();
      hoverSend = false;
      hoverBanner = false;
      hoverClose = false;
      drawFrame();
    },
    dispose() {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      resizeObserver.disconnect();
    },
  };
}
