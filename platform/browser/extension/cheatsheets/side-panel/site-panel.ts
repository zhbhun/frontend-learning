/**
 * 范例介绍：站点级侧边栏演算。
 * 演示内容：setOptions 带 tabId 时设置只对该标签页生效；tabs.onUpdated 按 tab.url
 *   判定是否启用面板。读 tab.url 需要 "tabs" 权限或匹配的 host 权限——缺失时 URL
 *   为 undefined，判断静默落入 else 分支，一个站点都不启用。
 * 输入：当前标签页 URL、是否已声明 tabs/host 权限。
 * 操作：在 Controls 中调整两项输入。
 * 预期结果：左栏给出 tabs.onUpdated 监听器当前命中的分支；中间浏览器示意呈现该
 *   标签页的面板状态；右栏给出 setOptions 调用、面板与下拉的可见性、三条行为边界。
 * 阅读主线：URL 判定结果同时决定监听器分支、浏览器外观与右栏状态。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 当前标签页归属的站点：google 是监听器示例的目标站点，example 是其他站点。 */
export type TabSite = 'google' | 'example';

export interface SitePanelOptions {
  tabUrl: TabSite;
  hasPermission: boolean;
}

export interface SitePanelSnapshot {
  urlLabel: string;
  permissionLabel: string;
  callText: string;
  panelVisible: string;
  menuVisible: string;
}

export interface SitePanelInstance {
  update(options: SitePanelOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const LISTENER_BOX = { x: 24, y: 36, width: 304, height: 348 };
const BROWSER_BOX = { x: 348, y: 36, width: 264, height: 348 };
const RESULT_BOX = { x: 632, y: 36, width: 184, height: 348 };

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
  activeBg: '#e7edfb',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 14px ui-sans-serif, system-ui, sans-serif';

const SITE_TEXT: Record<TabSite, { url: string; name: string }> = {
  google: { url: 'https://www.google.com/search', name: 'google.com' },
  example: { url: 'https://www.example.com/', name: 'example.com' },
};

export function createSitePanelExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SitePanelSnapshot) => void,
): SitePanelInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SitePanelOptions = {
    tabUrl: 'google',
    hasPermission: true,
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

    drawListenerPanel(ctx, current);
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
  matched: boolean;
  callText: string;
  panelVisible: boolean;
  menuVisible: boolean;
}

function evaluate(options: SitePanelOptions): Evaluation {
  // 没有 tabs/host 权限时 tab.url 为 undefined，判断静默落入 else 分支
  const matched = options.hasPermission && options.tabUrl === 'google';
  const callText = matched
    ? 'setOptions({ tabId: 42, path: "panel.html", enabled: true })'
    : 'setOptions({ tabId: 42, enabled: false })';
  return {
    matched,
    callText,
    panelVisible: matched,
    menuVisible: matched,
  };
}

function buildSnapshot(options: SitePanelOptions): SitePanelSnapshot {
  const result = evaluate(options);
  return {
    urlLabel: SITE_TEXT[options.tabUrl].url,
    permissionLabel: options.hasPermission ? '已声明 tabs/host' : '未声明',
    callText: result.callText,
    panelVisible: result.panelVisible ? '显示' : '隐藏',
    menuVisible: result.menuVisible ? '侧边栏下拉已列出' : '已移出下拉',
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
  ctx.arcTo(x + width, y, x + width, y, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
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

interface ListenerLine {
  text: string;
  kind: 'plain' | 'plain-dim' | 'hit' | 'miss';
}

function listenerLines(options: SitePanelOptions): ListenerLine[] {
  const matched = evaluate(options).matched;
  return [
    { text: 'chrome.tabs.onUpdated', kind: 'plain-dim' },
    { text: '  .addListener(async (tabId) => {', kind: 'plain-dim' },
    { text: '  if (tab.url?.startsWith(TARGET)) {', kind: 'plain-dim' },
    {
      text: '    setOptions({ tabId, path,',
      kind: matched ? 'hit' : 'plain',
    },
    {
      text: '      enabled: true })',
      kind: matched ? 'hit' : 'plain',
    },
    { text: '  } else {', kind: 'plain-dim' },
    {
      text: '    setOptions({ tabId,',
      kind: matched ? 'plain' : 'miss',
    },
    {
      text: '      enabled: false })',
      kind: matched ? 'plain' : 'miss',
    },
    { text: '  }', kind: 'plain-dim' },
    { text: '});', kind: 'plain-dim' },
  ];
}

function drawListenerPanel(
  ctx: CanvasRenderingContext2D,
  options: SitePanelOptions,
) {
  const { x, y, width, height } = LISTENER_BOX;
  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('sw.js：tabs.onUpdated 监听器', x + 16, y + 28);

  const lines = listenerLines(options);
  let lineY = y + 54;
  for (const line of lines) {
    if (line.kind === 'hit' || line.kind === 'miss') {
      const lineWidth = Math.min(
        width - 24,
        Math.max(
          ctx.measureText(`${line.text}   `).width,
          ctx.measureText(line.text).width + 30,
        ),
      );
      ctx.fillStyle = line.kind === 'hit' ? COLORS.activeBg : '#fdf1f1';
      ctx.fillRect(x + 8, lineY - 11, lineWidth, 15);
    }
    ctx.fillStyle =
      line.kind === 'hit'
        ? COLORS.green
        : line.kind === 'miss'
          ? COLORS.red
          : line.kind === 'plain'
            ? COLORS.code
            : COLORS.muted;
    ctx.font = FONT_CODE;
    ctx.fillText(truncateToWidth(ctx, line.text, width - 40), x + 16, lineY);
    lineY += 16;
  }

  lineY += 10;
  if (!options.hasPermission) {
    ctx.fillStyle = COLORS.red;
    ctx.font = FONT_SUB;
    for (const note of wrapToWidth(
      ctx,
      '缺 "tabs" / host 权限：tab.url 为 undefined，永远落到 else 分支。',
      width - 32,
    )) {
      ctx.fillText(note, x + 16, lineY);
      lineY += 14;
    }
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    for (const note of wrapToWidth(
      ctx,
      '命中 if：该标签页启用面板；否则禁用。绿色为当前命中分支。',
      width - 32,
    )) {
      ctx.fillText(note, x + 16, lineY);
      lineY += 14;
    }
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('tab.url 需要 "tabs" 或 host 权限', x + 16, y + height - 16);
}

function drawBrowserMock(
  ctx: CanvasRenderingContext2D,
  options: SitePanelOptions,
) {
  const { x, y, width, height } = BROWSER_BOX;
  const result = evaluate(options);
  const site = SITE_TEXT[options.tabUrl];

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

  // 地址栏
  const barHeight = 30;
  ctx.fillStyle = '#e8edf5';
  ctx.fillRect(x + 1, y + 1, width - 2, barHeight);
  pathBox(ctx, x + 12, y + 7, width - 24, 16, 8);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_CODE;
  ctx.fillText(
    truncateToWidth(ctx, site.url, width - 48),
    x + 20,
    y + 19,
  );

  // 正文区与侧边栏
  const bodyTop = y + barHeight + 24;
  const bodyHeight = height - (barHeight + 24) - 16;
  const panelWidth = 84;
  const pageWidth = width - panelWidth - 24;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('网页内容', x + 24, bodyTop - 8);
  ctx.fillText('侧边栏', x + width - panelWidth - 12, bodyTop - 8);

  pathBox(ctx, x + 12, bodyTop, pageWidth, bodyHeight, 6);
  ctx.fillStyle = '#f3f5f9';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_LABEL;
  ctx.fillText(site.name, x + 24, bodyTop + 22);
  for (let row = 0; row < 5; row += 1) {
    ctx.fillStyle = '#e3e8f0';
    ctx.fillRect(x + 24, bodyTop + 36 + row * 14, pageWidth - 44 - row * 6, 6);
  }

  const panelX = x + width - panelWidth - 12;
  if (result.panelVisible) {
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
    ctx.fillText('未启用', panelX + panelWidth / 2, bodyTop + bodyHeight / 2 - 4);
    ctx.fillText('无面板', panelX + panelWidth / 2, bodyTop + bodyHeight / 2 + 10);
    ctx.textAlign = 'left';
  }
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: SitePanelOptions,
) {
  const { x, y, width, height } = RESULT_BOX;
  const result = evaluate(options);
  const site = SITE_TEXT[options.tabUrl];

  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('tabId 42 的面板', x + 14, y + 28);

  let lineY = y + 52;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('tab.url', x + 14, lineY);
  lineY += 15;
  ctx.fillStyle = options.hasPermission ? COLORS.code : COLORS.red;
  ctx.font = FONT_CODE;
  for (const line of wrapToWidth(
    ctx,
    options.hasPermission ? site.url : 'undefined',
    width - 28,
  )) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 8;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('setOptions 调用', x + 14, lineY);
  lineY += 15;
  ctx.fillStyle = result.matched ? COLORS.green : COLORS.gray;
  ctx.font = FONT_CODE;
  for (const line of wrapToWidth(ctx, result.callText, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 8;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('面板状态', x + 14, lineY);
  lineY += 15;
  ctx.fillStyle = result.panelVisible ? COLORS.green : COLORS.gray;
  ctx.font = FONT_RESULT;
  ctx.fillText(result.panelVisible ? '显示' : '隐藏', x + 14, lineY);
  lineY += 18;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('侧边栏下拉', x + 14, lineY);
  lineY += 15;
  ctx.fillStyle = result.menuVisible ? COLORS.green : COLORS.red;
  ctx.font = FONT_SUB;
  for (const line of wrapToWidth(
    ctx,
    result.menuVisible ? '已列出本扩展' : '本扩展已移出',
    width - 28,
  )) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + height - 100);
  ctx.lineTo(x + width - 14, y + height - 100);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('行为边界', x + 14, y + height - 84);

  const notes = [
    '切到未启用的标签页：面板隐藏',
    '导航离开已启用站点：面板关闭',
    'tab 级状态按 tabId，重载需重设',
  ];
  let noteY = y + height - 66;
  ctx.font = FONT_SUB;
  for (const note of notes) {
    ctx.fillStyle = '#b6c2d4';
    ctx.beginPath();
    ctx.arc(x + 18, noteY - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    for (const line of wrapToWidth(ctx, note, width - 44)) {
      ctx.fillText(line, x + 26, noteY);
      noteY -= 12;
    }
    noteY -= 2;
  }
}
