/**
 * 演示内容：GlobalShortcut 注册与触发的判定链——register 成功时回调进主进程处理表
 * （按 accelerator 原字符串建键）；组合键在系统任意位置被按下时，原生层携带
 * accelerator 字符串回调 JS，按字符串查表执行 callback（回调无参数）。register
 * 返回 false 的三条路径：无原生环境（短路）、本应用重复注册同一字符串（短路）、
 * 原生层拒绝（组合被其他应用占用）。注销移除处理表条目并返回布尔值。
 * 输入：systemState（free 组合空闲 / other-app 被其他应用占用 / no-native 无原生环境）。
 * 操作：点 register() / 按下组合键 / unregister() / unregisterAll()，观察判定流。
 * 预期结果：读数显示 register 返回值、isRegistered 探测与处理表条目数；日志面板
 * 逐步显示每步判定。真实系统热键行为以课程目录的 global-shortcut-observer.ts 桌面范例为准。
 * 阅读主线：doRegister / doPress / doUnregister / doUnregisterAll 四个函数复现
 * 1.18.1 包内 GlobalShortcut 四方法的分支顺序，draw() 只负责呈现。
 * unregister 对未注册字符串的原生返回值按 false 示意；包内实现中「返回 true 才移除
 * 处理表条目」这一点与示意一致。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SystemState = 'free' | 'other-app' | 'no-native';

export interface ShortcutRegistryFlowOptions {
  systemState: SystemState;
}

export interface ShortcutRegistryFlowSnapshot {
  registerResult: string;
  probe: string;
  handlerCount: number;
}

export interface ShortcutRegistryFlowInstance {
  update(options: ShortcutRegistryFlowOptions): void;
  dispose(): void;
}

type Tone = 'ok' | 'fail' | 'info';

interface LogEntry {
  text: string;
  tone: Tone;
}

// 示意固定围绕一个 accelerator（官方 kitchen playground 的默认组合）
const ACCELERATOR = 'CommandOrControl+Shift+T';

const STATE_LABELS: Record<SystemState, string> = {
  free: 'free（组合空闲，可注册）',
  'other-app': 'other-app（被其他应用占用）',
  'no-native': 'no-native（无原生环境）',
};

const BAR_HEIGHT = 34;
const BUTTON_HEIGHT = 34;
const HANDLER_PANEL_HEIGHT = 108;
const LOG_PANEL_HEIGHT = 136;

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  barBg: '#e8edf5',
  barBorder: '#cbd5e1',
  buttonBg: '#ffffff',
  hoverSoft: 'rgba(79, 124, 255, 0.16)',
  accent: '#4f7cff',
  fail: '#b91c1c',
  panelBg: '#f6f8fb',
  panelBorder: '#cbd5e1',
};

const ACTION_LABELS = ['register()', '按下组合键', 'unregister()', 'unregisterAll()'];

// 面板文字按宽度断行，避免超出方框
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split('');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    if (line && context.measureText(line + token).width > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line += token;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

export function createShortcutRegistryFlowSchematic(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShortcutRegistryFlowSnapshot) => void,
): ShortcutRegistryFlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let systemState: SystemState = 'free';
  // 处理表条目：示意里只有一个 accelerator，用 string | null 表示有无条目
  let handler: string | null = null;
  let registerResult = '—';
  let log: LogEntry[] = [];
  let hoverIndex = -1;

  // draw() 时重算的按钮命中区域
  let buttonRects: Array<{ x: number; y: number; width: number }> = [];

  function push(text: string, tone: Tone) {
    log = [...log, { text, tone }].slice(-5);
  }

  // 复现 1.18.1 包内 register 的分支顺序：
  // !native → false；本应用已注册同一字符串 → false；原生层拒绝 → false。
  function doRegister() {
    if (systemState === 'no-native') {
      registerResult = 'false';
      push('register() → false（无原生环境，未调用原生层）', 'fail');
      return;
    }
    if (handler !== null) {
      registerResult = 'false';
      push('register() → false（本应用已注册同一字符串，直接短路）', 'fail');
      return;
    }
    if (systemState === 'other-app') {
      registerResult = 'false';
      push('register() → false（原生层拒绝：组合被其他应用占用）', 'fail');
      return;
    }
    handler = ACCELERATOR;
    registerResult = 'true';
    push('register() → true（原生注册成功，处理表新增条目）', 'ok');
  }

  // 组合键在系统任意位置按下：原生回调携带 accelerator 字符串 → 处理表查表 → callback()
  function doPress() {
    if (systemState === 'no-native') {
      push('按下组合键 → 无原生回调链路，没有任何分发', 'info');
      return;
    }
    if (handler !== null) {
      push(
        `原生回调("${ACCELERATOR}") → 处理表命中 → callback() 执行`,
        'ok',
      );
      return;
    }
    if (systemState === 'other-app') {
      push('按下组合键 → 触发的是占用方应用的回调，本应用无条目', 'info');
      return;
    }
    push('按下组合键 → 本应用未注册该组合，无回调', 'info');
  }

  function doUnregister() {
    if (systemState === 'no-native') {
      push('unregister() → false（无原生环境）', 'fail');
      return;
    }
    if (handler === null) {
      push('unregister() → false（该字符串未注册）', 'fail');
      return;
    }
    handler = null;
    push('unregister() → true（原生注销 + 处理表条目移除）', 'ok');
  }

  function doUnregisterAll() {
    if (handler !== null) {
      handler = null;
      push('unregisterAll() → 原生全清 + 处理表清空（返回 void）', 'ok');
    } else {
      push('unregisterAll() → 处理表已空（幂等，返回 void）', 'info');
    }
  }

  const runners: Array<() => void> = [
    doRegister,
    doPress,
    doUnregister,
    doUnregisterAll,
  ];

  function probe(): string {
    if (systemState === 'no-native') return 'false';
    return handler !== null ? 'true' : 'false';
  }

  function hitButton(mx: number, my: number): number {
    return buttonRects.findIndex(
      (rect) =>
        mx >= rect.x &&
        mx <= rect.x + rect.width &&
        my >= rect.y &&
        my <= rect.y + BUTTON_HEIGHT,
    );
  }

  function onClick(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const index = hitButton(event.clientX - rect.left, event.clientY - rect.top);
    if (index >= 0) {
      runners[index]();
      draw();
    }
  }

  function onPointerMove(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const index = hitButton(event.clientX - rect.left, event.clientY - rect.top);
    if (index !== hoverIndex) {
      hoverIndex = index;
      draw();
    }
    canvas.style.cursor = index >= 0 ? 'pointer' : 'default';
  }

  function drawButton(
    x: number,
    y: number,
    width: number,
    label: string,
    index: number,
  ) {
    const isHover = hoverIndex === index;
    ctx.fillStyle = COLORS.buttonBg;
    ctx.beginPath();
    ctx.roundRect(x, y, width, BUTTON_HEIGHT, 6);
    ctx.fill();
    ctx.strokeStyle = isHover ? COLORS.accent : COLORS.barBorder;
    ctx.lineWidth = isHover ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, BUTTON_HEIGHT, 6);
    ctx.stroke();

    ctx.fillStyle = isHover ? COLORS.heading : COLORS.muted;
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + BUTTON_HEIGHT / 2 + 4.5);
    ctx.textAlign = 'left';
  }

  function drawHandlerPanel(x: number, y: number, width: number) {
    ctx.fillStyle = COLORS.panelBg;
    ctx.beginPath();
    ctx.roundRect(x, y, width, HANDLER_PANEL_HEIGHT, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, HANDLER_PANEL_HEIGHT, 8);
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('globalShortcutHandlers（JS 处理表）', x + 14, y + 20);

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const entry =
      handler !== null
        ? `"${ACCELERATOR}" → callback`
        : `（空：register 成功后才会出现条目）`;
    ctx.fillStyle = handler !== null ? COLORS.accent : COLORS.faint;
    let cursorY = y + 44;
    for (const line of wrapText(entry, width - 28, ctx).slice(0, 2)) {
      ctx.fillText(line, x + 14, cursorY);
      cursorY += 17;
    }

    ctx.fillStyle = COLORS.muted;
    cursorY = y + 80;
    for (const line of wrapText(
      `isRegistered("${ACCELERATOR}") → ${probe()}`,
      width - 28,
      ctx,
    ).slice(0, 2)) {
      ctx.fillText(line, x + 14, cursorY);
      cursorY += 17;
    }
  }

  function drawLogPanel(x: number, y: number, width: number) {
    ctx.fillStyle = COLORS.panelBg;
    ctx.beginPath();
    ctx.roundRect(x, y, width, LOG_PANEL_HEIGHT, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, LOG_PANEL_HEIGHT, 8);
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('最近动作', x + 14, y + 20);

    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    let cursorY = y + 40;
    if (log.length === 0) {
      ctx.fillStyle = COLORS.faint;
      ctx.fillText('点上方按钮开始，观察每一步判定', x + 14, cursorY);
    } else {
      for (const entry of log) {
        ctx.fillStyle =
          entry.tone === 'ok'
            ? COLORS.accent
            : entry.tone === 'fail'
              ? COLORS.fail
              : COLORS.muted;
        for (const line of wrapText(entry.text, width - 28, ctx).slice(0, 1)) {
          ctx.fillText(line, x + 14, cursorY);
          cursorY += 18;
        }
      }
    }

    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '示意复现判定链；真实系统热键以 global-shortcut-observer.ts 桌面范例为准',
      x + 14,
      y + LOG_PANEL_HEIGHT - 10,
    );
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(410, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 顶栏：当前系统侧状态（对应 Controls 的 systemState）
    ctx.fillStyle = COLORS.barBg;
    ctx.fillRect(0, 0, width, BAR_HEIGHT);
    ctx.strokeStyle = COLORS.barBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BAR_HEIGHT + 0.5);
    ctx.lineTo(width, BAR_HEIGHT + 0.5);
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    const stateText = `系统侧状态：${STATE_LABELS[systemState]}`;
    ctx.fillText(stateText, 16, BAR_HEIGHT / 2 + 4.5);

    // 操作按钮：2 × 2 网格
    const buttonWidth = (width - 32 - 10) / 2;
    buttonRects = [];
    ACTION_LABELS.forEach((label, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 16 + col * (buttonWidth + 10);
      const y = BAR_HEIGHT + 14 + row * (BUTTON_HEIGHT + 8);
      buttonRects.push({ x, y, width: buttonWidth });
      drawButton(x, y, buttonWidth, label, index);
    });

    // 处理表面板与日志面板
    const panelsY = BAR_HEIGHT + 14 + 2 * BUTTON_HEIGHT + 8 + 14;
    drawHandlerPanel(16, panelsY, width - 32);
    drawLogPanel(16, panelsY + HANDLER_PANEL_HEIGHT + 12, width - 32);

    emit({
      registerResult,
      probe: probe(),
      handlerCount: handler !== null ? 1 : 0,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onPointerMove);

  return {
    update(options) {
      systemState = options.systemState;
      handler = null;
      registerResult = '—';
      log = [];
      hoverIndex = -1;
      draw();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onPointerMove);
      resizeObserver.disconnect();
    },
  };
}
