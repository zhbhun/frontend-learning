/**
 * 范例介绍：launchWebAuthFlow 的授权 URL 组成与 redirect_uri 匹配演算。
 * 演示内容：非 Google 身份提供方要自己拼授权 URL。Chrome 打开一个窗口走提供方流程，
 *   只有重定向到 https://<扩展 ID>.chromiumapp.org/* 时窗口才关闭，并把完整 redirect
 *   URL 交回扩展；其他 redirect_uri 一律收不到。凭据落在 fragment 还是 query，取决于
 *   response_type 用 token 还是 code。
 * 输入：response_type、redirect_uri 的形态、interactive。
 * 操作：在 Controls 中调整三项输入。
 * 预期结果：左栏逐段标注授权 URL 的组成；中栏给出授权窗口的示意与最终归属；右栏给出
 *   回调 URL、凭据位置与下一步动作。
 * 阅读主线：redirect_uri 决定 Chrome 会不会把结果交回来，response_type 决定凭据以
 *   什么形态交回来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** response_type=token 走隐式授权，凭据在 fragment；=code 走授权码，还要再换令牌。 */
export type WebAuthResponseType = 'token' | 'code';

/** redirect_uri 的形态：只有 chromiumapp.org 模式会被 Chrome 交付给扩展。 */
export type WebAuthRedirect = 'chromiumapp' | 'other-origin' | 'extension-page';

export interface WebAuthFlowOptions {
  responseType: WebAuthResponseType;
  redirectTarget: WebAuthRedirect;
  interactive: boolean;
}

export interface WebAuthFlowSnapshot {
  matchText: string;
  credentialText: string;
  windowText: string;
}

export interface WebAuthFlowInstance {
  update(options: WebAuthFlowOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const URL_BOX = { x: 24, y: 36, width: 296, height: 348 };
const WINDOW_BOX = { x: 336, y: 36, width: 264, height: 348 };
const RESULT_BOX = { x: 616, y: 36, width: 200, height: 348 };

const COLORS = {
  ink: '#172033',
  sub: '#5b6b81',
  muted: '#7c8aa0',
  code: '#33415c',
  blue: '#4f7cff',
  green: '#15803d',
  gray: '#64748b',
  red: '#b91c1c',
  amber: '#a16207',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
  panelBg: '#eef3ff',
  okBg: '#eaf6ee',
  badBg: '#fdf1f1',
  waitBg: '#fdf6e7',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 14px ui-sans-serif, system-ui, sans-serif';

/** 官方文档示例里的 32 位扩展 ID，用于展示 chromiumapp.org 域名。 */
const EXTENSION_ID = 'abcdefghijklmnopqrstuvwxyzabcdef';
const PROVIDER_HOST = 'auth.provider.example';
const CLIENT_ID = 'demo-client-id-1234';

interface Evaluation {
  redirectUri: string;
  matched: boolean;
  authorizeUrl: string;
  callbackUrl: string;
  credentialText: string;
  nextStep: string;
  windowText: string;
  errorText: string | null;
}

function redirectUriFor(target: WebAuthRedirect): string {
  switch (target) {
    case 'chromiumapp':
      return `https://${EXTENSION_ID}.chromiumapp.org/provider_cb`;
    case 'other-origin':
      return 'http://localhost:3000/cb';
    default:
      return `chrome-extension://${EXTENSION_ID}/callback.html`;
  }
}

export function createWebAuthFlowExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WebAuthFlowSnapshot) => void,
): WebAuthFlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx = context;

  let current: WebAuthFlowOptions = {
    responseType: 'token',
    redirectTarget: 'chromiumapp',
    interactive: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

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
      offsetX * pixelRatio,
      offsetY * pixelRatio,
    );

    drawUrlPanel(ctx, current);
    drawWindowPanel(ctx, current);
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

export function evaluateWebAuthFlow(
  options: WebAuthFlowOptions,
): Evaluation {
  const redirectUri = redirectUriFor(options.redirectTarget);
  const matched = options.redirectTarget === 'chromiumapp';
  const authorizeUrl = `https://${PROVIDER_HOST}/authorize?client_id=${CLIENT_ID}`;
  const scope = 'read%3Auser';
  const callbackUrl = matched
    ? options.responseType === 'token'
      ? `${redirectUri}#access_token=ya29.a0Af...&token_type=bearer`
      : `${redirectUri}?code=abc123&state=xyz`
    : `${PROVIDER_HOST}/login/consent`;

  return {
    redirectUri,
    matched,
    authorizeUrl,
    callbackUrl,
    credentialText:
      options.responseType === 'token'
        ? 'URL fragment：#access_token=…'
        : 'URL query：?code=…（需再换令牌）',
    nextStep:
      options.responseType === 'token'
        ? 'Authorization: Bearer <token> 直接调用受保护 API'
        : '拿 code 换令牌要带 client secret——扩展里不放 secret，见 5.5 安全与隐私',
    windowText: options.interactive
      ? '可见窗口：等用户登录并同意'
      : '不可见窗口：限时完成，否则报 User interaction required.',
    errorText: matched
      ? null
      : '报错：Did not redirect to the right URL.',
  };
}

function buildSnapshot(options: WebAuthFlowOptions): WebAuthFlowSnapshot {
  const result = evaluateWebAuthFlow(options);
  return {
    matchText: result.matched ? '命中，Chrome 交付' : '不命中，窗口不关',
    credentialText: result.credentialText,
    windowText: result.windowText,
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

function drawUrlPanel(
  ctx: CanvasRenderingContext2D,
  options: WebAuthFlowOptions,
) {
  const { x, y, width } = URL_BOX;
  const result = evaluateWebAuthFlow(options);

  pathBox(ctx, x, y, width, URL_BOX.height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('授权 URL 的组成', x + 16, y + 28);

  const rows: Array<{ name: string; value: string; dim: boolean }> = [
    { name: 'client_id', value: CLIENT_ID, dim: false },
    { name: 'redirect_uri', value: result.redirectUri, dim: !result.matched },
    {
      name: 'response_type',
      value: options.responseType,
      dim: false,
    },
    { name: 'scope', value: 'read:user', dim: false },
  ];

  let lineY = y + 54;
  ctx.font = FONT_CODE;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`${result.authorizeUrl}?`, x + 16, lineY);
  lineY += 20;

  rows.forEach((row, index) => {
    ctx.fillStyle = COLORS.blue;
    ctx.font = FONT_CODE;
    ctx.fillText(
      truncateToWidth(ctx, `${row.name}=`, 96),
      x + 16,
      lineY,
    );
    ctx.fillStyle = row.dim ? COLORS.red : COLORS.code;
    const valueX = x + 16 + 74;
    for (const line of wrapToWidth(ctx, row.value, width - 32 - 74)) {
      ctx.fillText(line, valueX, lineY);
      lineY += 14;
    }
    if (index < rows.length - 1) {
      ctx.fillStyle = COLORS.muted;
      ctx.fillText('&', valueX, lineY);
      lineY += 16;
    } else {
      lineY += 6;
    }
  });

  lineY += 8;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('scope 要编码：空格与冒号转 %20 / %3A', x + 16, lineY);
  lineY += 18;

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, lineY);
  ctx.lineTo(x + width - 14, lineY);
  ctx.stroke();
  lineY += 18;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('redirect_uri 的来源', x + 16, lineY);
  lineY += 15;
  ctx.font = FONT_CODE;
  ctx.fillStyle = COLORS.code;
  for (const line of wrapToWidth(
    ctx,
    "chrome.identity.getRedirectURL('provider_cb')",
    width - 32,
  )) {
    ctx.fillText(line, x + 16, lineY);
    lineY += 14;
  }
}

function drawWindowPanel(
  ctx: CanvasRenderingContext2D,
  options: WebAuthFlowOptions,
) {
  const { x, y, width } = WINDOW_BOX;
  const result = evaluateWebAuthFlow(options);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('授权窗口（模拟）', x, y - 12);

  const windowX = x;
  const windowY = y + 4;
  const windowWidth = width;
  const windowHeight = 214;

  pathBox(ctx, windowX, windowY, windowWidth, windowHeight, 8);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = options.interactive ? COLORS.blue : COLORS.gray;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 标题栏
  pathBox(ctx, windowX, windowY, windowWidth, 22, 8);
  ctx.fillStyle = options.interactive ? COLORS.panelBg : '#eef1f6';
  ctx.fill();
  const dots = ['#f87171', '#fbbf24', '#34d399'];
  dots.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(windowX + 14 + index * 12, windowY + 11, 3.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText(
    options.interactive ? '提供方授权页' : '后台窗口（用户看不到）',
    windowX + 58,
    windowY + 15,
  );

  // 地址栏
  const addressY = windowY + 30;
  pathBox(ctx, windowX + 10, addressY, windowWidth - 20, 18, 9);
  ctx.fillStyle = '#f4f6fa';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText(
    truncateToWidth(
      ctx,
      result.matched ? result.redirectUri : result.callbackUrl,
      windowWidth - 44,
    ),
    windowX + 20,
    addressY + 13,
  );

  // 正文
  const bodyY = addressY + 28;
  pathBox(ctx, windowX + 10, bodyY, windowWidth - 20, 86, 6);
  ctx.fillStyle = '#fbfcfe';
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_LABEL;
  ctx.fillText('sign in to provider', windowX + 22, bodyY + 22);
  for (const [index, placeholder] of [
    'you@example.com',
    '••••••••••',
  ].entries()) {
    const fieldY = bodyY + 34 + index * 24;
    pathBox(ctx, windowX + 22, fieldY, windowWidth - 44, 18, 4);
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.fillText(placeholder, windowX + 30, fieldY + 13);
  }

  // 状态条
  const statusY = windowY + windowHeight + 10;
  pathBox(ctx, windowX, statusY, windowWidth, 46, 6);
  ctx.fillStyle = result.matched ? COLORS.okBg : COLORS.badBg;
  ctx.fill();
  ctx.strokeStyle = result.matched ? COLORS.green : COLORS.red;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = result.matched ? COLORS.green : COLORS.red;
  ctx.font = FONT_LABEL;
  ctx.fillText(
    result.matched ? '命中：关窗并回调' : '未命中：窗口不关',
    windowX + 10,
    statusY + 18,
  );
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText(
    truncateToWidth(
      ctx,
      result.errorText ??
        'launchWebAuthFlow 返回完整 redirect URL',
      windowWidth - 20,
    ),
    windowX + 10,
    statusY + 35,
  );

  // 模式提示
  const noteY = statusY + 58;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  for (const line of wrapToWidth(ctx, result.windowText, width)) {
    ctx.fillText(line, windowX, noteY);
  }
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: WebAuthFlowOptions,
) {
  const { x, y, width } = RESULT_BOX;
  const result = evaluateWebAuthFlow(options);

  pathBox(ctx, x, y, width, RESULT_BOX.height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText('扩展侧结果', x + 14, y + 28);

  let lineY = y + 50;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('回调 URL', x + 14, lineY);
  lineY += 15;
  ctx.font = FONT_CODE;
  for (const line of wrapToWidth(ctx, result.callbackUrl, width - 28)) {
    ctx.fillStyle = result.matched ? COLORS.code : COLORS.muted;
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 8;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('凭据位置', x + 14, lineY);
  lineY += 15;
  ctx.font = FONT_SUB;
  ctx.fillStyle = COLORS.code;
  for (const line of wrapToWidth(ctx, result.credentialText, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 8;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('下一步', x + 14, lineY);
  lineY += 15;
  ctx.font = FONT_SUB;
  ctx.fillStyle = COLORS.sub;
  for (const line of wrapToWidth(ctx, result.nextStep, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 14;
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, lineY);
  ctx.lineTo(x + width - 14, lineY);
  ctx.stroke();
  lineY += 18;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('行为边界', x + 14, lineY);
  lineY += 14;

  const notes = [
    'redirect_uri 只认 chromiumapp.org',
    '非交互窗口不可见且限时',
    '同时只能有一个授权流程',
  ];
  ctx.font = FONT_SUB;
  for (const note of notes) {
    ctx.fillStyle = '#b6c2d4';
    ctx.beginPath();
    ctx.arc(x + 18, lineY - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    for (const line of wrapToWidth(ctx, note, width - 44)) {
      ctx.fillText(line, x + 26, lineY);
      lineY -= 12;
    }
    lineY -= 2;
  }
}
