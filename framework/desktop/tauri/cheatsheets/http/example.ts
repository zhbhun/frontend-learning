/**
 * 范例介绍:同一个 fetch 调用,放进两条请求通道(浏览器内置 fetch 与 http 插件 fetch)
 *   重放各自的判断链,对照结算结果。
 * 输入:请求通道(browser / plugin)与目标接口(api.example.com · internal.example.com ·
 *   api.other.com)。模拟前提:页面 origin http://tauri.localhost(Windows 默认);scope
 *   白名单为 https://*.example.com;internal.example.com 不返回 CORS 头,另两个返回 *。
 * 主要操作:切换通道或接口即重放一次请求:前端 fetch → 进入通道的关卡(浏览器通道查 CORS
 *   响应头,插件通道查 scope 白名单)→ 通过则发出请求并 resolve,否则 reject。
 * 预期结果:公开接口两条通道都到;internal.example.com 只有插件通道能到(CORS 拦浏览器);
 *   api.other.com 只有浏览器通道能到(scope 拦插件)——插件的关卡是你自己配的白名单。
 * 阅读主线:浏览器 fetch 的关卡在服务器,插件 fetch 的关卡在 scope。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ChannelVariant = 'browser' | 'plugin';
export type TargetVariant =
  | 'api.example.com'
  | 'internal.example.com'
  | 'api.other.com';

export interface ExampleArgs {
  channel: ChannelVariant;
  target: TargetVariant;
}

export interface ExampleSnapshot {
  /** 读数:请求通道。 */
  channelLabel: string;
  /** 读数:目标接口及其 scope 命中情况。 */
  targetLabel: string;
  /** 读数:CORS 检查结论。 */
  corsLabel: string;
  /** 读数:scope 检查结论。 */
  scopeLabel: string;
  /** 读数:Promise 结算结果。 */
  resultLabel: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/* 目标接口的模拟属性:CORS 响应头与是否在 scope 白名单(https://*.example.com)内。 */
const SCOPE_PATTERN = 'https://*.example.com';

interface TargetInfo {
  host: string;
  corsHeader: '*' | null;
  inScope: boolean;
}

const TARGETS: Record<TargetVariant, TargetInfo> = {
  'api.example.com': { host: 'api.example.com', corsHeader: '*', inScope: true },
  'internal.example.com': {
    host: 'internal.example.com',
    corsHeader: null,
    inScope: true,
  },
  'api.other.com': { host: 'api.other.com', corsHeader: '*', inScope: false },
};

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#94a3b8';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const FAIL = '#b91c1c';
const WAIT = '#b45309';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const CANVAS_W = 720;
const CANVAS_H = 452;

/* 布局:左列为前端、通道与目标接口卡,右列为执行步骤与结果卡。 */
const LEFT_X = 24;
const LEFT_W = 302;
const RIGHT_X = 350;
const RIGHT_W = 346;

const FRONT_Y = 20;
const FRONT_H = 96;
const CHANNEL_Y = 132;
const CHANNEL_H = 128;
const TARGET_Y = 276;
const TARGET_H = 156;

const STEPS_Y = 20;
const STEPS_H = 250;
const RESULT_Y = 286;
const RESULT_H = 146;

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

/* 每个通道 × 接口组合的判断链:浏览器通道查 CORS 响应头,插件通道查 scope 白名单。 */
function buildScenario(channel: ChannelVariant, target: TargetVariant): Scenario {
  const info = TARGETS[target];

  if (channel === 'browser') {
    const allowed = info.corsHeader !== null;
    return {
      steps: [
        { text: 'WebView 网络栈发出请求', at: 0 },
        {
          text: info.corsHeader
            ? '服务器响应,带 Access-Control-Allow-Origin: *'
            : '服务器响应,无 Access-Control-Allow-Origin 头',
          at: 280,
        },
        {
          text: allowed ? 'CORS 检查:origin 允许 → 放行' : 'CORS 检查失败:响应被拦截',
          at: 640,
          fail: !allowed,
        },
        {
          text: allowed ? 'resolve(200)' : 'reject:TypeError: Failed to fetch',
          at: 940,
          fail: !allowed,
        },
      ],
      total: 1200,
    };
  }

  if (!info.inScope) {
    return {
      steps: [
        { text: "invoke('plugin:http|fetch') 请求经 IPC", at: 0 },
        { text: `ACL 检查:${target} 不在 scope 白名单`, at: 300, fail: true },
        {
          text: 'reject:url not allowed on the configured scope',
          at: 620,
          fail: true,
        },
        { text: '请求未发出;修复:scope 加该域名', at: 920, fail: true },
      ],
      total: 1200,
    };
  }

  return {
    steps: [
      { text: "invoke('plugin:http|fetch') 请求经 IPC", at: 0 },
      { text: 'ACL 检查:URL 命中 scope 白名单', at: 300 },
      { text: 'Rust 核心(reqwest)发出请求', at: 580 },
      { text: 'CORS 不适用:发起方是 Rust 进程', at: 860 },
      { text: '响应经 IPC 流式回传 → resolve(200)', at: 1140 },
    ],
    total: 1420,
  };
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleArgs = { channel: 'browser', target: 'api.example.com' };
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
    const color =
      status === 'current' ? ACCENT : status === 'fail' ? FAIL : PALE;
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

    const { channel, target } = current;
    const info = TARGETS[target];
    const scenario = buildScenario(channel, target);
    const lastAt = scenario.steps[scenario.steps.length - 1].at;
    const elapsed = startedAt === 0 ? scenario.total : performance.now() - startedAt;
    const phase = (at: number) => startedAt === 0 || elapsed >= at;
    const settled = phase(lastAt);

    /* 判定规则:浏览器通道看 CORS 头,插件通道看 scope。 */
    const resultOk = channel === 'plugin' ? info.inScope : info.corsHeader !== null;
    const corsLabel =
      channel === 'browser'
        ? resultOk
          ? '通过:Access-Control-Allow-Origin: *'
          : '失败:响应无 CORS 头'
        : '不适用(请求由 Rust 发出)';
    const scopeLabel =
      channel === 'plugin'
        ? resultOk
          ? `通过(命中 ${SCOPE_PATTERN})`
          : `拒绝(不在 ${SCOPE_PATTERN})`
        : '不适用(浏览器通道)';
    const resultLabel = resultOk
      ? 'resolve(200)'
      : channel === 'plugin'
        ? 'rejected: url not allowed on the configured scope'
        : 'rejected: TypeError: Failed to fetch';

    /* 左列:前端面板。 */
    const isBrowser = channel === 'browser';
    panel(LEFT_X, FRONT_Y, LEFT_W, FRONT_H, BOX_BORDER);
    label(LEFT_X + 12, FRONT_Y + 22, '前端 React', { color: DIM });
    label(LEFT_X + 12, FRONT_Y + 48, `fetch('https://${target}/data')`, {
      mono: true,
      size: 10.5,
    });
    label(LEFT_X + 12, FRONT_Y + 76, settled ? `Promise: ${resultOk ? 'resolve(200)' : 'rejected'}` : 'Promise: pending…', {
      mono: true,
      size: 10,
      color: !settled ? WAIT : resultOk ? OK : FAIL,
    });

    /* 左列:通道卡,呈现该通道的发起方与关卡。 */
    panel(LEFT_X, CHANNEL_Y, LEFT_W, CHANNEL_H, isBrowser ? BOX_BORDER : ACCENT);
    label(LEFT_X + 12, CHANNEL_Y + 22, isBrowser ? '浏览器通道' : 'http 插件通道', {
      weight: 600,
      size: 12,
    });
    const channelLines = isBrowser
      ? [
          'fetch 由 WebView 网络栈直接发出',
          '约束:CORS · mixed content · CSP',
          '关卡:响应的 CORS 头(服务器决定)',
          'scope 白名单:不适用',
        ]
      : [
          "invoke('plugin:http|fetch') 经 IPC",
          '真正发请求:Rust 核心(reqwest)',
          'CORS 不适用:非 WebView 发起',
          '关卡:scope 白名单(自己决定)',
        ];
    channelLines.forEach((line, index) => {
      label(LEFT_X + 12, CHANNEL_Y + 48 + index * 19, line, {
        size: 10.5,
        color: index === 2 ? DIM : TEXT,
      });
    });

    /* 左列:目标接口卡,呈现 URL、CORS 头与 scope 命中情况。 */
    panel(LEFT_X, TARGET_Y, LEFT_W, TARGET_H, BOX_BORDER);
    label(LEFT_X + 12, TARGET_Y + 22, '目标接口', { color: DIM });
    label(LEFT_X + 12, TARGET_Y + 48, `https://${target}/data`, {
      mono: true,
      size: 10.5,
      weight: 600,
    });
    label(LEFT_X + 12, TARGET_Y + 76, '服务器 CORS 头:', { color: DIM, size: 10.5 });
    label(
      LEFT_X + 100,
      TARGET_Y + 76,
      info.corsHeader ? 'Access-Control-Allow-Origin: *' : '无',
      { mono: true, size: 10, color: info.corsHeader ? OK : FAIL },
    );
    label(LEFT_X + 12, TARGET_Y + 100, `scope 白名单 ${SCOPE_PATTERN}`, {
      mono: true,
      size: 10,
      color: DIM,
    });
    label(
      LEFT_X + 12,
      TARGET_Y + 124,
      info.inScope ? '命中 → 插件通道可发' : '未命中 → 插件通道拒绝',
      { size: 10.5, color: info.inScope ? OK : FAIL, weight: 600 },
    );
    label(
      LEFT_X + 12,
      TARGET_Y + 144,
      '页面 origin:http://tauri.localhost(Windows 默认)',
      { size: 9.5, color: PALE },
    );

    /* 右列:执行步骤卡,重放该通道的判断链。 */
    panel(RIGHT_X, STEPS_Y, RIGHT_W, STEPS_H, BOX_BORDER);
    label(
      RIGHT_X + 12,
      STEPS_Y + 24,
      `请求执行 · ${isBrowser ? 'WebView 网络栈' : 'IPC → Rust'}`,
      { color: DIM },
    );
    scenario.steps.forEach((step, index) => {
      const rowY = STEPS_Y + 56 + index * 36;
      const status: StepStatus = step.fail
        ? phase(step.at)
          ? 'fail'
          : 'todo'
        : phase(step.at)
          ? 'current'
          : 'todo';
      stepRow(RIGHT_X + 16, rowY, step.text, status);
    });

    /* 右列:结果卡,给出 Promise 结算与失败时的修复线索。 */
    panel(
      RIGHT_X,
      RESULT_Y,
      RIGHT_W,
      RESULT_H,
      settled ? (resultOk ? OK : FAIL) : BOX_BORDER,
    );
    label(RIGHT_X + 12, RESULT_Y + 24, '结算结果', { color: DIM });
    label(RIGHT_X + 12, RESULT_Y + 52, resultOk ? 'resolve(200)' : 'rejected:', {
      mono: true,
      size: 12,
      weight: 600,
      color: !settled ? WAIT : resultOk ? OK : FAIL,
    });
    if (!resultOk) {
      label(
        RIGHT_X + 12,
        RESULT_Y + 74,
        channel === 'plugin'
          ? '  url not allowed on the configured scope'
          : '  TypeError: Failed to fetch',
        { mono: true, size: 10, color: FAIL },
      );
    }
    const fixLine = resultOk
      ? isBrowser
        ? '浏览器通道正常:响应完整交给页面'
        : '插件通道正常:Rust 侧拿到响应后回传'
      : channel === 'plugin'
        ? '修复:在 capabilities 的 http:default.allow 加该域名'
        : '处理:换插件 fetch(加 scope)或让服务端配 CORS';
    label(RIGHT_X + 12, RESULT_Y + (resultOk ? 78 : 104), fixLine, {
      size: 10.5,
      color: DIM,
    });
    if (resultOk) {
      label(RIGHT_X + 12, RESULT_Y + 104, '响应完整回到前端,json() / 流式读取照常', {
        size: 10.5,
        color: DIM,
      });
    }

    emit({
      channelLabel: isBrowser
        ? '浏览器 fetch(WebView 内置)'
        : 'http 插件 fetch(@tauri-apps/plugin-http)',
      targetLabel: `https://${target}/data · scope ${info.inScope ? '内' : '外'}`,
      corsLabel,
      scopeLabel,
      resultLabel: settled ? resultLabel : 'pending…',
    });
  }

  function tick(): void {
    if (performance.now() - startedAt >= buildScenario(current.channel, current.target).total) {
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
      // 切换通道或接口 = 重新发起一次请求:重放完整判断链。
      startedAt = performance.now();
      draw();
      rafId = window.requestAnimationFrame(tick);
      // 兜底:动画结束后再刷新一次读数,避免节流吞掉最终结算。
      settleTimer = window.setTimeout(() => draw(), 1600);
    },
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
