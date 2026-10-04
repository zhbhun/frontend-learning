/**
 * 范例介绍：侧边栏打开行为演算。
 * 演示内容：点击工具栏图标是否开合侧边栏由 setPanelBehavior 的 openPanelOnActionClick
 *   决定（默认 false）；chrome.sidePanel.open() 有两条硬性要求——只能在用户手势中
 *   调用，且至少要带 windowId 或 tabId 之一。
 * 输入：是否开启 openPanelOnActionClick、open() 的调用位置（手势来源）、open() 的目标参数。
 * 操作：在 Controls 中调整三项输入。
 * 预期结果：左栏给出对应的运行时调用；中间浏览器示意呈现工具栏与侧边栏；右栏给出
 *   两次操作的执行结果、面板最终状态与三条规则（被违反的规则标红）。
 * 阅读主线：三项输入同时决定 API 调用、浏览器外观与右栏结果，描述的是同一份状态。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** open() 的调用位置：前四种是文档列出的合法用户手势来源，最后一种不是手势。 */
export type GestureSource =
  | 'action'
  | 'command'
  | 'contextMenu'
  | 'pageClick'
  | 'timer';

/** open() 的目标参数；none 表示 windowId 与 tabId 都不传。 */
export type OpenTarget = 'window' | 'tab' | 'none';

export interface OpenBehaviorOptions {
  openPanelOnActionClick: boolean;
  gesture: GestureSource;
  openTarget: OpenTarget;
}

export interface OpenBehaviorSnapshot {
  iconClick: string;
  openCall: string;
  panelState: string;
}

export interface OpenBehaviorInstance {
  update(options: OpenBehaviorOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const API_BOX = { x: 24, y: 36, width: 292, height: 348 };
const BROWSER_BOX = { x: 336, y: 36, width: 280, height: 348 };
const RESULT_BOX = { x: 636, y: 36, width: 180, height: 348 };

const COLORS = {
  ink: '#172033',
  sub: '#5b6b81',
  muted: '#7c8aa0',
  code: '#33415c',
  blue: '#4f7cff',
  green: '#15803d',
  gray: '#64748b',
  red: '#b91c1c',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
  panelBg: '#eef3ff',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 14px ui-sans-serif, system-ui, sans-serif';

const GESTURE_TEXT: Record<
  GestureSource,
  { call: string; isGesture: boolean }
> = {
  action: { call: 'action.onClicked 回调', isGesture: true },
  command: { call: 'commands.onCommand 回调', isGesture: true },
  contextMenu: { call: 'contextMenus.onClicked 回调', isGesture: true },
  pageClick: { call: '扩展页面按钮点击', isGesture: true },
  timer: { call: 'setInterval 定时回调', isGesture: false },
};

const TARGET_TEXT: Record<OpenTarget, string> = {
  window: 'windowId: 1',
  tab: 'tabId: 42',
  none: '',
};

export function createOpenBehaviorExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OpenBehaviorSnapshot) => void,
): OpenBehaviorInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: OpenBehaviorOptions = {
    openPanelOnActionClick: true,
    gesture: 'contextMenu',
    openTarget: 'window',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const ctx = drawingContext;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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

    drawApiPanel(ctx, current);
    drawBrowserMock(ctx, current);
    drawResultPanel(ctx, current);

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

interface Evaluation {
  iconClick: string;
  openCall: string;
  panelOpen: boolean;
  gestureBroken: boolean;
  targetBroken: boolean;
}

function evaluate(options: OpenBehaviorOptions): Evaluation {
  const gesture = GESTURE_TEXT[options.gesture];
  const gestureBroken = !gesture.isGesture;
  const targetBroken = options.openTarget === 'none';

  let openCall: string;
  if (gestureBroken) {
    openCall = '失败：只能在用户操作中调用';
  } else if (targetBroken) {
    openCall = '失败：需要 windowId 或 tabId';
  } else {
    openCall = `已打开（${TARGET_TEXT[options.openTarget]}）`;
  }

  return {
    iconClick: options.openPanelOnActionClick
      ? '切换侧边栏显示'
      : 'action 默认行为',
    openCall,
    // 初始面板关闭：图标点击（开启时）或 open() 成功都会让它打开
    panelOpen: options.openPanelOnActionClick || !(gestureBroken || targetBroken),
    gestureBroken,
    targetBroken,
  };
}

function buildSnapshot(options: OpenBehaviorOptions): OpenBehaviorSnapshot {
  const result = evaluate(options);
  return {
    iconClick: result.iconClick,
    openCall: result.openCall,
    panelState: result.panelOpen ? '打开' : '关闭',
  };
}

function setBehaviorLines(options: OpenBehaviorOptions): string[] {
  return [
    'chrome.sidePanel.setPanelBehavior({',
    `  openPanelOnActionClick: ${options.openPanelOnActionClick}`,
    '})',
  ];
}

function openLines(options: OpenBehaviorOptions): string[] {
  const inner =
    options.openTarget === 'none'
      ? []
      : [`  ${TARGET_TEXT[options.openTarget]}`];
  return ['chrome.sidePanel.open({', ...inner, '})'];
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
  ctx.arcTo(x + width, y, x + width, y, radius);
  ctx.arcTo(x, y + height, x, y, radius);
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
  const words = [...text];
  const lines: string[] = [];
  let line = '';
  for (const char of words) {
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

function drawApiPanel(
  ctx: CanvasRenderingContext2D,
  options: OpenBehaviorOptions,
) {
  const { x, y, width, height } = API_BOX;
  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('chrome.sidePanel 调用', x + 16, y + 28);

  let lineY = y + 56;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('① 安装时写入（onInstalled）', x + 16, lineY);
  lineY += 20;

  ctx.font = FONT_CODE;
  for (const line of setBehaviorLines(options)) {
    ctx.fillStyle = COLORS.code;
    ctx.fillText(line, x + 16, lineY);
    lineY += 17;
  }

  lineY += 12;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText(`② ${GESTURE_TEXT[options.gesture].call}`, x + 16, lineY);
  lineY += 20;

  ctx.font = FONT_CODE;
  for (const line of openLines(options)) {
    ctx.fillStyle = options.openTarget === 'none' ? COLORS.red : COLORS.code;
    ctx.fillText(line, x + 16, lineY);
    lineY += 17;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    'enabled / path / tabId 的设置见「站点级面板」演算',
    x + 16,
    y + height - 16,
  );
}

function drawBrowserMock(
  ctx: CanvasRenderingContext2D,
  options: OpenBehaviorOptions,
) {
  const { x, y, width, height } = BROWSER_BOX;
  const result = evaluate(options);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_TITLE;
  ctx.fillText('浏览器示意', x, y - 12);

  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 顶部工具栏
  const barHeight = 28;
  pathBox(ctx, x, y, width, barHeight, 8);
  ctx.fillStyle = '#e8edf5';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, barHeight);
  ctx.clip();
  ctx.fillRect(x, y + barHeight - 4, width, 4);
  ctx.restore();

  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.arc(x + 14 + index * 10, y + barHeight / 2, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b6c2d4';
    ctx.fill();
  }

  // action 图标：openPanelOnActionClick 开启时绿色描边
  const iconSize = 18;
  const iconX = x + 48;
  const iconY = y + (barHeight - iconSize) / 2;
  pathBox(ctx, iconX, iconY, iconSize, iconSize, 5);
  ctx.fillStyle = COLORS.blue;
  ctx.fill();
  if (options.openPanelOnActionClick) {
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('工具栏图标', iconX + 24, y + barHeight / 2 + 3.5);

  // 正文区与侧边栏
  const bodyTop = y + barHeight + 24;
  const bodyHeight = height - (barHeight + 24) - 16;
  const panelWidth = 92;
  const pageWidth = width - panelWidth - 24;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('网页内容', x + 24, bodyTop - 8);

  pathBox(ctx, x + 12, bodyTop, pageWidth, bodyHeight, 6);
  ctx.fillStyle = '#f3f5f9';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let row = 0; row < 5; row += 1) {
    ctx.fillStyle = '#e3e8f0';
    ctx.fillRect(x + 24, bodyTop + 34 + row * 14, pageWidth - 40 - row * 8, 6);
  }

  // 侧边栏：面板打开时显示 panel.html，否则显示虚线占位
  const panelX = x + width - panelWidth - 12;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('侧边栏', panelX, bodyTop - 8);
  if (result.panelOpen) {
    pathBox(ctx, panelX, bodyTop, panelWidth, bodyHeight, 6);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    pathBox(ctx, panelX, bodyTop, panelWidth, 20, 6);
    ctx.fillStyle = COLORS.blue;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, bodyTop, panelWidth, 20);
    ctx.clip();
    ctx.fillRect(panelX, bodyTop + 14, panelWidth, 6);
    ctx.restore();

    ctx.fillStyle = COLORS.ink;
    ctx.font = FONT_LABEL;
    ctx.fillText('panel.html', panelX + 8, bodyTop + 36);
    for (let row = 0; row < 6; row += 1) {
      ctx.fillStyle = '#d6e0f5';
      ctx.fillRect(panelX + 8, bodyTop + 50 + row * 12, panelWidth - 28, 6);
    }
  } else {
    pathBox(ctx, panelX, bodyTop, panelWidth, bodyHeight, 6);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COLORS.gray;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.textAlign = 'center';
    ctx.fillText('侧边栏', panelX + panelWidth / 2, bodyTop + bodyHeight / 2 - 6);
    ctx.fillText('未显示本扩展', panelX + panelWidth / 2, bodyTop + bodyHeight / 2 + 10);
    ctx.textAlign = 'left';
  }
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: OpenBehaviorOptions,
) {
  const { x, y, width, height } = RESULT_BOX;
  const result = evaluate(options);

  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('操作结果', x + 14, y + 28);

  let lineY = y + 52;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('① 点击工具栏图标', x + 14, lineY);
  lineY += 16;
  ctx.fillStyle = options.openPanelOnActionClick ? COLORS.green : COLORS.gray;
  ctx.font = FONT_RESULT;
  for (const line of wrapToWidth(ctx, result.iconClick, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 18;
  }

  lineY += 8;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText(`② open()`, x + 14, lineY);
  lineY += 16;
  ctx.fillStyle =
    result.gestureBroken || result.targetBroken ? COLORS.red : COLORS.green;
  ctx.font = FONT_RESULT;
  for (const line of wrapToWidth(ctx, result.openCall, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 18;
  }

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + height - 116);
  ctx.lineTo(x + width - 14, y + height - 116);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('面板最终状态', x + 14, y + height - 96);
  ctx.fillStyle = result.panelOpen ? COLORS.green : COLORS.gray;
  ctx.font = FONT_TITLE;
  ctx.fillText(result.panelOpen ? '打开' : '关闭', x + 14, y + height - 78);

  const rules: Array<{ text: string; broken: boolean }> = [
    {
      text: 'openPanelOnActionClick 默认 false',
      broken: !options.openPanelOnActionClick,
    },
    { text: 'open() 仅限用户手势', broken: result.gestureBroken },
    { text: 'open() 须带 windowId / tabId', broken: result.targetBroken },
  ];

  let ruleY = y + height - 58;
  ctx.font = FONT_SUB;
  for (const rule of rules) {
    ctx.fillStyle = rule.broken ? COLORS.red : '#b6c2d4';
    ctx.beginPath();
    ctx.arc(x + 18, ruleY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = rule.broken ? COLORS.red : COLORS.muted;
    ctx.fillText(
      truncateToWidth(ctx, rule.text, width - 40),
      x + 26,
      ruleY,
    );
    ruleY -= 14;
  }
}
