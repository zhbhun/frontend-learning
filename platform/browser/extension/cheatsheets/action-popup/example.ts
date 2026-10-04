/**
 * 范例介绍：action 按钮的两级状态演算。
 * 演示内容：chrome.action 的全局设置与 tabId 级覆盖如何合成一颗工具栏按钮的外观，
 *   以及点击行为如何按「禁用 → 有 popup → 无 popup」三步分派。
 * 输入：全局 badge 文字、标签页 42 的 badge 覆盖文字、是否设置了 popup、是否启用。
 * 操作：在 Controls 中调整四项输入。
 * 预期结果：左栏列出对应的运行时调用；中间两颗按钮分别呈现全局值与标签页 42 的
 *   合成值（tab 覆盖优先）；右栏给出点击「标签页 42」的分派结果与三条分派规则。
 * 阅读主线：控件、API 调用、按钮渲染与点击结果描述的是同一个状态。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ButtonOptions {
  badgeText: string;
  tabBadgeText: string;
  hasPopup: boolean;
  enabled: boolean;
}

export interface ButtonSnapshot {
  globalBadge: string;
  tabBadge: string;
  clickResult: string;
}

export interface ButtonInstance {
  update(options: ButtonOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x440 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 440;

const API_BOX = { x: 24, y: 36, width: 292, height: 368 };
const RESULT_BOX = { x: 520, y: 36, width: 296, height: 368 };
const BUTTON_SIZE = 88;
const GLOBAL_BUTTON = { x: 368, y: 104 };
const TAB_BUTTON = { x: 368, y: 252 };

const MAX_BADGE_CHARS = 4;

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
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_BADGE = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 16px ui-sans-serif, system-ui, sans-serif';

const DISPATCH_RULES = [
  { text: '已禁用 → 无反应', color: COLORS.gray },
  { text: '有 popup → 打开 popup 页面', color: COLORS.blue },
  { text: '无 popup → 派发 onClicked', color: COLORS.green },
];

export function createButtonExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ButtonSnapshot) => void,
): ButtonInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ButtonOptions = {
    badgeText: '7',
    tabBadgeText: '!',
    hasPopup: true,
    enabled: true,
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
    drawToolbarPreview(ctx, current);
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

function buildSnapshot(options: ButtonOptions): ButtonSnapshot {
  return {
    globalBadge: options.badgeText,
    tabBadge: options.tabBadgeText || options.badgeText,
    clickResult: describeClick(options).headline,
  };
}

function describeClick(options: ButtonOptions): {
  headline: string;
  sub: string;
  color: string;
  ruleIndex: number;
} {
  if (!options.enabled) {
    return {
      headline: '无反应',
      sub: '图标已禁用，点击被忽略',
      color: COLORS.gray,
      ruleIndex: 0,
    };
  }
  if (options.hasPopup) {
    return {
      headline: '打开 popup.html',
      sub: '设置了 popup，onClicked 不触发',
      color: COLORS.blue,
      ruleIndex: 1,
    };
  }
  return {
    headline: '派发 onClicked',
    sub: '回调参数是所在标签页的 tabs.Tab',
    color: COLORS.green,
    ruleIndex: 2,
  };
}

function apiLines(options: ButtonOptions): string[] {
  const lines: string[] = [];
  if (options.badgeText) {
    lines.push(`setBadgeText({ text: "${options.badgeText}" })`);
  }
  if (options.tabBadgeText) {
    lines.push(`setBadgeText({ tabId: 42, text: "${options.tabBadgeText}" })`);
  }
  if (options.hasPopup) {
    lines.push('setPopup({ popup: "popup.html" })');
  }
  if (!options.enabled) {
    lines.push('disable()');
  }
  return lines.map((line) =>
    line.length > 38 ? `${line.slice(0, 37)}…` : line,
  );
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
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawApiPanel(ctx: CanvasRenderingContext2D, options: ButtonOptions) {
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
  ctx.fillText('运行时调用 chrome.action.*', x + 16, y + 28);

  const lines = apiLines(options);
  ctx.font = FONT_CODE;
  if (lines.length === 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.fillText('（无调用，全部为 manifest 默认值）', x + 16, y + 58);
  } else {
    ctx.fillStyle = COLORS.code;
    let lineY = y + 58;
    for (const line of lines) {
      ctx.fillText(line, x + 16, lineY);
      lineY += 18;
    }
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    '不带 tabId 改全局值；带 tabId 只改该标签页',
    x + 16,
    y + height - 16,
  );
}

function drawToolbarPreview(
  ctx: CanvasRenderingContext2D,
  options: ButtonOptions,
) {
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_TITLE;
  ctx.fillText('工具栏按钮预览', GLOBAL_BUTTON.x, 78);

  drawActionButton(
    ctx,
    GLOBAL_BUTTON.x,
    GLOBAL_BUTTON.y,
    options.badgeText,
    options.enabled,
  );
  drawButtonLabel(
    ctx,
    GLOBAL_BUTTON.x,
    GLOBAL_BUTTON.y,
    `其他标签页 · 全局值${options.enabled ? '' : ' · 已禁用'}`,
  );

  drawActionButton(
    ctx,
    TAB_BUTTON.x,
    TAB_BUTTON.y,
    options.tabBadgeText || options.badgeText,
    options.enabled,
  );
  drawButtonLabel(
    ctx,
    TAB_BUTTON.x,
    TAB_BUTTON.y,
    `标签页 42 · tab 覆盖优先${options.enabled ? '' : ' · 已禁用'}`,
  );
}

function drawActionButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  badgeText: string,
  enabled: boolean,
) {
  ctx.save();
  // 禁用后整颗按钮（含 badge）在真实工具栏中呈灰色淡化，这里用透明度示意
  ctx.globalAlpha = enabled ? 1 : 0.45;

  pathBox(ctx, x, y, BUTTON_SIZE, BUTTON_SIZE, 18);
  ctx.fillStyle = COLORS.blue;
  ctx.fill();

  // 白色「弹窗」图形示意扩展图标
  const inner = { x: x + 22, y: y + 24, width: 44, height: 38 };
  pathBox(ctx, inner.x, inner.y, inner.width, inner.height, 7);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.fillStyle = COLORS.blue;
  ctx.fillRect(inner.x + 6, inner.y + 6, inner.width - 12, 6);
  ctx.globalAlpha = (enabled ? 1 : 0.45) * 0.55;
  ctx.fillRect(inner.x + 6, inner.y + 18, 24, 4);
  ctx.fillRect(inner.x + 6, inner.y + 26, 32, 4);
  ctx.globalAlpha = enabled ? 1 : 0.45;

  if (badgeText) {
    drawBadgeChip(ctx, x, y, badgeText.slice(0, MAX_BADGE_CHARS));
  }
  ctx.restore();

  if (!enabled) {
    pathBox(ctx, x, y, BUTTON_SIZE, BUTTON_SIZE, 18);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COLORS.gray;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawBadgeChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
) {
  const width = Math.max(20, text.length * 9 + 10);
  const height = 20;
  const bx = x + BUTTON_SIZE - width / 2;
  const by = y + BUTTON_SIZE - height / 2;
  pathBox(ctx, bx, by, width, height, 7);
  ctx.fillStyle = COLORS.red;
  ctx.fill();
  ctx.strokeStyle = COLORS.stage;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.white;
  ctx.font = FONT_BADGE;
  ctx.textAlign = 'center';
  ctx.fillText(text, bx + width / 2, by + height / 2 + 4);
  ctx.textAlign = 'left';
}

function drawButtonLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
) {
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + BUTTON_SIZE / 2, y + BUTTON_SIZE + 18);
  ctx.textAlign = 'left';
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: ButtonOptions,
) {
  const { x, y, width, height } = RESULT_BOX;
  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('点击「标签页 42」', x + 16, y + 28);

  const result = describeClick(options);
  ctx.fillStyle = result.color;
  ctx.font = FONT_RESULT;
  ctx.fillText(result.headline, x + 16, y + 64);

  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText(result.sub, x + 16, y + 88);

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 112);
  ctx.lineTo(x + width - 16, y + 112);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('分派规则', x + 16, y + 140);

  let ruleY = y + 168;
  DISPATCH_RULES.forEach((rule, index) => {
    const active = index === result.ruleIndex;
    ctx.fillStyle = active ? rule.color : COLORS.muted;
    ctx.font = active ? FONT_LABEL : FONT_SUB;
    ctx.beginPath();
    ctx.arc(x + 22, ruleY - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(rule.text, x + 34, ruleY);
    ruleY += 26;
  });

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    '禁用只影响点击分派，不影响外观更新',
    x + 16,
    y + height - 16,
  );
}
