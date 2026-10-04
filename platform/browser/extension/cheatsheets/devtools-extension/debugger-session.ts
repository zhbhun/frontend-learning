/**
 * 范例介绍：chrome.debugger 会话生命周期与边界演算。
 * 演示内容：一次 CDP 会话从 attach 到 detach 的完整时序——attach 成功后主题栏出现调试
 *   横幅；sendCommand 发送 Network.enable 后 onEvent 持续收到协议事件；会话结束时
 *   onDetach 给出 reason。边界包括：只能附加 HTTP/HTTPS 页面、每个标签页只能有一个
 *   调试器、用户在目标标签页打开 DevTools 会让浏览器终止会话。
 * 输入：目标页面类型、会话阶段、会话结束方式。
 * 操作：在 Controls 中调整三项输入。
 * 预期结果：左栏浏览器示意显示横幅是否出现；中栏时间线标出当前进度与失败步骤；右栏
 *   状态给出协议版本、最后命令与响应、最后事件、结束原因。
 * 阅读主线：三项输入同时推进浏览器示意、会话时间线与状态读数，是同一份状态。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 目标页面类型：可调试的 HTTPS 页面或 chrome:// 页面。 */
export type DebugTarget = 'https' | 'chrome';

/** 会话阶段。 */
export type SessionStage = 'idle' | 'attached' | 'sent' | 'detached';

/** 会话结束方式。 */
export type SessionCause = 'none' | 'devtools' | 'closed';

export interface DebuggerSessionOptions {
  target: DebugTarget;
  stage: SessionStage;
  cause: SessionCause;
}

export interface DebuggerSessionSnapshot {
  sessionLabel: string;
  commandLabel: string;
  eventLabel: string;
  detachLabel: string;
}

export interface DebuggerSessionInstance {
  update(options: DebuggerSessionOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const BROWSER_BOX = { x: 24, y: 36, width: 292, height: 348 };
const TIMELINE_BOX = { x: 332, y: 36, width: 214, height: 348 };
const STATUS_BOX = { x: 562, y: 36, width: 254, height: 348 };

const COLORS = {
  ink: '#172033',
  sub: '#5b6b81',
  muted: '#7c8aa0',
  code: '#33415c',
  blue: '#4f7cff',
  blueSoft: '#eef3ff',
  green: '#15803d',
  red: '#b91c1c',
  redSoft: '#fef2f2',
  gray: '#64748b',
  graySoft: '#f1f5f9',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
  line: '#e2e8f0',
  banner: '#fef9c3',
  bannerBorder: '#fde047',
};

const FONT_CODE = '9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_URL = '9.5px ui-monospace, SFMono-Regular, Menlo, monospace';

const CAUSE_TEXT: Record<SessionCause, string> = {
  none: '扩展主动调用 detach()',
  devtools: '用户在目标标签页打开 DevTools',
  closed: '目标标签页关闭',
};

const DETACH_REASON: Record<SessionCause, string> = {
  none: '—（主动 detach，Promise resolve）',
  devtools: '"canceled_by_user"',
  closed: '"target_closed"',
};

interface StepState {
  text: string;
  detail: string;
  state: 'done' | 'active' | 'pending' | 'failed';
}

interface Derived {
  attachAttempted: boolean;
  attachFailed: boolean;
  bannerVisible: boolean;
  steps: StepState[];
}

/** 纯函数推导：目标 + 阶段 + 结束方式 → 时间线与横幅状态。 */
export function deriveSession(options: DebuggerSessionOptions): Derived {
  const attachAttempted = options.stage !== 'idle';
  const attachFailed = attachAttempted && options.target === 'chrome';
  const attached = !attachFailed && options.stage !== 'idle';
  const sent = attached && (options.stage === 'sent' || options.stage === 'detached');
  const detached = options.stage === 'detached' && !attachFailed;

  const steps: StepState[] = [
    {
      text: 'attach({ tabId: 1 }, "0.1")',
      detail: attachFailed
        ? '失败：只能附加 HTTP/HTTPS 页面'
        : '协议主版本匹配、次版本不低于即可附加',
      state: attachFailed
        ? 'failed'
        : attachAttempted
          ? 'done'
          : 'pending',
    },
    {
      text: 'DevTools 横幅出现',
      detail: attachFailed
        ? '不会出现'
        : '"devtools-demo is debugging this browser"｜提供 Cancel',
      state: attachFailed
        ? 'pending'
        : attached
          ? 'done'
          : 'pending',
    },
    {
      text: 'sendCommand({ tabId: 1 }, "Network.enable")',
      detail: sent ? '返回 {}：Network 事件开始派发' : '尚未发送',
      state: sent ? 'done' : 'pending',
    },
    {
      text: 'onEvent: Network.requestWillBeSent',
      detail: sent ? 'params.request / params.type' : '尚未开始',
      state: sent ? 'done' : 'pending',
    },
    {
      text: 'onEvent: Network.responseReceived',
      detail: sent ? 'params.response / params.type' : '尚未开始',
      state: sent ? 'done' : 'pending',
    },
    {
      text: 'detach({ tabId: 1 })',
      detail: detached
        ? options.cause === 'none'
          ? 'Promise resolve，会话结束'
          : `浏览器终止会话：${CAUSE_TEXT[options.cause]}`
        : '尚未结束',
      state: detached ? 'done' : 'pending',
    },
  ];

  if (attachFailed) {
    for (const step of steps.slice(1)) {
      step.state = 'pending';
    }
  }

  return {
    attachAttempted,
    attachFailed,
    bannerVisible: attached && !detached,
    steps,
  };
}

function buildSnapshot(
  options: DebuggerSessionOptions,
): DebuggerSessionSnapshot {
  const session = deriveSession(options);
  let sessionLabel: string;
  if (session.attachFailed) {
    sessionLabel = '附加失败';
  } else if (options.stage === 'detached') {
    sessionLabel = '已分离';
  } else if (options.stage === 'sent') {
    sessionLabel = '已附加，事件流中';
  } else if (options.stage === 'attached') {
    sessionLabel = '已附加';
  } else {
    sessionLabel = '未附加';
  }

  return {
    sessionLabel,
    commandLabel: options.stage === 'sent' || options.stage === 'detached'
      ? 'Network.enable → {}'
      : '—',
    eventLabel:
      options.stage === 'sent' || options.stage === 'detached'
        ? 'Network.responseReceived'
        : '—',
    detachLabel:
      options.stage === 'detached' ? DETACH_REASON[options.cause] : '—',
  };
}

function pathBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 8,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y, radius);
  ctx.arcTo(x + width, y, x, y, radius);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  title: string,
) {
  pathBox(ctx, box.x, box.y, box.width, box.height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText(title, box.x + 16, box.y + 28);
}

function drawBrowser(
  ctx: CanvasRenderingContext2D,
  options: DebuggerSessionOptions,
  session: Derived,
) {
  const { x, y, width, height } = BROWSER_BOX;
  drawFrame(ctx, BROWSER_BOX, '被调试的标签页');

  // 标签条
  const tabY = y + 40;
  pathBox(ctx, x + 12, tabY, 118, 26, 6);
  ctx.fillStyle = COLORS.graySoft;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_LABEL;
  ctx.fillText(
    options.target === 'chrome' ? 'chrome://extensions' : 'example.com',
    x + 22,
    tabY + 17,
  );
  pathBox(ctx, x + 136, tabY, 118, 26, 6);
  ctx.fillStyle = COLORS.line;
  ctx.fill();
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('other-tab', x + 146, tabY + 17);

  // 地址栏
  const barY = tabY + 34;
  pathBox(ctx, x + 12, barY, width - 24, 22, 6);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_URL;
  ctx.fillText(
    options.target === 'chrome'
      ? 'chrome://extensions'
      : 'https://example.com/shop',
    x + 24,
    barY + 15,
  );

  // 调试横幅
  const bannerY = barY + 30;
  if (session.bannerVisible) {
    pathBox(ctx, x + 12, bannerY, width - 24, 26, 5);
    ctx.fillStyle = COLORS.banner;
    ctx.fill();
    ctx.strokeStyle = COLORS.bannerBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = FONT_LABEL;
    ctx.fillText('devtools-demo is debugging this browser', x + 20, bannerY + 17);
    ctx.fillStyle = COLORS.blue;
    ctx.fillText('Cancel', x + width - 58, bannerY + 17);
  } else if (session.attachFailed) {
    ctx.fillStyle = COLORS.red;
    ctx.font = FONT_SUB;
    ctx.fillText('横幅不会出现：attach 失败', x + 20, bannerY + 17);
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.fillText('（无调试横幅）', x + 20, bannerY + 17);
  }

  // 页面内容示意
  const bodyY = bannerY + 40;
  pathBox(ctx, x + 12, bodyY, width - 24, y + height - 16 - bodyY, 6);
  ctx.fillStyle = COLORS.graySoft;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('页面内容', x + 24, bodyY + 20);
  ctx.fillStyle = COLORS.line;
  for (let row = 0; row < 4; row += 1) {
    ctx.fillRect(x + 24, bodyY + 32 + row * 14, width - 70 - row * 12, 6);
  }
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  session: Derived,
) {
  const { x, y, width, height } = TIMELINE_BOX;
  drawFrame(ctx, TIMELINE_BOX, 'CDP 会话时间线');

  let lineY = y + 48;
  const stateColor: Record<StepState['state'], string> = {
    done: COLORS.green,
    active: COLORS.blue,
    pending: COLORS.gray,
    failed: COLORS.red,
  };

  for (const [index, step] of session.steps.entries()) {
    const color = stateColor[step.state];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 20, lineY - 3.5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = FONT_CODE;
    ctx.fillStyle = step.state === 'pending' ? COLORS.muted : COLORS.code;
    for (const line of wrapToWidth(ctx, step.text, width - 46)) {
      ctx.fillText(line, x + 30, lineY);
      lineY += 13;
    }

    ctx.font = FONT_SUB;
    ctx.fillStyle =
      step.state === 'failed'
        ? COLORS.red
        : step.state === 'pending'
          ? COLORS.muted
          : COLORS.sub;
    for (const line of wrapToWidth(ctx, step.detail, width - 46)) {
      ctx.fillText(line, x + 30, lineY);
      lineY += 13;
    }
    lineY += index === session.steps.length - 1 ? 0 : 7;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    'onDetach 由浏览器终止会话时触发',
    x + 14,
    y + height - 14,
  );
}

function drawStatus(
  ctx: CanvasRenderingContext2D,
  options: DebuggerSessionOptions,
  session: Derived,
) {
  const { x, y, width, height } = STATUS_BOX;
  const snapshot = buildSnapshot(options);
  drawFrame(ctx, STATUS_BOX, '状态');

  const rows: Array<{ label: string; value: string; color: string }> = [
    {
      label: '会话状态',
      value: snapshot.sessionLabel,
      color: session.attachFailed
        ? COLORS.red
        : options.stage === 'detached'
          ? COLORS.gray
          : COLORS.green,
    },
    { label: '协议版本', value: 'requiredVersion "0.1"', color: COLORS.code },
    { label: '最后命令', value: snapshot.commandLabel, color: COLORS.code },
    { label: '最后事件', value: snapshot.eventLabel, color: COLORS.code },
    {
      label: 'onDetach reason',
      value: snapshot.detachLabel,
      color: options.stage === 'detached' ? COLORS.blue : COLORS.muted,
    },
  ];

  let rowY = y + 50;
  for (const row of rows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_LABEL;
    ctx.fillText(row.label, x + 14, rowY);
    rowY += 16;
    ctx.font = FONT_CODE;
    ctx.fillStyle = row.color;
    for (const line of wrapToWidth(ctx, row.value, width - 30)) {
      ctx.fillText(line, x + 14, rowY);
      rowY += 14;
    }
    rowY += 8;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    '每个标签页同时只能有一个调试器',
    x + 14,
    y + height - 14,
  );
}

export function createDebuggerSessionExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DebuggerSessionSnapshot) => void,
): DebuggerSessionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: DebuggerSessionOptions = {
    target: 'https',
    stage: 'sent',
    cause: 'none',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const ctx = drawingContext;
    ctx.fillStyle = COLORS.stage;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const offsetX = (width - DESIGN_WIDTH * scale) / 2;
    const offsetY = (height - DESIGN_HEIGHT * scale) / 2;
    ctx.setTransform(
      pixelRatio * scale,
      0,
      0,
      pixelRatio * scale,
      pixelRatio * offsetX,
      pixelRatio * offsetY,
    );

    const session = deriveSession(current);
    drawBrowser(ctx, current, session);
    drawTimeline(ctx, session);
    drawStatus(ctx, current, session);

    emit(buildSnapshot(current));
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
