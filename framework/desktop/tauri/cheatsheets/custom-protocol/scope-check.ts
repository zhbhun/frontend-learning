/**
 * 范例介绍:重放 asset 协议的 scope 判定链——一条协议 URL 请求到达 Tauri 核心
 *   后,怎样被 assetProtocol.scope 放行或拒绝。
 * 输入:scope 预设(默认空 / $RESOURCE 递归 / $RESOURCE 单层 / $HOME allow+deny)、
 *   请求路径(资源目录内 / 主目录 / dotfile / deny 命中)、平台(Unix / Windows)。
 * 主要操作:切换任一输入即重放判定:解析绝对路径 → allow 模式对照 → deny 对照
 *   (对象形式)→ 状态码。Unix 上默认 requireLiteralLeadingDot:通配不匹配
 *   . 开头的段;deny 命中优先于 allow。
 * 预期结果:默认空 scope 全部 403;"$RESOURCE" 递归模式放行资源目录全部文件;
 *   "$RESOURCE" 单层模式放不下 fonts 与资源目录根外的层级;"$HOME" 递归放不下
 *   .cache(Unix),deny 精确挡下 secrets——403 表示"scope 拒绝",与 404(文件
 *   不存在)不同。
 * 阅读主线:asset 协议的关卡是 tauri.conf.json 里的 scope,不在 capabilities。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScopePresetVariant =
  | 'empty'
  | 'resourceRecursive'
  | 'resourceNarrow'
  | 'homeAllowDeny';
export type RequestPathVariant =
  | 'logo.png'
  | 'assets/logo.png'
  | 'fonts/Inter.ttf'
  | '/Users/me/Documents/photo.png'
  | '/Users/me/.cache/blob.dat'
  | '/Users/me/secrets/key.pem';
export type PlatformVariant = 'unix' | 'windows';

export interface ScopeCheckArgs {
  scopePreset: ScopePresetVariant;
  requestPath: RequestPathVariant;
  platform: PlatformVariant;
}

export interface ScopeCheckSnapshot {
  /** 读数:解析后的绝对路径。 */
  resolvedPath: string;
  /** 读数:allow 模式命中情况。 */
  allowLabel: string;
  /** 读数:deny 模式命中情况。 */
  denyLabel: string;
  /** 读数:最终判定。 */
  verdictLabel: string;
}

export interface ScopeCheckInstance {
  update(options: ScopeCheckArgs): void;
  dispose(): void;
}

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#94a3b8';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const FAIL = '#b91c1c';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const CANVAS_W = 720;
const CANVAS_H = 452;

const LEFT_X = 24;
const LEFT_W = 322;
const RIGHT_X = 370;
const RIGHT_W = 326;

const REQ_Y = 20;
const REQ_H = 150;
const SCOPE_Y = 186;
const SCOPE_H = 246;

const STEPS_Y = 20;
const STEPS_H = 250;
const RESULT_Y = 286;
const RESULT_H = 146;

/* 目录变量在本示例中的示意值:实际随平台与安装方式不同。 */
const PREFIX: Record<PlatformVariant, { RESOURCE: string; HOME: string; sep: string }> = {
  unix: { RESOURCE: '/Applications/MyApp.app/Contents/Resources', HOME: '/Users/me', sep: '/' },
  windows: { RESOURCE: 'C:\\Program Files\\MyApp', HOME: 'C:\\Users\\me', sep: '\\' },
};

type Base = 'RESOURCE' | 'HOME';

interface RequestPath {
  base: Base;
  segs: string[];
}

interface Pattern {
  kind: 'allow' | 'deny';
  base: Base;
  segs: string[];
}

const REQUEST_PATHS: Record<RequestPathVariant, RequestPath> = {
  'logo.png': { base: 'RESOURCE', segs: ['logo.png'] },
  'assets/logo.png': { base: 'RESOURCE', segs: ['assets', 'logo.png'] },
  'fonts/Inter.ttf': { base: 'RESOURCE', segs: ['fonts', 'Inter.ttf'] },
  '/Users/me/Documents/photo.png': { base: 'HOME', segs: ['Documents', 'photo.png'] },
  '/Users/me/.cache/blob.dat': { base: 'HOME', segs: ['.cache', 'blob.dat'] },
  '/Users/me/secrets/key.pem': { base: 'HOME', segs: ['secrets', 'key.pem'] },
};

const SCOPE_PRESETS: Record<ScopePresetVariant, Pattern[]> = {
  empty: [],
  resourceRecursive: [{ kind: 'allow', base: 'RESOURCE', segs: ['**', '*'] }],
  resourceNarrow: [{ kind: 'allow', base: 'RESOURCE', segs: ['assets', '*'] }],
  homeAllowDeny: [
    { kind: 'allow', base: 'HOME', segs: ['**', '*'] },
    { kind: 'deny', base: 'HOME', segs: ['secrets', '**'] },
  ],
};

const PATTERN_TEXT: Record<ScopePresetVariant, string[]> = {
  empty: ['scope: [](默认值)', '未放行任何路径'],
  resourceRecursive: ['scope: ["$RESOURCE/**/*"]', '资源目录全部文件,任意深度'],
  resourceNarrow: ['scope: ["$RESOURCE/assets/*"]', '只放行 assets 下单层文件'],
  homeAllowDeny: ['scope: { "allow": ["$HOME/**/*"],', '  "deny": ["$HOME/secrets/**"] }'],
};

/* 简化版 glob 匹配:支持 '**'(跨层)与 '*'(单段,不跨 /)。 */
function matchPattern(
  pattern: Pattern,
  request: RequestPath,
  platform: PlatformVariant,
): boolean {
  if (pattern.base !== request.base) {
    return false;
  }
  // Unix 默认 requireLiteralLeadingDot:通配符不匹配 . 开头的段。
  const dotRule = platform === 'unix';

  function tokensMatch(pIdx: number, tIdx: number): boolean {
    if (pIdx === pattern.segs.length) {
      return tIdx === request.segs.length;
    }
    const token = pattern.segs[pIdx];
    if (token === '**') {
      // `**` 跨层吞段:Unix 上被吞的段同样受 dotfile 规则约束
      const remaining = request.segs.length - tIdx;
      for (let take = 0; take <= remaining; take += 1) {
        if (dotRule && take > 0 && request.segs[tIdx + take - 1].startsWith('.')) {
          // 被吞段包含 . 开头段:更大的 take 也会包含它,直接终止
          break;
        }
        if (tokensMatch(pIdx + 1, tIdx + take)) {
          return true;
        }
      }
      return false;
    }
    if (tIdx >= request.segs.length) {
      return false;
    }
    const segment = request.segs[tIdx];
    const literal = token !== '*';
    if (!literal && dotRule && segment.startsWith('.')) {
      return false;
    }
    if (!literal || token === segment) {
      return tokensMatch(pIdx + 1, tIdx + 1);
    }
    return false;
  }

  return tokensMatch(0, 0);
}

type StepStatus = 'done' | 'current' | 'todo' | 'fail';

interface StepDef {
  text: string;
  at: number;
  fail?: boolean;
}

interface Scenario {
  steps: StepDef[];
  total: number;
}

function buildScenario(args: ScopeCheckArgs): Scenario {
  const request = REQUEST_PATHS[args.requestPath];
  const patterns = SCOPE_PRESETS[args.scopePreset];
  const allow = patterns.find((p) => p.kind === 'allow');
  const deny = patterns.find((p) => p.kind === 'deny');
  // dotfile 提示只在 allow 的目录域与请求一致时才有意义(域不同未命中另有原因)
  const dotHint =
    allow && allow.base === request.base && args.platform === 'unix'
      && request.segs.some((s) => s.startsWith('.'))
      ? '(Unix 通配不匹配 . 段)'
      : '';

  const arrive: StepDef = {
    text: '协议 URL 请求到达 Tauri 核心内置 handler',
    at: 0,
  };
  const decode: StepDef = {
    text: 'percent-decode + SafePathBuf 校验:通过',
    at: 280,
  };

  if (patterns.length === 0) {
    return {
      steps: [
        arrive,
        decode,
        { text: 'scope 检查:配置为 [](未放行任何路径)', at: 560, fail: true },
        { text: '403 Forbidden · 修复:assetProtocol.scope 加路径', at: 900, fail: true },
      ],
      total: 1160,
    };
  }

  const allowHit = allow ? matchPattern(allow, request, args.platform) : false;
  const denyHit = deny ? matchPattern(deny, request, args.platform) : false;
  const denyText = deny
    ? `deny 对照 $HOME/secrets/**:${denyHit ? '命中 → deny 优先' : '未命中'}`
    : 'deny 对照:本预设没有 deny';
  const patternText = allow
    ? `$${allow.base}/${allow.segs.join('/')}`
    : '(无 allow)';
  const verdict: StepDef = allowHit && !denyHit
    ? { text: '200 OK · 核心读文件,魔数猜 MIME', at: 1180 }
    : { text: '403 Forbidden · 路径不在 asset scope', at: 1180, fail: true };

  return {
    steps: [
      arrive,
      decode,
      {
        text: `allow 对照 ${patternText}:${allowHit ? '命中' : '未命中'}${allowHit ? '' : dotHint}`,
        at: 560,
        fail: !allowHit,
      },
      { text: denyText, at: 870, fail: denyHit },
      verdict,
    ],
    total: 1420,
  };
}

export function createScopeCheck(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScopeCheckSnapshot) => void,
): ScopeCheckInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ScopeCheckArgs = {
    scopePreset: 'resourceRecursive',
    requestPath: 'assets/logo.png',
    platform: 'unix',
  };
  let startedAt = 0;
  let rafId = 0;
  let settleTimer = 0;

  function clearTimers(): void {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
    }
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function panel(x: number, y: number, w: number, h: number, borderColor: string): void {
    drawingContext.fillStyle = BOX_BG;
    roundRect(x, y, w, h, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = borderColor;
    drawingContext.stroke();
  }

  function label(
    x: number,
    y: number,
    text: string,
    options: { color?: string; mono?: boolean; weight?: number; size?: number },
  ): void {
    drawingContext.fillStyle = options.color ?? TEXT;
    const size = options.size ?? 11;
    const family = options.mono
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'ui-sans-serif, system-ui, sans-serif';
    drawingContext.font = `${options.weight ?? 400} ${size}px ${family}`;
    drawingContext.fillText(text, x, y);
  }

  /* 步骤行:圆点标记状态(当前 / 失败 / 未到),文字随状态着色。 */
  function stepRow(x: number, y: number, text: string, status: StepStatus): void {
    const color = status === 'current' ? ACCENT : status === 'fail' ? FAIL : PALE;
    const textColor = status === 'todo' ? PALE : status === 'fail' ? FAIL : TEXT;
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    drawingContext.arc(x + 6, y - 3, 4, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = textColor;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(text, x + 20, y);
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(CANVAS_W, size.width);
    const height = Math.max(CANVAS_H, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const { scopePreset, requestPath, platform } = current;
    const request = REQUEST_PATHS[requestPath];
    const paths = PREFIX[platform];
    const sep = paths.sep;
    const resolved = `${paths[request.base]}${sep}${request.segs.join(sep)}`;
    const scenario = buildScenario(current);
    const lastAt = scenario.steps[scenario.steps.length - 1].at;
    const elapsed = startedAt === 0 ? scenario.total : performance.now() - startedAt;
    const phase = (at: number) => startedAt === 0 || elapsed >= at;
    const settled = phase(lastAt);

    const patterns = SCOPE_PRESETS[scopePreset];
    const allow = patterns.find((p) => p.kind === 'allow');
    const deny = patterns.find((p) => p.kind === 'deny');
    const allowHit = allow ? matchPattern(allow, request, platform) : false;
    const denyHit = deny ? matchPattern(deny, request, platform) : false;
    const granted = allowHit && !denyHit;

    /* 左上:请求路径卡。 */
    panel(LEFT_X, REQ_Y, LEFT_W, REQ_H, BOX_BORDER);
    label(LEFT_X + 12, REQ_Y + 22, 'convertFileSrc(path) 请求的资源', { color: DIM });
    label(LEFT_X + 12, REQ_Y + 46, requestPath, { mono: true, size: 10.5, weight: 600 });
    label(LEFT_X + 12, REQ_Y + 72, '解析后的绝对路径(scope 按它判定):', {
      size: 10,
      color: DIM,
    });
    const maxChars = 40;
    for (let start = 0, line = 0; start < resolved.length; start += maxChars, line += 1) {
      label(
        LEFT_X + 12,
        REQ_Y + 94 + line * 16,
        resolved.slice(start, start + maxChars),
        { mono: true, size: 10 },
      );
    }
    label(LEFT_X + 12, REQ_Y + 134, '目录变量示意值,实际随平台与安装方式不同', {
      size: 9.5,
      color: PALE,
    });

    /* 左下:scope 配置卡。 */
    panel(LEFT_X, SCOPE_Y, LEFT_W, SCOPE_H, ACCENT);
    label(LEFT_X + 12, SCOPE_Y + 24, 'tauri.conf.json → app.security.assetProtocol', {
      color: DIM,
      size: 10,
    });
    label(LEFT_X + 12, SCOPE_Y + 48, 'assetProtocol:', { mono: true, size: 10.5 });
    label(LEFT_X + 34, SCOPE_Y + 68, 'enable: true,', { mono: true, size: 10.5 });
    PATTERN_TEXT[scopePreset].forEach((line, index) => {
      label(LEFT_X + 34, SCOPE_Y + 92 + index * 18, `scope: ${line}`, {
        mono: true,
        size: 10.5,
        weight: 600,
      });
    });
    label(LEFT_X + 12, SCOPE_Y + 166, 'scope 语义:', { size: 10.5, color: DIM });
    const semantics = [
      '模式可用 $RESOURCE / $HOME 等目录变量',
      '通配 ** 跨层,* 只匹配一段',
      'Unix 默认:通配不匹配 . 开头段',
      'deny 命中优先于 allow;关卡在配置,不在 capabilities',
    ];
    semantics.forEach((line, index) => {
      label(LEFT_X + 12, SCOPE_Y + 190 + index * 19, line, { size: 10, color: DIM });
    });

    /* 右上:判定步骤(动画重放)。 */
    panel(RIGHT_X, STEPS_Y, RIGHT_W, STEPS_H, BOX_BORDER);
    label(RIGHT_X + 12, STEPS_Y + 24, 'Tauri 核心的判定链', { color: DIM });
    scenario.steps.forEach((step, index) => {
      const rowY = STEPS_Y + 56 + index * 38;
      const status: StepStatus = step.fail
        ? phase(step.at)
          ? 'fail'
          : 'todo'
        : phase(step.at)
          ? 'current'
          : 'todo';
      stepRow(RIGHT_X + 16, rowY, step.text, status);
    });

    /* 右下:最终判定。 */
    panel(
      RIGHT_X,
      RESULT_Y,
      RIGHT_W,
      RESULT_H,
      settled ? (granted ? OK : FAIL) : BOX_BORDER,
    );
    label(RIGHT_X + 12, RESULT_Y + 24, '最终判定', { color: DIM });
    label(
      RIGHT_X + 12,
      RESULT_Y + 52,
      !settled ? 'pending…' : granted ? '200 OK' : '403 Forbidden',
      {
        mono: true,
        size: 12,
        weight: 600,
        color: !settled ? '#b45309' : granted ? OK : FAIL,
      },
    );
    const verdictLine = granted
      ? '文件交给 WebView:img / video 直接可用'
      : denyHit
        ? 'deny 命中:deny 优先于 allow'
        : '修复:把路径(或其目录变量)加进 scope';
    label(RIGHT_X + 12, RESULT_Y + (granted ? 80 : 78), verdictLine, {
      size: 10.5,
      color: DIM,
    });
    label(
      RIGHT_X + 12,
      RESULT_Y + (granted ? 102 : 102),
      granted
        ? 'Range 请求回 206:视频 / 音频可 seek'
        : '403 = scope 拒绝;404 才是文件不存在',
      { size: 10.5, color: DIM },
    );

    emit({
      resolvedPath: resolved,
      allowLabel: allow
        ? allowHit
          ? `命中 $${allow.base}/${allow.segs.join('/')}`
          : '未命中'
        : '本预设没有 allow 模式',
      denyLabel: deny
        ? denyHit
          ? `命中 $${deny.base}/${deny.segs.join('/')} → 优先拒绝`
          : '未命中'
        : '不适用',
      verdictLabel: !settled
        ? 'pending…'
        : granted
          ? '200 · 放行,核心读文件'
          : '403 · 不在 asset scope',
    });
  }

  function tick(): void {
    if (performance.now() - startedAt >= buildScenario(current).total) {
      rafId = 0;
      draw();
      return;
    }
    draw();
    rafId = window.requestAnimationFrame(tick);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      clearTimers();
      current = options;
      // 切换输入 = 重新发起一次 asset 请求:重放完整判定链。
      startedAt = performance.now();
      draw();
      rafId = window.requestAnimationFrame(tick);
      // 兜底:动画结束后再刷新一次读数,避免节流吞掉最终判定。
      settleTimer = window.setTimeout(() => draw(), 1600);
    },
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
