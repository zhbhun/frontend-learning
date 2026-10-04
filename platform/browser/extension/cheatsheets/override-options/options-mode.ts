/**
 * 范例介绍：选项页声明与打开位置演算。
 * 演示内容：选项页在哪里打开由 manifest 声明决定，不由打开入口决定——
 *   options_page 与 options_ui.open_in_tab: true 总在新标签页整页打开，
 *   options_ui（open_in_tab 默认 false）内嵌在 chrome://extensions 的扩展
 *   详情页里；chrome://extensions 详情页入口、工具栏图标右键菜单、
 *   chrome.runtime.openOptionsPage() 三个入口都通向同一份声明决定的位置。
 *   内嵌模式还有两条边界：chrome.tabs 不可用（内嵌代码不托管在标签页），
 *   选项页发出的消息不携带 sender.tab。
 * 输入：manifest 声明方式（options_page / options_ui 内嵌 / options_ui 整页）、
 *   打开入口（详情页入口 / 图标右键菜单 / 代码调用 openOptionsPage）。
 * 操作：在 Controls 中调整两项输入。
 * 预期结果：左栏给出与输入对应的 manifest 片段与触发代码；中间浏览器示意呈现
 *   选项页实际出现的位置（整页标签页或扩展详情页内嵌）；右栏给出打开位置、
 *   chrome.tabs 可用性、消息 sender.tab 与 sender.url 四项判断。
 * 阅读主线：打开入口只决定「从哪触发」，声明才决定「在哪里打开」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 选项页的三种声明方式，对应文档中的整页与内嵌两种类型。 */
export type OptionsDeclaration = 'options_page' | 'embedded' | 'open_in_tab';

/** 打开选项页的三个入口：两个用户入口加一个代码入口。 */
export type OptionsTrigger = 'details' | 'iconMenu' | 'openOptionsPage';

export interface OptionsModeOptions {
  declaration: OptionsDeclaration;
  trigger: OptionsTrigger;
}

export interface OptionsModeSnapshot {
  openLocation: string;
  container: string;
  tabsApi: string;
  senderTab: string;
}

export interface OptionsModeInstance {
  update(options: OptionsModeOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const STATE_BOX = { x: 24, y: 36, width: 300, height: 348 };
const BROWSER_BOX = { x: 344, y: 36, width: 268, height: 348 };
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
  orange: '#b45309',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 13px ui-sans-serif, system-ui, sans-serif';

const DECLARATION_TEXT: Record<
  OptionsDeclaration,
  { lines: string[]; color: string; note: string }
> = {
  options_page: {
    lines: ['"options_page": "options.html"'],
    color: COLORS.blue,
    note: '整页选项页：总在新标签页打开',
  },
  embedded: {
    lines: ['"options_ui": {', '  "page": "options.html",', '  "open_in_tab": false', '}'],
    color: COLORS.green,
    note: '内嵌选项页：open_in_tab 默认 false',
  },
  open_in_tab: {
    lines: ['"options_ui": {', '  "page": "options.html",', '  "open_in_tab": true', '}'],
    color: COLORS.orange,
    note: 'options_ui 整页：open_in_tab: true',
  },
};

const TRIGGER_TEXT: Record<OptionsTrigger, { chip: string; code: string }> = {
  details: {
    chip: '触发：chrome://extensions → 扩展详情 →「选项」',
    code: '→ 详情页「选项」入口',
  },
  iconMenu: {
    chip: '触发：右键工具栏图标 →「选项」',
    code: '→ 图标右键菜单「选项」',
  },
  openOptionsPage: {
    chip: '触发：popup.js 调用 chrome.runtime.openOptionsPage()',
    code: 'chrome.runtime.openOptionsPage()',
  },
};

export function createOptionsModeExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OptionsModeSnapshot) => void,
): OptionsModeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: OptionsModeOptions = {
    declaration: 'embedded',
    trigger: 'openOptionsPage',
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

    drawStatePanel(ctx, current);
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
  embedded: boolean;
  openLocation: string;
  container: string;
  tabsApi: string;
  senderTab: string;
  addressText: string;
}

function evaluate(options: OptionsModeOptions): Evaluation {
  const embedded = options.declaration === 'embedded';
  const openLocation = embedded
    ? 'chrome://extensions 详情页内嵌'
    : '新标签页（整页）';

  return {
    embedded,
    openLocation,
    container: embedded ? '扩展管理页内嵌盒子' : '普通标签页',
    tabsApi: embedded ? '不可用' : '可用',
    senderTab: embedded ? '不携带' : '正常携带',
    addressText: embedded
      ? 'chrome://extensions'
      : 'chrome-extension://<id>/options.html',
  };
}

function buildSnapshot(options: OptionsModeOptions): OptionsModeSnapshot {
  const result = evaluate(options);
  return {
    openLocation: result.openLocation,
    container: result.container,
    tabsApi: result.tabsApi,
    senderTab: result.senderTab,
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
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.arcTo(x + width, y, x + width, y, radius);
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

function drawStatePanel(
  ctx: CanvasRenderingContext2D,
  options: OptionsModeOptions,
) {
  const { x, y, width, height } = STATE_BOX;
  const declaration = DECLARATION_TEXT[options.declaration];
  const trigger = TRIGGER_TEXT[options.trigger];

  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('manifest 声明', x + 16, y + 28);

  let lineY = y + 52;
  ctx.font = FONT_CODE;
  for (const line of declaration.lines) {
    ctx.fillStyle = declaration.color;
    ctx.fillText(line, x + 16, lineY);
    lineY += 16;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  for (const line of wrapToWidth(ctx, declaration.note, width - 32)) {
    ctx.fillText(line, x + 16, lineY);
    lineY += 14;
  }

  lineY += 14;
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('打开入口', x + 16, lineY);
  lineY += 20;

  ctx.font = FONT_CODE;
  for (const line of wrapToWidth(
    ctx,
    trigger.code,
    width - 32,
  )) {
    ctx.fillStyle = COLORS.code;
    ctx.fillText(line, x + 16, lineY);
    lineY += 16;
  }

  lineY += 12;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  const notes = wrapToWidth(
    ctx,
    '三个入口通向同一个页面；到哪里由上面的声明决定，与入口无关。',
    width - 32,
  );
  for (const line of notes) {
    ctx.fillText(line, x + 16, lineY);
    lineY += 14;
  }
}

function drawBrowserMock(
  ctx: CanvasRenderingContext2D,
  options: OptionsModeOptions,
) {
  const { x, y, width, height } = BROWSER_BOX;
  const result = evaluate(options);
  const trigger = TRIGGER_TEXT[options.trigger];

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

  // 地址栏：整页为扩展页面 URL，内嵌为扩展管理页 URL
  const barY = y + 12;
  pathBox(ctx, x + 12, barY, width - 24, 22, 6);
  ctx.fillStyle = '#eef1f6';
  ctx.fill();
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText(
    truncateToWidth(ctx, result.addressText, width - 60),
    x + 22,
    barY + 15,
  );

  // 触发说明行：入口本身只决定「从哪触发」
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    truncateToWidth(ctx, trigger.chip, width - 32),
    x + 16,
    barY + 38,
  );

  const pageTop = barY + 50;
  const pageHeight = height - (pageTop - y) - 12;

  pathBox(ctx, x + 12, pageTop, width - 24, pageHeight, 6);
  ctx.fillStyle = '#f3f5f9';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (result.embedded) {
    drawEmbeddedExtensionsPage(ctx, x + 12, pageTop, width - 24, pageHeight);
  } else {
    drawOptionsTab(ctx, x + 12, pageTop, width - 24, pageHeight);
  }
}

function drawOptionsTab(
  ctx: CanvasRenderingContext2D,
  pageX: number,
  pageY: number,
  pageWidth: number,
  pageHeight: number,
) {
  // 标签页条：整页选项页就是一个普通扩展页面
  const tabWidth = 96;
  pathBox(ctx, pageX + 10, pageY + 8, tabWidth, 20, 5);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'left';
  ctx.fillText('示例扩展选项', pageX + 18, pageY + 21);

  const formX = pageX + 20;
  const formY = pageY + 40;
  const formWidth = pageWidth - 40;

  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('示例扩展选项', formX, formY + 10);

  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_LABEL;
  ctx.fillText('新标签页标题', formX, formY + 32);
  pathBox(ctx, formX, formY + 40, formWidth, 20, 4);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText('我的新标签页', formX + 8, formY + 54);

  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_LABEL;
  ctx.fillText('新标签页主题', formX, formY + 82);
  pathBox(ctx, formX, formY + 90, formWidth, 20, 4);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText('蓝 ▾', formX + 8, formY + 104);

  const buttonWidth = 64;
  pathBox(ctx, formX, formY + 124, buttonWidth, 22, 5);
  ctx.fillStyle = COLORS.blue;
  ctx.fill();
  ctx.fillStyle = COLORS.white;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'center';
  ctx.fillText('保存', formX + buttonWidth / 2, formY + 139);
  ctx.textAlign = 'left';

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    'options.html 以普通标签页打开',
    formX,
    Math.min(formY + 158, pageY + pageHeight - 10),
  );
}

function drawEmbeddedExtensionsPage(
  ctx: CanvasRenderingContext2D,
  pageX: number,
  pageY: number,
  pageWidth: number,
  pageHeight: number,
) {
  // 扩展管理页的简化版式：扩展条目 + 详情卡片，选项页嵌在详情卡片里
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'left';
  ctx.fillText('扩展程序 · override-options-demo', pageX + 12, pageY + 16);

  pathBox(ctx, pageX + 10, pageY + 24, pageWidth - 20, 34, 5);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  pathBox(ctx, pageX + 18, pageY + 32, 16, 16, 4);
  ctx.fillStyle = COLORS.blue;
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_SUB;
  ctx.fillText('扩展详情', pageX + 42, pageY + 44);

  const boxX = pageX + 14;
  const boxY = pageY + 66;
  const boxWidth = pageWidth - 28;
  const boxHeight = pageHeight - 80;

  pathBox(ctx, boxX, boxY, boxWidth, boxHeight, 5);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLORS.green;
  ctx.font = FONT_LABEL;
  ctx.fillText('选项（内嵌）', boxX + 10, boxY + 16);

  let lineY = boxY + 34;
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText('新标签页标题', boxX + 10, lineY);
  lineY += 14;
  pathBox(ctx, boxX + 10, lineY, boxWidth - 44, 16, 3);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText('我的新标签页', boxX + 16, lineY + 11);
  lineY += 26;

  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText('新标签页主题', boxX + 10, lineY);
  lineY += 14;
  pathBox(ctx, boxX + 10, lineY, boxWidth - 44, 16, 3);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText('蓝 ▾', boxX + 16, lineY + 11);
  lineY += 26;

  const buttonWidth = 56;
  pathBox(ctx, boxX + 10, lineY, buttonWidth, 20, 4);
  ctx.fillStyle = COLORS.blue;
  ctx.fill();
  ctx.fillStyle = COLORS.white;
  ctx.font = FONT_SUB;
  ctx.textAlign = 'center';
  ctx.fillText('保存', boxX + 10 + buttonWidth / 2, lineY + 14);
  ctx.textAlign = 'left';
  lineY += 34;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  for (const line of wrapToWidth(
    ctx,
    'options.html 内嵌于扩展管理页；宽度由管理页布局决定。',
    boxWidth - 20,
  )) {
    ctx.fillText(line, boxX + 10, lineY);
    lineY += 13;
  }
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: OptionsModeOptions,
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
  ctx.fillText('判断', x + 14, y + 28);

  const rows: Array<{ label: string; value: string; tone: 'good' | 'bad' | 'info' }> = [
    {
      label: '打开位置',
      value: result.openLocation,
      tone: result.embedded ? 'info' : 'good',
    },
    { label: 'chrome.tabs', value: result.tabsApi, tone: result.embedded ? 'bad' : 'good' },
    {
      label: '消息 sender.tab',
      value: result.senderTab,
      tone: result.embedded ? 'bad' : 'good',
    },
    { label: 'sender.url', value: '选项页 URL', tone: 'info' },
  ];

  let lineY = y + 52;
  for (const row of rows) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_LABEL;
    ctx.fillText(row.label, x + 14, lineY);
    lineY += 16;
    ctx.fillStyle =
      row.tone === 'good'
        ? COLORS.green
        : row.tone === 'bad'
          ? COLORS.red
          : COLORS.sub;
    ctx.font = FONT_RESULT;
    for (const line of wrapToWidth(ctx, row.value, width - 28)) {
      ctx.fillText(line, x + 14, lineY);
      lineY += 16;
    }
    lineY += 8;
  }

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + height - 58);
  ctx.lineTo(x + width - 14, y + height - 58);
  ctx.stroke();

  const rules = ['打开位置由声明决定，与入口无关', '内嵌代码不托管在标签页'];

  let ruleY = y + height - 42;
  ctx.font = FONT_SUB;
  for (const rule of rules) {
    ctx.fillStyle = '#b6c2d4';
    ctx.beginPath();
    ctx.arc(x + 18, ruleY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(truncateToWidth(ctx, rule, width - 40), x + 26, ruleY);
    ruleY -= 16;
  }
}
