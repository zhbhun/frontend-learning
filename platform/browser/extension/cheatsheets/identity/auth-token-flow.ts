/**
 * 范例介绍：getAuthToken 的 interactive × 前置缓存状态 → 调用结果演算。
 * 演示内容：Chrome 在内存里缓存 OAuth2 访问令牌。interactive=false 只读缓存，需要
 *   用户确认就直接失败（OAuth2 not granted or revoked.）；interactive=true 才可能弹
 *   授权 UI，但缓存命中时同样不弹窗。缓存里「已过期」由 Chrome 自动处理；服务端「已
 *   吊销」只有调用受保护 API 得到 401 才知道，处理办法是 removeCachedAuthToken 后
 *   重取一枚新令牌。
 * 输入：getAuthToken 的 interactive 参数、Identity API 前置缓存状态。
 * 操作：在 Controls 中调整两项输入。
 * 预期结果：左栏给出扩展侧调用与受保护 API 的返回；中栏给出令牌在扩展、Chrome
 *   缓存、授权 UI 与受保护 API 之间的流动；右栏给出当前结论与 removeCachedAuthToken
 *   之后的下一步。
 * 阅读主线：缓存状态决定要不要问用户，问不问用户决定调用会不会失败。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 令牌缓存的前置状态：四种情形对应四种真实处理路径。 */
export type AuthTokenState = 'empty' | 'valid' | 'expired' | 'revoked';

export interface AuthTokenFlowOptions {
  interactive: boolean;
  tokenState: AuthTokenState;
}

export interface AuthTokenFlowSnapshot {
  promptText: string;
  tokenText: string;
  apiText: string;
  afterRemoveText: string;
}

export interface AuthTokenFlowInstance {
  update(options: AuthTokenFlowOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const CODE_BOX = { x: 24, y: 36, width: 296, height: 348 };
const FLOW_BOX = { x: 336, y: 36, width: 264, height: 348 };
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
  cacheBg: '#eef3ff',
  okBg: '#eaf6ee',
  badBg: '#fdf1f1',
  waitBg: '#fdf6e7',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_RESULT = '600 14px ui-sans-serif, system-ui, sans-serif';

const STATE_TEXT: Record<AuthTokenState, string> = {
  empty: '缓存为空（未授权）',
  valid: '缓存有效',
  expired: '缓存已过期',
  revoked: '服务端已吊销',
};

/** 演示用的假令牌与假 API 域名，仅用于读数和示意。 */
const SAMPLE_TOKEN = 'ya29.a0Af...';
const API_HOST = 'www.googleapis.com/drive/v3/files';

interface Evaluation {
  prompt: boolean;
  tokenOk: boolean;
  errorText: string | null;
  apiStatus: 'ok' | 'unauthorized' | 'none';
  apiText: string;
  tokenText: string;
  afterRemoveText: string;
}

function evaluate(options: AuthTokenFlowOptions): Evaluation {
  const state = options.tokenState;

  // 缓存命中：直接返回手里的令牌，interactive 取值不影响这一步
  if (state === 'valid' || state === 'revoked') {
    const revoked = state === 'revoked';
    return {
      prompt: false,
      tokenOk: true,
      errorText: null,
      apiStatus: revoked ? 'unauthorized' : 'ok',
      apiText: revoked ? '401 Unauthorized' : '200 OK',
      tokenText: revoked ? '返回手里的旧令牌' : SAMPLE_TOKEN,
      afterRemoveText: revoked
        ? '下一次 getAuthToken 静默取到新令牌，API 回到 200'
        : '少引用一枚旧令牌；下一次照常取新令牌',
    };
  }

  // 缓存已过期：Chrome 自己续期，调用方无感
  if (state === 'expired') {
    return {
      prompt: false,
      tokenOk: true,
      errorText: null,
      apiStatus: 'ok',
      apiText: '200 OK',
      tokenText: 'Chrome 自动续期，返回新令牌',
      afterRemoveText: '过期本来就自动处理，这一步只是清掉手里的引用',
    };
  }

  // 缓存为空：interactive 决定是弹窗还是直接失败
  return {
    prompt: options.interactive,
    tokenOk: options.interactive,
    errorText: options.interactive
      ? null
      : '报错：OAuth2 not granted or revoked.',
    apiStatus: options.interactive ? 'ok' : 'none',
    apiText: options.interactive ? '200 OK' : '未发起（没有令牌）',
    tokenText: options.interactive ? '弹窗后拿到新令牌' : 'Promise reject',
    afterRemoveText: options.interactive
      ? '授权记录还在，下一次直接拿到令牌'
      : '未授权状态不变，下一次调用照样失败',
  };
}

export function createAuthTokenFlowExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AuthTokenFlowSnapshot) => void,
): AuthTokenFlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx = context;

  let current: AuthTokenFlowOptions = {
    interactive: false,
    tokenState: 'empty',
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

    drawCodePanel(ctx, current);
    drawFlowPanel(ctx, current);
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

function buildSnapshot(options: AuthTokenFlowOptions): AuthTokenFlowSnapshot {
  const result = evaluate(options);
  return {
    promptText: result.prompt ? '弹出授权 UI' : '不弹窗',
    tokenText: result.tokenText,
    apiText: result.apiText,
    afterRemoveText: result.afterRemoveText,
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

function drawCodePanel(
  ctx: CanvasRenderingContext2D,
  options: AuthTokenFlowOptions,
) {
  const { x, y, width, height } = CODE_BOX;
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
  ctx.fillText('扩展 sw.js', x + 16, y + 28);

  const lines: Array<{
    text: string;
    kind: 'dim' | 'plain' | 'hit' | 'miss';
  }> = [
    { text: 'const { token } = await', kind: 'dim' },
    { text: '  chrome.identity.getAuthToken({', kind: 'dim' },
    {
      text: `    interactive: ${options.interactive},`,
      kind: options.interactive ? 'hit' : 'plain',
    },
    { text: '  });', kind: 'dim' },
    { text: '', kind: 'dim' },
    // 取不到令牌时，fetch 及其后面的代码根本走不到：标成 miss
    { text: `const res = await fetch(`, kind: result.tokenOk ? 'dim' : 'miss' },
    {
      text: `  "https://${API_HOST}",`,
      kind: result.tokenOk ? 'dim' : 'miss',
    },
    {
      text: '  { headers: { Authorization:',
      kind: result.tokenOk ? 'dim' : 'miss',
    },
    { text: '      `Bearer ${token}` } }', kind: result.tokenOk ? 'dim' : 'miss' },
    { text: ');', kind: result.tokenOk ? 'dim' : 'miss' },
  ];

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
      ctx.fillStyle = line.kind === 'hit' ? COLORS.cacheBg : COLORS.badBg;
      ctx.fillRect(x + 8, lineY - 11, lineWidth, 15);
    }
    ctx.fillStyle =
      line.kind === 'hit'
        ? COLORS.blue
        : line.kind === 'miss'
          ? COLORS.red
          : line.kind === 'plain'
            ? COLORS.code
            : COLORS.muted;
    ctx.font = FONT_CODE;
    ctx.fillText(truncateToWidth(ctx, line.text, width - 40), x + 16, lineY);
    lineY += 16;
  }

  lineY += 12;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('本步结果', x + 16, lineY);
  lineY += 16;
  ctx.font = FONT_CODE;
  for (const line of wrapToWidth(ctx, result.tokenText, width - 32)) {
    ctx.fillStyle = result.tokenOk ? COLORS.code : COLORS.red;
    ctx.fillText(line, x + 16, lineY);
    lineY += 14;
  }

  lineY += 8;
  ctx.font = FONT_LABEL;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('受保护 API', x + 16, lineY);
  lineY += 15;
  ctx.font = FONT_RESULT;
  ctx.fillStyle =
    result.apiStatus === 'ok'
      ? COLORS.green
      : result.apiStatus === 'unauthorized'
        ? COLORS.red
        : COLORS.gray;
  ctx.fillText(result.apiText, x + 16, lineY);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toY: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(fromX, toY - 5);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(fromX - 4, toY - 6);
  ctx.lineTo(fromX + 4, toY - 6);
  ctx.lineTo(fromX, toY);
  ctx.closePath();
  ctx.fill();
}

function drawFlowPanel(
  ctx: CanvasRenderingContext2D,
  options: AuthTokenFlowOptions,
) {
  const { x, y, width, height } = FLOW_BOX;
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
  ctx.fillText('令牌流动（模拟）', x + 16, y + 28);

  const innerX = x + 16;
  const innerWidth = width - 32;
  const centerX = x + width / 2;

  // 第一行：扩展调用
  pathBox(ctx, innerX, y + 44, innerWidth, 30, 6);
  ctx.fillStyle = COLORS.cacheBg;
  ctx.fill();
  ctx.strokeStyle = COLORS.blue;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'center';
  ctx.fillText('扩展：getAuthToken()', centerX, y + 63);
  ctx.textAlign = 'left';

  drawArrow(ctx, centerX, y + 74, y + 92, COLORS.muted);

  // 第二行：Chrome 的令牌缓存
  const cacheY = y + 96;
  pathBox(ctx, innerX, cacheY, innerWidth, 46, 6);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('chrome.identity 令牌缓存', innerX + 8, cacheY + 16);
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_CODE;
  ctx.fillText(
    truncateToWidth(ctx, STATE_TEXT[options.tokenState], innerWidth - 16),
    innerX + 8,
    cacheY + 33,
  );

  if (result.prompt) {
    drawArrow(ctx, centerX, cacheY + 46, cacheY + 66, COLORS.blue);
    const authY = cacheY + 70;
    pathBox(ctx, innerX, authY, innerWidth, 52, 6);
    ctx.fillStyle = COLORS.waitBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = FONT_LABEL;
    ctx.fillText('授权 UI：选择账号 + 同意 scope', innerX + 8, authY + 17);
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.fillText('interactive: true 才走到这一步', innerX + 8, authY + 33);
    ctx.fillStyle = COLORS.code;
    ctx.font = FONT_CODE;
    ctx.fillText('用户操作 → 新令牌写入缓存', innerX + 8, authY + 47);
    drawArrow(ctx, centerX, authY + 52, authY + 70, COLORS.blue);
  } else {
    drawArrow(ctx, centerX, cacheY + 46, cacheY + 66, COLORS.muted);
    const skipY = cacheY + 70;
    ctx.save();
    pathBox(ctx, innerX, skipY, innerWidth, 52, 6);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COLORS.gray;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_LABEL;
    ctx.fillText('不弹窗', innerX + 8, skipY + 17);
    ctx.font = FONT_SUB;
    ctx.fillText(
      options.tokenState === 'empty'
        ? 'interactive: false → 直接失败'
        : '缓存里有令牌 → 原样返回',
      innerX + 8,
      skipY + 33,
    );
  }

  const apiY = y + 244;
  const apiColor =
    result.apiStatus === 'ok'
      ? COLORS.green
      : result.apiStatus === 'unauthorized'
        ? COLORS.red
        : COLORS.gray;
  pathBox(ctx, innerX, apiY, innerWidth, 44, 6);
  ctx.fillStyle =
    result.apiStatus === 'ok'
      ? COLORS.okBg
      : result.apiStatus === 'unauthorized'
        ? COLORS.badBg
        : COLORS.white;
  ctx.fill();
  ctx.strokeStyle = apiColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('受保护 API', innerX + 8, apiY + 16);
  ctx.fillStyle = apiColor;
  ctx.font = FONT_RESULT;
  ctx.fillText(result.apiText, innerX + 8, apiY + 34);

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    '携带 Authorization: Bearer <token>',
    innerX + 8,
    y + height - 16,
  );
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  options: AuthTokenFlowOptions,
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
  ctx.fillText('当前结论', x + 14, y + 28);

  let lineY = y + 50;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('getAuthToken 结果', x + 14, lineY);
  lineY += 15;
  ctx.font = FONT_CODE;
  ctx.fillStyle = result.tokenOk ? COLORS.code : COLORS.red;
  for (const line of wrapToWidth(ctx, result.tokenText, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 6;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('是否问用户', x + 14, lineY);
  lineY += 15;
  ctx.font = FONT_SUB;
  ctx.fillStyle = result.prompt ? COLORS.amber : COLORS.gray;
  ctx.fillText(result.prompt ? '弹授权 UI' : '静默', x + 14, lineY);
  lineY += 22;

  ctx.strokeStyle = COLORS.boxBorder;
  ctx.beginPath();
  ctx.moveTo(x + 14, lineY);
  ctx.lineTo(x + width - 14, lineY);
  ctx.stroke();
  lineY += 18;

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('removeCachedAuthToken 之后', x + 14, lineY);
  lineY += 15;
  ctx.font = FONT_SUB;
  ctx.fillStyle = COLORS.code;
  for (const line of wrapToWidth(ctx, result.afterRemoveText, width - 28)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 14;
  }

  lineY += 14;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('行为边界', x + 14, lineY);
  lineY += 14;

  const notes = [
    'interactive=false 只读缓存',
    '过期自动处理，被吊销要手动清',
    'removeCachedAuthToken 只清一枚',
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
