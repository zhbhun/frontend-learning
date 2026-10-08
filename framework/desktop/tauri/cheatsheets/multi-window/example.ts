/**
 * 范例介绍:在模拟桌面上演示多窗口的创建、关闭与消息投递如何围绕 label 协作。
 * 输入:Controls 的「发送方式」(emit / emitTo)与「目标 label」;前置状态是已有一个声明式窗口 main。
 * 主要操作:点「＋ 新建窗口」运行时创建;点窗口卡片右上角「×」关闭;点「发送消息」按当前方式投递。
 * 预期结果:emit 广播让所有窗口的「收到」计数加一;emitTo 只加目标窗口;目标不存在时显示投递失败。
 * 阅读主线:createWindow / closeWindow / send 三个方法分别对应正文的三类 Tauri API;
 * 真实运行验证步骤见课程目录 runtime-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SendMode = 'emit' | 'emitTo';

export interface ExampleArgs {
  mode: SendMode;
  target: string;
}

export interface DemoWindowState {
  label: string;
  origin: 'declarative' | 'runtime';
  received: number;
  lastMessage: string | null;
}

export interface ExampleSnapshot {
  windowLine: string;
  countLine: string;
  lastAction: string | null;
  error: string | null;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'create' | 'send' | 'close';
  label: string;
}

const MAX_WINDOWS = 6;
const ORIGIN_TEXT = { declarative: '声明式', runtime: '运行时' } as const;
const ORIGIN_COLOR = { declarative: '#2563eb', runtime: '#16a34a' } as const;

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ExampleArgs = { mode: 'emit', target: 'note-1' };
  let windows: DemoWindowState[] = [
    { label: 'main', origin: 'declarative', received: 0, lastMessage: null },
  ];
  let lastAction: string | null = null;
  let error: string | null = null;
  let sentCount = 0;
  let nextSeq = 1;
  let hits: HitArea[] = [];
  let hoverKey = '';

  // 对应 WebviewWindow.getByLabel / app.get_webview_window:label 是查找窗口的键
  function findWindow(label: string): DemoWindowState | undefined {
    return windows.find((w) => w.label === label);
  }

  // 对应 new WebviewWindow(label, ...):同一 label 不能创建两个窗口,先查重再创建
  function createWindow() {
    if (windows.length >= MAX_WINDOWS) {
      error = `演示上限:最多同时展示 ${MAX_WINDOWS} 个窗口`;
      lastAction = error;
      draw();
      return;
    }
    const label = `note-${nextSeq++}`;
    if (findWindow(label)) {
      error = `label ${label} 已存在,创建被拒绝`;
      lastAction = error;
      draw();
      return;
    }
    windows.push({ label, origin: 'runtime', received: 0, lastMessage: null });
    error = null;
    lastAction = `新建窗口 ${label}`;
    draw();
  }

  // 对应 window.close():走可拦截的关闭流程(destroy 才是强制销毁)
  function closeWindow(label: string) {
    windows = windows.filter((w) => w.label !== label);
    error = null;
    lastAction = `关闭窗口 ${label}`;
    draw();
  }

  // 对应 emit / emitTo:广播投给所有窗口,定向只投给匹配 label 的窗口
  function send() {
    sentCount += 1;
    const payload = `消息 #${sentCount}`;
    if (options.mode === 'emit') {
      windows.forEach((w) => {
        w.received += 1;
        w.lastMessage = payload;
      });
      error = null;
      lastAction = windows.length
        ? `emit 广播:${windows.length} 个窗口收到`
        : 'emit 广播:没有窗口,无人收到';
    } else {
      const targetWindow = findWindow(options.target);
      if (!targetWindow) {
        error = `emitTo("${options.target}"):目标不存在,无人收到`;
        lastAction = error;
      } else {
        targetWindow.received += 1;
        targetWindow.lastMessage = payload;
        error = null;
        lastAction = `emitTo("${options.target}"):仅它收到「${payload}」`;
      }
    }
    draw();
  }

  function hitAt(x: number, y: number): HitArea | undefined {
    return hits.find(
      (area) =>
        x >= area.x &&
        x <= area.x + area.width &&
        y >= area.y &&
        y <= area.y + area.height,
    );
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (line && drawingContext.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function drawWindowCard(
    x: number,
    y: number,
    w: number,
    h: number,
    win: DemoWindowState,
  ) {
    const titleHeight = 22;
    drawingContext.save();
    roundRect(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.stroke();
    drawingContext.clip();

    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(x, y, w, titleHeight);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(win.label, x + 8, y + 15);

    drawingContext.fillStyle = ORIGIN_COLOR[win.origin];
    drawingContext.font = '10px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      ORIGIN_TEXT[win.origin],
      x + 8 + drawingContext.measureText(win.label).width + 14,
      y + 15,
    );
    drawingContext.restore();

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`收到 ${win.received} 条`, x + 8, y + titleHeight + 16);

    drawingContext.fillStyle = '#94a3b8';
    drawingContext.fillText(
      win.lastMessage ? `最近:${win.lastMessage}` : '最近:—',
      x + 8,
      y + titleHeight + 32,
    );

    // 关闭按钮:点击对应 window.close()
    const buttonSize = 16;
    const buttonX = x + w - buttonSize - 4;
    const buttonY = y + (titleHeight - buttonSize) / 2;
    if (hoverKey === `close:${win.label}`) {
      roundRect(buttonX, buttonY, buttonSize, buttonSize, 4);
      drawingContext.fillStyle = '#fecaca';
      drawingContext.fill();
    }
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(
      '×',
      buttonX + buttonSize / 2,
      buttonY + buttonSize / 2 + 4,
    );
    drawingContext.textAlign = 'left';

    hits.push({
      x: buttonX,
      y: buttonY,
      width: buttonSize,
      height: buttonSize,
      action: 'close',
      label: win.label,
    });
  }

  function drawDesktop(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#eef2f8';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.stroke();

    if (windows.length === 0) {
      drawingContext.fillStyle = '#64748b';
      drawingContext.textAlign = 'center';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('没有窗口', x + w / 2, y + h / 2 - 10);
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '真实应用在最后一个窗口关闭后默认退出',
        x + w / 2,
        y + h / 2 + 12,
      );
      drawingContext.textAlign = 'left';
      return;
    }

    const cols = 2;
    const rows = Math.ceil(windows.length / cols);
    const gap = 10;
    const pad = 12;
    const cardWidth = (w - pad * 2 - gap) / cols;
    const cardHeight = Math.min((h - pad * 2 - (rows - 1) * gap) / rows, 116);

    windows.forEach((win, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      drawWindowCard(
        x + pad + col * (cardWidth + gap),
        y + pad + row * (cardHeight + gap),
        cardWidth,
        cardHeight,
        win,
      );
    });
  }

  function drawButton(
    x: number,
    y: number,
    w: number,
    h: number,
    action: 'create' | 'send',
    text: string,
    color: string,
    hoverColor: string,
  ) {
    roundRect(x, y, w, h, 7);
    drawingContext.fillStyle = hoverKey === `${action}:` ? hoverColor : color;
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(text, x + w / 2, y + h / 2 + 4);
    drawingContext.textAlign = 'left';
    hits.push({ x, y, width: w, height: h, action, label: '' });
  }

  function drawPanel(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('发送设置(由 Controls 控制)', x, y + 10);

    drawingContext.fillStyle = '#172033';
    drawingContext.font =
      '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `方式 ${options.mode} · 目标 ${options.target || '(空)'}`,
      x,
      y + 30,
    );

    drawButton(
      x,
      y + 44,
      w,
      34,
      'create',
      '＋ 新建窗口(WebviewWindow)',
      '#4f7cff',
      '#3b62e0',
    );
    drawButton(
      x,
      y + 86,
      w,
      34,
      'send',
      '发送消息(emit / emitTo)',
      '#334155',
      '#1e293b',
    );

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('最近操作', x, y + 144);

    drawingContext.fillStyle = error ? '#dc2626' : '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    const statusText = lastAction ?? '尚无操作:创建窗口后发送消息';
    wrapText(statusText, w)
      .slice(0, 4)
      .forEach((line, index) => {
        drawingContext.fillText(line, x, y + 162 + index * 17);
      });
  }

  function snapshot(): ExampleSnapshot {
    const windowLine = windows.length
      ? `${windows.length} 个:${windows
          .map((w) => `${w.label}(${ORIGIN_TEXT[w.origin]})`)
          .join('、')}`
      : '无(真实应用此时默认退出)';
    const countLine = windows.length
      ? windows.map((w) => `${w.label} ${w.received} 条`).join(' · ')
      : '—';
    return { windowLine, countLine, lastAction, error };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(620, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    hits = [];
    const mid = Math.round(width / 2);
    const areaTop = 44;
    const areaBottom = height - 86;
    drawDesktop(12, areaTop, mid - 38, areaBottom - areaTop);
    drawPanel(mid - 12, areaTop, width - mid - 2, areaBottom - areaTop);

    emit(snapshot());
  }

  function handleMove(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    const key = hit ? `${hit.action}:${hit.label}` : '';
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (key !== hoverKey) {
      hoverKey = key;
      draw();
    }
  }

  function handleClick(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    if (!hit) {
      return;
    }
    if (hit.action === 'create') {
      createWindow();
    } else if (hit.action === 'send') {
      send();
    } else if (hit.action === 'close') {
      closeWindow(hit.label);
    }
  }

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      options = { ...next, target: next.target.trim() };
      draw();
    },
    dispose() {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
    },
  };
}
