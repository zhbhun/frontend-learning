/**
 * 范例介绍：DevTools 扩展的页面生命周期演算。
 * 演示内容：manifest 里 devtools_page 声明的 devtools 页面随 DevTools 窗口创建与销毁；
 *   panels.create 创建的面板页面只在面板显示期间存在（用户切走即销毁，onShown 收到
 *   面板 window）；devtools 页面通过 runtime.connect 与 service worker 保持端口，不发
 *   心跳时端口随 service worker 空闲休眠而断开。
 * 输入：DevTools 窗口开关、当前激活的面板、心跳是否持续。
 * 操作：在 Controls 中调整三项输入。
 * 预期结果：左栏 DevTools 窗口示意切换标签页；中栏三张上下文卡片（devtools 页面、
 *   面板页面、service worker）随之切换存活状态；右栏事件日志按真实时序追加
 *   panels.create、runtime.connect、onShown / onHidden、onConnect / onDisconnect。
 * 阅读主线：三项输入同时决定 DevTools 外观、上下文存活状态与事件日志，是同一份状态。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** DevTools 窗口开关。 */
export type DevtoolsWindow = 'closed' | 'open';

/** DevTools 内当前激活的面板标签。 */
export type PanelTab = 'elements' | 'console' | 'extension';

export interface PanelLifecycleOptions {
  devtoolsWindow: DevtoolsWindow;
  activePanel: PanelTab;
  heartbeat: boolean;
}

export interface PanelLifecycleSnapshot {
  windowLabel: string;
  devtoolsPageLabel: string;
  panelPageLabel: string;
  portLabel: string;
  lastEvent: string;
}

export interface PanelLifecycleInstance {
  update(options: PanelLifecycleOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const WINDOW_BOX = { x: 24, y: 36, width: 260, height: 348 };
const CONTEXT_BOX = { x: 300, y: 36, width: 292, height: 348 };
const LOG_BOX = { x: 608, y: 36, width: 208, height: 348 };

const COLORS = {
  ink: '#172033',
  sub: '#5b6b81',
  muted: '#7c8aa0',
  red: '#dc2626',
  code: '#33415c',
  blue: '#4f7cff',
  blueSoft: '#eef3ff',
  green: '#15803d',
  greenSoft: '#ecfdf3',
  gray: '#64748b',
  graySoft: '#f1f5f9',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
  line: '#e2e8f0',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';

const PANEL_LABEL: Record<PanelTab, string> = {
  elements: 'Elements',
  console: 'Console',
  extension: '扩展面板',
};

interface Derived {
  windowOpen: boolean;
  devtoolsPageAlive: boolean;
  panelPageAlive: boolean;
  portConnected: boolean;
  workerAwake: boolean;
  /** 事件按发生顺序追加，最新在末尾 */
  events: string[];
}

/** 纯函数推导：三项输入决定上下文存活状态与事件序列。 */
export function deriveState(options: PanelLifecycleOptions): Derived {
  if (options.devtoolsWindow === 'closed') {
    return {
      windowOpen: false,
      devtoolsPageAlive: false,
      panelPageAlive: false,
      portConnected: false,
      workerAwake: false,
      events: [
        'DevTools 窗口关闭',
        'devtools.html 销毁',
        'panel.html 销毁',
        '端口断开 → SW onDisconnect（openCount 0）',
        'SW 恢复休眠',
      ],
    };
  }

  const events = [
    'DevTools 窗口打开 → 创建 devtools.html',
    'panels.create("扩展面板", "icon.png", "panel.html")',
    'DevTools 工具栏出现扩展面板标签',
    'runtime.connect({ name: "devtools-page" })',
    'SW: onConnect → openCount = 1',
  ];

  if (options.activePanel === 'extension') {
    events.push('用户切到扩展面板 → panel.html 创建');
    events.push('ExtensionPanel.onShown(panelWindow)');
  } else {
    events.push(`用户切到 ${PANEL_LABEL[options.activePanel]} 面板`);
    events.push('panel.html 销毁');
    events.push('ExtensionPanel.onHidden()');
  }

  if (options.heartbeat) {
    events.push('心跳 postMessage 保持端口连接');
  } else {
    events.push('心跳停止 → SW 空闲休眠');
    events.push('端口断开 → SW onDisconnect（openCount 0）');
  }

  return {
    windowOpen: true,
    devtoolsPageAlive: true,
    panelPageAlive: options.activePanel === 'extension',
    portConnected: options.heartbeat,
    workerAwake: options.heartbeat,
    events,
  };
}

function buildSnapshot(options: PanelLifecycleOptions): PanelLifecycleSnapshot {
  const state = deriveState(options);
  return {
    windowLabel: state.windowOpen ? '打开' : '关闭',
    devtoolsPageLabel: state.devtoolsPageAlive ? '存活（随窗口）' : '不存在',
    panelPageLabel: state.panelPageAlive
      ? '存活（本次显示时创建）'
      : '已销毁',
    portLabel: state.portConnected
      ? '连接中（openCount = 1）'
      : '已断开（openCount = 0）',
    lastEvent: state.events[state.events.length - 1],
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
  ctx.arcTo(x, y + height, x + width, y + height, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
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

function drawDevtoolsWindow(
  ctx: CanvasRenderingContext2D,
  state: Derived,
  activePanel: PanelTab,
) {
  const { x, y, width, height } = WINDOW_BOX;
  drawFrame(ctx, WINDOW_BOX, 'DevTools 窗口');

  if (!state.windowOpen) {
    ctx.setLineDash([5, 4]);
    pathBox(ctx, x + 14, y + 44, width - 28, height - 62, 6);
    ctx.strokeStyle = COLORS.gray;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.textAlign = 'center';
    ctx.fillText('未打开', x + width / 2, y + height / 2 - 6);
    ctx.fillText('在页面上按 F12 打开', x + width / 2, y + height / 2 + 10);
    ctx.textAlign = 'left';
    return;
  }

  // 顶部标签栏：Elements / Console / 扩展面板
  const tabY = y + 40;
  const tabH = 26;
  const tabs: Array<{ key: PanelTab; text: string }> = [
    { key: 'elements', text: 'Elements' },
    { key: 'console', text: 'Console' },
    { key: 'extension', text: '扩展面板' },
  ];
  let tabX = x + 12;
  ctx.font = FONT_LABEL;
  for (const tab of tabs) {
    const tabWidth = ctx.measureText(tab.text).width + 22;
    const active = activePanel === tab.key;
    pathBox(ctx, tabX, tabY, tabWidth, tabH, 6);
    ctx.fillStyle = active ? COLORS.blue : COLORS.graySoft;
    ctx.fill();
    if (active) {
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.fillStyle = active ? COLORS.white : COLORS.sub;
    ctx.font = FONT_LABEL;
    ctx.fillText(tab.text, tabX + 11, tabY + 17);
    tabX += tabWidth + 6;
  }

  // 面板内容区
  const bodyY = tabY + tabH + 12;
  const bodyH = y + height - 16 - bodyY;
  pathBox(ctx, x + 12, bodyY, width - 24, bodyH, 6);
  ctx.fillStyle = COLORS.graySoft;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  if (activePanel === 'extension') {
    ctx.fillText('面板内容区：panel.html', x + 24, bodyY + 22);
    ctx.fillStyle = COLORS.blue;
    ctx.fillText('该 iframe 即扩展页面', x + 24, bodyY + 38);
    ctx.fillStyle = COLORS.line;
    for (let row = 0; row < 6; row += 1) {
      ctx.fillRect(x + 24, bodyY + 54 + row * 14, width - 60 - row * 10, 6);
    }
  } else {
    ctx.fillText(`面板内容区：${PANEL_LABEL[activePanel]}（内置）`, x + 24, bodyY + 22);
    ctx.fillStyle = COLORS.line;
    for (let row = 0; row < 5; row += 1) {
      ctx.fillRect(x + 24, bodyY + 38 + row * 14, width - 60 - row * 8, 6);
    }
  }
}

function drawContextCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  file: string,
  note: string,
  alive: boolean,
  status: string,
) {
  pathBox(ctx, x, y, width, height, 8);
  ctx.fillStyle = alive ? COLORS.white : COLORS.graySoft;
  ctx.fill();
  ctx.strokeStyle = alive ? COLORS.boxBorder : COLORS.line;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = alive ? COLORS.ink : COLORS.muted;
  ctx.font = FONT_CODE;
  ctx.fillText(file, x + 12, y + 20);

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  for (const [index, line] of wrapToWidth(ctx, note, width - 24).entries()) {
    ctx.fillText(line, x + 12, y + 36 + index * 14);
  }

  // 状态胶囊
  const chipWidth = 74;
  const chipX = x + width - chipWidth - 12;
  const chipY = y + height - 26;
  pathBox(ctx, chipX, chipY, chipWidth, 18, 9);
  ctx.fillStyle = alive ? COLORS.greenSoft : COLORS.graySoft;
  ctx.fill();
  ctx.fillStyle = alive ? COLORS.green : COLORS.gray;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'center';
  ctx.fillText(status, chipX + chipWidth / 2, chipY + 13);
  ctx.textAlign = 'left';
}

function drawContexts(
  ctx: CanvasRenderingContext2D,
  state: Derived,
) {
  const { x, y, width, height } = CONTEXT_BOX;
  drawFrame(ctx, CONTEXT_BOX, '扩展上下文（各页面彼此独立）');

  const cardX = x + 12;
  const cardW = width - 24;
  const cardH = 74;
  const gap = 12;

  drawContextCard(
    ctx,
    cardX,
    y + 40,
    cardW,
    cardH,
    'devtools.html',
    'DevTools 页面：随 DevTools 窗口存活，长期存在',
    state.devtoolsPageAlive,
    state.devtoolsPageAlive ? '存活' : '不存在',
  );

  drawContextCard(
    ctx,
    cardX,
    y + 40 + cardH + gap,
    cardW,
    cardH,
    'panel.html',
    '面板页面：随面板显示创建，切走即销毁',
    state.panelPageAlive,
    state.panelPageAlive ? '存活' : '已销毁',
  );

  drawContextCard(
    ctx,
    cardX,
    y + 40 + (cardH + gap) * 2,
    cardW,
    cardH,
    'service worker',
    state.portConnected
      ? '端口连接中，保持唤醒'
      : '无端口后空闲休眠（约 30 秒）',
    state.workerAwake,
    state.workerAwake ? '唤醒' : '休眠',
  );

  // 端口说明
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  const portY = y + 40 + (cardH + gap) * 2 + cardH + 16;
  const portText = state.portConnected
    ? '端口：devtools-page（连接中）'
    : '端口：devtools-page（已断开）';
  ctx.fillStyle = state.portConnected ? COLORS.blue : COLORS.red;
  ctx.fillText(portText, cardX, portY);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(
    '端口不自动保活 SW，靠定期心跳维持',
    cardX,
    portY + 14,
  );
}

function drawLog(
  ctx: CanvasRenderingContext2D,
  state: Derived,
) {
  const { x, y, width, height } = LOG_BOX;
  drawFrame(ctx, LOG_BOX, '事件日志（最新在上）');

  const shown = [...state.events].reverse().slice(0, 6);
  ctx.font = FONT_CODE;
  ctx.textAlign = 'left';
  let lineY = y + 52;
  for (const [index, event] of shown.entries()) {
    ctx.fillStyle = index === 0 ? COLORS.blue : COLORS.muted;
    ctx.beginPath();
    ctx.arc(x + 18, lineY - 3.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = index === 0 ? COLORS.code : COLORS.muted;
    for (const line of wrapToWidth(ctx, event, width - 44)) {
      ctx.fillText(line, x + 26, lineY);
      lineY += 13;
    }
    lineY += 6;
  }
}

export function createPanelLifecycleExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PanelLifecycleSnapshot) => void,
): PanelLifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PanelLifecycleOptions = {
    devtoolsWindow: 'open',
    activePanel: 'extension',
    heartbeat: true,
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

    const state = deriveState(current);
    drawDevtoolsWindow(ctx, state, current.activePanel);
    drawContexts(ctx, state);
    drawLog(ctx, state);

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
