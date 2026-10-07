/**
 * 范例介绍：模拟 ipcRenderer.invoke 与 ipcMain.handle 的请求响应全链路。
 * 输入：控件「handler 状态」决定主进程 handler 此刻的行为——返回结果、
 *       抛出 Error、挂起不返回、通道未注册。
 * 操作：点击画布中的「调用 invoke」按钮发起一次请求。
 * 预期：返回结果 → Promise fulfilled，结果 "dark"；抛出 Error → rejected，
 *       渲染端只剩 message；未注册 → rejected: No handler registered…；
 *       挂起不返回 → Promise 恒为 pending，「已等待」持续增长（无内建超时）。
 * 阅读主线：请求包从渲染进程经通道进入主进程，结局沿通道回到等待中的 Promise。
 * 这是行为模型模拟，时序不代表真实延迟；真实项目的验证步骤见正文「快速上手」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type HandlerState = '返回结果' | '抛出 Error' | '挂起不返回' | '未注册';

export interface InvokeSimOptions {
  handlerState: HandlerState;
}

export interface InvokeSimSnapshot {
  handlerState: HandlerState;
  promiseText: string;
  elapsedText: string;
}

export interface InvokeSimInstance {
  update(options: InvokeSimOptions): void;
  dispose(): void;
}

const CHANNEL = 'settings:get';

// 模拟时序（毫秒）：请求飞行 → handler 处理 → 响应飞行
const REQUEST_MS = 500;
const PROCESS_MS = 350;
const RESPONSE_MS = 500;
const TOTAL_OK_MS = REQUEST_MS + PROCESS_MS + RESPONSE_MS;
const TOTAL_MISSING_MS = REQUEST_MS + RESPONSE_MS;

const RESULT_TEXT = 'fulfilled: "dark"';
const THROW_TEXT = 'rejected: Error: 配置键不存在: theme';
const MISSING_TEXT = `rejected: Error: No handler registered for '${CHANNEL}'`;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  boxBg: '#ffffff',
  boxBorder: '#8fa0b8',
  ok: '#15803d',
  blocked: '#dc2626',
  pending: '#b45309',
  bridge: '#4f7cff',
  buttonBg: '#4f7cff',
  buttonHover: '#3b63e0',
  buttonText: '#ffffff',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '10px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  label: '11px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
  button: '600 14px ui-sans-serif, system-ui, sans-serif',
  packet: '600 11px ui-sans-serif, system-ui, sans-serif',
};

// 面板与内部盒子的固定布局：左侧渲染进程，右侧主进程，中间 104px 通道区
const LAYOUT = {
  title: { x: 48, y: 40 },
  panel: {
    top: 66,
    height: 306,
    left: { x: 48, width: 280 },
    right: { x: 432, width: 280 },
  },
  pageBox: { x: 64, y: 108, width: 248, height: 88 },
  wrapBox: { x: 64, y: 214, width: 248, height: 60 },
  button: { x: 128, y: 296, width: 120, height: 42 },
  registryBox: { x: 448, y: 108, width: 248, height: 64 },
  execBox: { x: 448, y: 196, width: 248, height: 140 },
  channel: { x1: 328, x2: 432, y: 244 },
  footer: { x: 48, y: 410 },
};

type Phase = 'idle' | 'request' | 'processing' | 'response' | 'settled' | 'hanging';

interface Line {
  text: string;
  color: string;
}

export function createInvokeSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InvokeSimSnapshot) => void,
): InvokeSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let handlerState: HandlerState = '返回结果';
  let startTime: number | null = null;
  let rafId = 0;
  let hoverButton = false;

  // 结局与正文一致：handler 行为决定 Promise 的四种结局之一
  function phaseAt(elapsed: number): Phase {
    if (startTime === null) {
      return 'idle';
    }
    if (handlerState === '未注册') {
      if (elapsed < REQUEST_MS) {
        return 'request';
      }
      if (elapsed < TOTAL_MISSING_MS) {
        return 'response';
      }
      return 'settled';
    }
    if (handlerState === '挂起不返回') {
      return elapsed < REQUEST_MS ? 'request' : 'hanging';
    }
    if (elapsed < REQUEST_MS) {
      return 'request';
    }
    if (elapsed < TOTAL_OK_MS - RESPONSE_MS) {
      return 'processing';
    }
    if (elapsed < TOTAL_OK_MS) {
      return 'response';
    }
    return 'settled';
  }

  function promiseLine(phase: Phase): Line {
    if (phase === 'idle') {
      return { text: 'Promise: —', color: COLORS.muted };
    }
    if (phase === 'settled') {
      return handlerState === '返回结果'
        ? { text: 'Promise: fulfilled', color: COLORS.ok }
        : { text: 'Promise: rejected', color: COLORS.blocked };
    }
    return { text: 'Promise: pending…', color: COLORS.pending };
  }

  function pageNote(elapsed: number, phase: Phase): Line | null {
    if (phase === 'hanging') {
      return { text: `已等待 ${(elapsed / 1000).toFixed(1)} s`, color: COLORS.pending };
    }
    if (phase === 'settled') {
      if (handlerState === '返回结果') {
        return {
          text: `结果 "dark" · 用时 ${(TOTAL_OK_MS / 1000).toFixed(2)} s`,
          color: COLORS.muted,
        };
      }
      if (handlerState === '抛出 Error') {
        return { text: '配置键不存在: theme', color: COLORS.blocked };
      }
      return { text: 'No handler registered', color: COLORS.blocked };
    }
    return null;
  }

  function execLines(phase: Phase): Line[] {
    if (phase === 'idle' || phase === 'request') {
      return [{ text: '（等待请求）', color: COLORS.muted }];
    }
    if (handlerState === '挂起不返回') {
      if (phase === 'hanging') {
        return [
          { text: 'await new Promise(() => {})', color: COLORS.text },
          { text: '永不落定 · 无内建超时', color: COLORS.muted },
        ];
      }
      return [{ text: '执行中…', color: COLORS.muted }];
    }
    if (handlerState === '未注册') {
      return [
        { text: '（本通道没有 handler）', color: COLORS.muted },
        { text: 'IPC 层直接拒绝', color: COLORS.muted },
      ];
    }
    if (handlerState === '抛出 Error') {
      const lines: Line[] = [
        { text: 'throw new Error(', color: COLORS.blocked },
        { text: `'配置键不存在: theme')`, color: COLORS.blocked },
      ];
      if (phase === 'settled') {
        lines.push({ text: '只有 message 过桥', color: COLORS.muted });
      }
      return lines;
    }
    if (phase === 'processing') {
      return [{ text: '执行中…', color: COLORS.muted }];
    }
    return [
      { text: "return 'dark';", color: COLORS.ok },
      { text: '返回值结构化克隆回渲染端', color: COLORS.muted },
    ];
  }

  function snapshot(elapsed: number, phase: Phase): InvokeSimSnapshot {
    let promiseText = 'pending…（无内建超时）';
    let elapsedText = `${(elapsed / 1000).toFixed(1)} s`;
    if (phase === 'idle') {
      promiseText = '—';
      elapsedText = '—';
    } else if (phase === 'settled') {
      if (handlerState === '返回结果') {
        promiseText = RESULT_TEXT;
      } else if (handlerState === '抛出 Error') {
        promiseText = THROW_TEXT;
      } else {
        promiseText = MISSING_TEXT;
      }
      const total = handlerState === '未注册' ? TOTAL_MISSING_MS : TOTAL_OK_MS;
      elapsedText = `${(total / 1000).toFixed(2)} s`;
    }
    return { handlerState, promiseText, elapsedText };
  }

  function roundRect(rect: Rect, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(rect.x + radius, rect.y);
    ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
    ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
    ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
    ctx.closePath();
  }

  function drawBox(rect: Rect): void {
    ctx.fillStyle = COLORS.boxBg;
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.lineWidth = 1;
    roundRect(rect, 8);
    ctx.fill();
    ctx.stroke();
  }

  function drawLabel(rect: Rect, title: string): void {
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.textAlign = 'left';
    ctx.fillText(title, rect.x + 16, rect.y + 22);
  }

  function drawTitle(): void {
    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.note;
    ctx.textAlign = 'left';
    ctx.fillText('切换「handler 状态」，点击「调用 invoke」发起一次请求', LAYOUT.title.x, LAYOUT.title.y);
  }

  function drawPanel(panel: { x: number; width: number }, title: string): void {
    const rect = { x: panel.x, y: LAYOUT.panel.top, width: panel.width, height: LAYOUT.panel.height };
    ctx.fillStyle = COLORS.panelBg;
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    roundRect(rect, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.header;
    ctx.textAlign = 'left';
    ctx.fillText(title, rect.x + 16, rect.y + 28);
  }

  function drawPageBox(elapsed: number, phase: Phase): void {
    const box = LAYOUT.pageBox;
    drawBox(box);

    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.mono;
    ctx.textAlign = 'left';
    ctx.fillText("window.settings.get('theme')", box.x + 16, box.y + 26);

    const promise = promiseLine(phase);
    ctx.fillStyle = promise.color;
    ctx.fillText(promise.text, box.x + 16, box.y + 50);

    const note = pageNote(elapsed, phase);
    if (note) {
      ctx.fillStyle = note.color;
      ctx.fillText(note.text, box.x + 16, box.y + 72);
    }
  }

  function drawWrapBox(phase: Phase): void {
    const box = LAYOUT.wrapBox;
    drawBox(box);
    drawLabel(box, '预加载暴露面（包装 invoke）');

    ctx.fillStyle = phase === 'request' ? COLORS.bridge : COLORS.text;
    ctx.font = COLORS.monoSmall;
    ctx.textAlign = 'left';
    ctx.fillText(`invoke('${CHANNEL}', 'theme')`, box.x + 16, box.y + 44);
  }

  function drawArrowHead(x: number, y: number, direction: 'left' | 'right'): void {
    const sign = direction === 'left' ? 1 : -1;
    ctx.fillStyle = COLORS.muted;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sign * 8, y - 4);
    ctx.lineTo(x + sign * 8, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawPacket(x: number, y: number, label: string, color: string): void {
    ctx.fillStyle = color;
    roundRect({ x: x - 20, y: y - 9, width: 40, height: 18 }, 5);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = COLORS.packet;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 4);
    ctx.textAlign = 'left';
  }

  function drawChannel(phase: Phase, elapsed: number): void {
    const { x1, x2, y } = LAYOUT.channel;

    // 通道基线：两端箭头表示双向
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1 + 10, y);
    ctx.lineTo(x2 - 10, y);
    ctx.stroke();
    drawArrowHead(x1 + 10, y, 'left');
    drawArrowHead(x2 - 10, y, 'right');

    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.fillText('通道', (x1 + x2) / 2, y - 18);
    ctx.font = COLORS.monoSmall;
    ctx.fillText(CHANNEL, (x1 + x2) / 2, y + 22);
    ctx.textAlign = 'left';

    // 飞行中的包：请求从左到右，响应（返回值或错误）从右到左
    if (phase === 'request') {
      const progress = Math.min(1, elapsed / REQUEST_MS);
      drawPacket(x1 + 10 + (x2 - x1 - 20) * progress, y, '请求', COLORS.bridge);
    } else if (phase === 'response') {
      const start = handlerState === '未注册' ? REQUEST_MS : TOTAL_OK_MS - RESPONSE_MS;
      const progress = Math.min(1, Math.max(0, (elapsed - start) / RESPONSE_MS));
      const isValue = handlerState === '返回结果';
      drawPacket(
        x2 - 10 - (x2 - x1 - 20) * progress,
        y,
        isValue ? '返回' : 'Error',
        isValue ? COLORS.ok : COLORS.blocked,
      );
    }
  }

  function drawRegistryBox(): void {
    const box = LAYOUT.registryBox;
    drawBox(box);
    drawLabel(box, 'handler 注册表 · ipcMain.handle');

    ctx.font = COLORS.mono;
    ctx.textAlign = 'left';
    if (handlerState === '未注册') {
      ctx.fillStyle = COLORS.blocked;
      ctx.fillText(`${CHANNEL} →（未注册）`, box.x + 16, box.y + 46);
    } else {
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`handle('${CHANNEL}', …)`, box.x + 16, box.y + 46);
    }
  }

  function drawExecBox(phase: Phase, elapsed: number): void {
    const box = LAYOUT.execBox;
    drawBox(box);
    drawLabel(box, 'handler 执行');

    ctx.font = COLORS.mono;
    ctx.textAlign = 'left';
    execLines(phase).forEach((line, index) => {
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, box.x + 16, box.y + 46 + index * 22);
    });

    // 挂起时的等待计时
    if (phase === 'hanging') {
      ctx.fillStyle = COLORS.muted;
      ctx.font = COLORS.label;
      ctx.fillText(`Promise 已 pending ${(elapsed / 1000).toFixed(1)} s`, box.x + 16, box.y + 118);
    }
  }

  function drawButton(): void {
    const rect = LAYOUT.button;
    ctx.fillStyle = hoverButton ? COLORS.buttonHover : COLORS.buttonBg;
    roundRect(rect, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = COLORS.button;
    ctx.textAlign = 'center';
    ctx.fillText('调用 invoke', rect.x + rect.width / 2, rect.y + rect.height / 2 + 5);
    ctx.textAlign = 'left';
  }

  function drawFooter(): void {
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.textAlign = 'left';
    ctx.fillText('本图为行为模型模拟，时序非真实延迟；真实项目验证见正文「快速上手」', LAYOUT.footer.x, LAYOUT.footer.y);
  }

  function drawFrame(now: number): void {
    const elapsed = startTime === null ? 0 : now - startTime;
    const phase = phaseAt(elapsed);

    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = 430;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    drawTitle();
    drawPanel(LAYOUT.panel.left, '渲染进程');
    drawPanel(LAYOUT.panel.right, '主进程');
    drawPageBox(elapsed, phase);
    drawWrapBox(phase);
    drawChannel(phase, elapsed);
    drawRegistryBox();
    drawExecBox(phase, elapsed);
    drawButton();
    drawFooter();

    emit(snapshot(elapsed, phase));
  }

  function tick(now: number): void {
    drawFrame(now);
    const elapsed = startTime === null ? 0 : now - startTime;
    // 已落定就停帧；挂起态持续计时，直到切换控件或离开页面
    if (startTime !== null && phaseAt(elapsed) !== 'settled') {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  }

  function startInvoke(): void {
    startTime = performance.now();
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
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
    if (pointInRect(x, y, LAYOUT.button)) {
      startInvoke();
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const hover = pointInRect(x, y, LAYOUT.button);
    if (hover !== hoverButton) {
      hoverButton = hover;
      canvas.style.cursor = hover ? 'pointer' : 'default';
      drawFrame(performance.now());
    }
  }

  function onMouseLeave(): void {
    if (hoverButton) {
      hoverButton = false;
      canvas.style.cursor = 'default';
      drawFrame(performance.now());
    }
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  const resizeObserver = createResizeObserver(canvas, () => drawFrame(performance.now()));

  return {
    update(options) {
      handlerState = options.handlerState;
      // 切换 handler 状态视为新的前置条件，进行中的请求重置
      startTime = null;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      drawFrame(performance.now());
    },
    dispose() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      resizeObserver.disconnect();
    },
  };
}
