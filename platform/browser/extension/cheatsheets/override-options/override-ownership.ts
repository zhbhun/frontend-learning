/**
 * 范例介绍：chrome_url_overrides 覆盖页归属演算。
 * 演示内容：同一个 Chrome 内置页面同一时刻只有一个扩展的覆盖生效；当后安装的
 *   扩展也要覆盖同一页面时，Chrome 弹出选择对话框让用户决定保留哪一个页面，
 *   没被选中的扩展虽然装着，其覆盖不生效；用户靠停用或卸载其一改变归属。
 * 输入：扩展 A（先安装）是否声明 newtab 覆盖、扩展 B（后安装）是否声明 newtab
 *   覆盖、安装 B 时用户在选择对话框里保留哪个页面。
 * 操作：在 Controls 中调整三项输入。
 * 预期结果：左栏给出两份 manifest 声明；中间浏览器示意呈现新标签页实际显示的
 *   页面，两个扩展都在时叠加安装选择对话框；右栏给出三项状态与结论。
 * 阅读主线：三项输入决定同一个事实——当前新标签页归谁；对话框只影响归属，
 *   不改变「同一页面只能有一个扩展生效」这条规则。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 用户在安装扩展 B 时的选择对话框里的取舍。 */
export type UserChoice = 'keepA' | 'useB';

export interface OverrideOwnershipOptions {
  extensionA: boolean;
  extensionB: boolean;
  userChoice: UserChoice;
}

export interface OverrideOwnershipSnapshot {
  ntpDisplay: string;
  statusA: string;
  statusB: string;
  installPrompt: string;
}

export interface OverrideOwnershipInstance {
  update(options: OverrideOwnershipOptions): void;
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
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 13px ui-sans-serif, system-ui, sans-serif';

export function createOverrideOwnershipExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OverrideOwnershipSnapshot) => void,
): OverrideOwnershipInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: OverrideOwnershipOptions = {
    extensionA: true,
    extensionB: true,
    userChoice: 'keepA',
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
  active: 'A' | 'B' | 'none';
  bothInstalled: boolean;
  ntpDisplay: string;
  statusA: string;
  statusB: string;
  installPrompt: string;
}

function evaluate(options: OverrideOwnershipOptions): Evaluation {
  const bothInstalled = options.extensionA && options.extensionB;

  let active: Evaluation['active'];
  if (bothInstalled) {
    active = options.userChoice === 'keepA' ? 'A' : 'B';
  } else if (options.extensionA) {
    active = 'A';
  } else if (options.extensionB) {
    active = 'B';
  } else {
    active = 'none';
  }

  const ntpDisplay =
    active === 'A'
      ? '扩展 A 的覆盖页'
      : active === 'B'
        ? '扩展 B 的覆盖页'
        : 'Chrome 默认新标签页';

  return {
    active,
    bothInstalled,
    ntpDisplay,
    statusA: !options.extensionA
      ? '未安装'
      : active === 'A'
        ? '生效'
        : '未生效',
    statusB: !options.extensionB
      ? '未安装'
      : active === 'B'
        ? '生效'
        : '未生效',
    installPrompt: bothInstalled ? '安装 B 时弹出选择对话框' : '——',
  };
}

function buildSnapshot(
  options: OverrideOwnershipOptions,
): OverrideOwnershipSnapshot {
  const result = evaluate(options);
  return {
    ntpDisplay: result.ntpDisplay,
    statusA: result.statusA,
    statusB: result.statusB,
    installPrompt: result.installPrompt,
  };
}

function declarationLines(file: string): string[] {
  return ['"chrome_url_overrides": {', `  "newtab": "${file}"`, '}'];
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
  ctx.arcTo(x, y + height, x, y, radius);
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
  options: OverrideOwnershipOptions,
) {
  const { x, y, width, height } = STATE_BOX;
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

  const blocks = [
    {
      label: '扩展 A（先安装）',
      installed: options.extensionA,
      file: 'ntp-a.html',
      color: COLORS.blue,
    },
    {
      label: '扩展 B（后安装）',
      installed: options.extensionB,
      file: 'ntp-b.html',
      color: COLORS.green,
    },
  ];

  let lineY = y + 56;
  for (const block of blocks) {
    ctx.fillStyle = block.installed ? COLORS.ink : COLORS.muted;
    ctx.font = FONT_LABEL;
    ctx.fillText(
      `${block.label}${block.installed ? '' : '（未安装）'}`,
      x + 16,
      lineY,
    );
    lineY += 18;

    ctx.font = FONT_CODE;
    for (const line of declarationLines(block.file)) {
      ctx.fillStyle = block.installed ? COLORS.code : '#b6c2d4';
      ctx.fillText(line, x + 16, lineY);
      lineY += 16;
    }

    lineY += 14;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  const notes = wrapToWidth(
    ctx,
    '值指向包内 HTML；每个扩展只能覆盖一个页面，两个键同时写不被允许。',
    width - 32,
  );
  for (const line of notes) {
    ctx.fillText(line, x + 16, lineY);
    lineY += 14;
  }
}

function drawBrowserMock(
  ctx: CanvasRenderingContext2D,
  options: OverrideOwnershipOptions,
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

  // 地址栏：接管的是 chrome://newtab 这个内置 URL
  const barY = y + 12;
  pathBox(ctx, x + 12, barY, width - 24, 22, 6);
  ctx.fillStyle = '#eef1f6';
  ctx.fill();
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText('chrome://newtab', x + 22, barY + 15);

  const pageTop = barY + 40;
  const pageHeight = height - (pageTop - y) - 14;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('新标签页', x + 14, pageTop - 8);

  // 页面内容：默认 / 扩展 A / 扩展 B 的覆盖页
  pathBox(ctx, x + 12, pageTop, width - 24, pageHeight, 6);
  ctx.fillStyle = '#f3f5f9';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (result.active === 'none') {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COLORS.gray;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.textAlign = 'center';
    ctx.fillText(
      'Chrome 默认新标签页',
      x + width / 2,
      pageTop + pageHeight / 2 - 6,
    );
    ctx.fillText(
      '两个扩展都没声明覆盖',
      x + width / 2,
      pageTop + pageHeight / 2 + 10,
    );
    ctx.textAlign = 'left';
    return;
  }

  const owner = result.active;
  const ownerColor = owner === 'A' ? COLORS.blue : COLORS.green;
  const ownerFile = owner === 'A' ? 'ntp-a.html' : 'ntp-b.html';
  const cardX = x + 22;
  const cardY = pageTop + 16;
  const cardWidth = width - 44;

  pathBox(ctx, cardX, cardY, cardWidth, 96, 6);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = ownerColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  pathBox(ctx, cardX, cardY, cardWidth, 18, 6);
  ctx.fillStyle = ownerColor;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cardX, cardY, cardWidth, 18);
  ctx.clip();
  ctx.fillRect(cardX, cardY + 12, cardWidth, 6);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_LABEL;
  ctx.fillText(
    owner === 'A' ? '扩展 A 的覆盖页' : '扩展 B 的覆盖页',
    cardX + 8,
    cardY + 38,
  );
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText(ownerFile, cardX + 8, cardY + 54);
  for (let row = 0; row < 2; row += 1) {
    ctx.fillStyle = '#e3e8f0';
    ctx.fillRect(cardX + 8, cardY + 64 + row * 12, cardWidth - 30 - row * 22, 6);
  }

  // 两个扩展都在时：叠加安装扩展 B 时弹出的选择对话框
  if (result.bothInstalled) {
    drawChoiceDialog(ctx, x, y, width, pageTop, pageHeight, options);
  }
}

function drawChoiceDialog(
  ctx: CanvasRenderingContext2D,
  browserX: number,
  browserY: number,
  browserWidth: number,
  pageTop: number,
  pageHeight: number,
  options: OverrideOwnershipOptions,
) {
  const dialogWidth = browserWidth - 44;
  const dialogHeight = 104;
  const dialogX = browserX + 22;
  const dialogY = pageTop + pageHeight - dialogHeight - 12;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(browserX + 12, pageTop, browserWidth - 24, pageHeight);

  pathBox(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 6);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_LABEL;
  ctx.fillText('「扩展 B」想接管新标签页', dialogX + 10, dialogY + 18);

  const buttons = [
    { label: '保留 A 的页面', value: 'keepA' as UserChoice },
    { label: '换成 B 的页面', value: 'useB' as UserChoice },
  ];
  const buttonWidth = (dialogWidth - 30) / 2;
  buttons.forEach((button, index) => {
    const buttonX = dialogX + 10 + index * (buttonWidth + 10);
    const buttonY = dialogY + 30;
    pathBox(ctx, buttonX, buttonY, buttonWidth, 24, 5);
    const chosen = options.userChoice === button.value;
    ctx.fillStyle = chosen ? COLORS.blue : '#eef1f6';
    ctx.fill();
    ctx.strokeStyle = chosen ? COLORS.blue : COLORS.boxBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = chosen ? COLORS.white : COLORS.sub;
    ctx.font = FONT_SUB;
    ctx.textAlign = 'center';
    ctx.fillText(
      button.label,
      buttonX + buttonWidth / 2,
      buttonY + 16,
    );
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    '安装扩展 B 时 Chrome 弹出的选择对话框',
    dialogX + 10,
    dialogY + dialogHeight - 10,
  );
  ctx.restore();
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: OverrideOwnershipOptions,
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
  ctx.fillText('当前状态', x + 14, y + 28);

  const rows: Array<{ label: string; value: string }> = [
    { label: '新标签页显示', value: result.ntpDisplay },
    { label: '扩展 A 的覆盖', value: result.statusA },
    { label: '扩展 B 的覆盖', value: result.statusB },
  ];

  let lineY = y + 52;
  for (const row of rows) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_LABEL;
    ctx.fillText(row.label, x + 14, lineY);
    lineY += 16;
    ctx.fillStyle = row.value === '生效' ? COLORS.green : COLORS.sub;
    ctx.font = FONT_RESULT;
    for (const line of wrapToWidth(ctx, row.value, width - 28)) {
      ctx.fillText(line, x + 14, lineY);
      lineY += 16;
    }
    lineY += 10;
  }

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + height - 88);
  ctx.lineTo(x + width - 14, y + height - 88);
  ctx.stroke();

  const rules = [
    '同一页面同一时刻只有一个扩展生效',
    '归属由用户选择决定',
    '停用或卸载其一即可切换归属',
  ];

  let ruleY = y + height - 70;
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
