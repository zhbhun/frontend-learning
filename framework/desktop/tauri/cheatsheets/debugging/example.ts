/**
 * 范例介绍:模拟本课「现象 → 侧别 → 排查通道」的判定回路。
 * 输入:问题现象(七种,覆盖 WebView devtools、Rust 终端与断点、log 插件与 panic
 *   专项)、构建形态(dev / release)。
 * 主要操作:左栏画出当前现象卡与它发生的侧别;右栏给出首选通道徽标、第一步动作、
 *   依据,以及 dev 与 release 两种构建形态下的可用性(当前形态高亮)。
 * 预期结果:现象决定通道,构建形态决定该通道此刻是否可用——release 下 devtools、
 *   终端、stderr 全部失效,log 插件落下的日志文件是唯一兜底。
 * 阅读主线:先问现象发生在哪一侧,再问当前构建下工具还在不在。
 * 边界:判定只覆盖人工排查通道;WebDriver 端到端自动化测试不在本课范围。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type BuildId = 'dev' | 'release';

/** 问题现象的全部选项(stories 的 select 与本表共用这一份)。 */
export const SYMPTOMS = [
  '按钮点了没反应',
  'invoke 被拒:报错含 not allowed',
  'Rust 命令返回的结果不对',
  'invoke 的 Promise 永远不 resolve',
  '打包应用一打开就闪退(dev 正常)',
  '打包后想留日志:去哪找文件',
  '前端 console.log 打包后要保留',
] as const;

export type SymptomId = (typeof SYMPTOMS)[number];

export interface SymptomInfo {
  /** 现象发生的侧别。 */
  side: string;
  /** 首选通道。 */
  channel: string;
  /** 通道类别,决定徽标配色。 */
  kind: 'devtools' | 'rust' | 'panic' | 'log';
  /** 第一步动作。 */
  step: string;
  /** 依据一句话。 */
  basis: string;
  /** dev 开发态下的可用性。 */
  devNote: string;
  /** release 打包产物下的可用性。 */
  releaseNote: string;
}

export interface ExampleArgs {
  symptom: SymptomId;
  build: BuildId;
}

export interface ExampleSnapshot {
  symptom: string;
  side: string;
  channel: string;
  step: string;
  /** 当前构建形态下的可用性一句话。 */
  availability: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

const SYMPTOM_TABLE: Record<SymptomId, SymptomInfo> = {
  '按钮点了没反应': {
    side: 'WebView(前端)',
    channel: 'WebView DevTools',
    kind: 'devtools',
    step: '右键 → Inspect Element(macOS Cmd+Opt+I),先看 Console 红字,再查 Elements',
    basis: '纯前端的状态与渲染问题,Rust 侧毫无感知;Console / Elements / Network 直接可查。',
    devNote: 'dev 构建默认可用',
    releaseNote: '默认禁用:加 devtools feature 或改用 --debug 构建',
  },
  'invoke 被拒:报错含 not allowed': {
    side: '两侧之间(IPC)',
    channel: 'WebView DevTools 控制台',
    kind: 'devtools',
    step: 'dev 下读完整报错:窗口未覆盖 / 无授权 / 显式 deny 三类对号入座',
    basis: 'ACL 拒绝的报错只在前端控制台完整可见;三类文案与判定层的对应见「权限与能力」一课。',
    devNote: '报错完整,会列出候选权限',
    releaseNote: '只剩统一一句 not allowed by ACL',
  },
  'Rust 命令返回的结果不对': {
    side: 'Rust 核心进程',
    channel: '断点调试 / 日志打点',
    kind: 'rust',
    step: '命令里加 log::debug! 打点看流水,或按本课配置 VSCode / RustRover 断点看现场',
    basis: '逻辑在 Rust 进程内,devtools 看不见;终端、日志与调试器是仅有的观察窗。',
    devNote: 'tauri dev 终端与断点都可用',
    releaseNote: 'release 产物可用 Production Debug 配置挂断点',
  },
  'invoke 的 Promise 永远不 resolve': {
    side: 'Rust 核心进程(panic 疑似)',
    channel: 'panic 排查路径',
    kind: 'panic',
    step: '看 tauri dev 终端有无 thread … panicked at;没有就 RUST_BACKTRACE=1 重跑',
    basis: 'panic 不 reject Promise:异步命令的 panic 常见为挂起,同步命令常直接把应用带崩。',
    devNote: 'panic 输出就在终端 stderr',
    releaseNote: '无终端:panic hook + log 插件落 LogDir',
  },
  '打包应用一打开就闪退(dev 正常)': {
    side: 'Rust 核心进程',
    channel: 'panic 排查路径(打包应用)',
    kind: 'panic',
    step: '先用 tauri build --debug 复现拿终端输出;上线前装 panic hook + log 插件',
    basis: 'release 没有终端,stderr 直接丢失;LogDir 里的日志文件是唯一落点。',
    devNote: '--debug 构建可复现',
    releaseNote: '只看 LogDir 日志文件',
  },
  '打包后想留日志:去哪找文件': {
    side: '两侧通用',
    channel: 'log 插件 LogDir',
    kind: 'log',
    step: 'macOS 看 ~/Library/Logs/<bundle identifier>;Windows 看 %LOCALAPPDATA% 下的 logs',
    basis: 'LogDir 是默认 target 之一,dev 与打包行为一致,是排查的兜底通道。',
    devNote: 'dev 同样落文件,可先对照',
    releaseNote: '文件在用户机器上,复现时收集',
  },
  '前端 console.log 打包后要保留': {
    side: 'WebView(前端)',
    channel: 'log 插件(console 转发)',
    kind: 'log',
    step: '用 forwardConsole 包装 console.error / warn,转进 log 管线随 LogDir 落文件',
    basis: 'console 输出只进 WebView devtools,没有 devtools 就丢;转发后走统一管线。',
    devNote: 'devtools 可看,转发为打包后',
    releaseNote: '转发的日志进终端与文件',
  },
};

/** 通道类别 → 徽标前景 / 底色。 */
const CHANNEL_COLORS: Record<SymptomInfo['kind'], { fg: string; bg: string }> = {
  devtools: { fg: '#1d4ed8', bg: '#dbeafe' },
  rust: { fg: '#6d28d9', bg: '#ede9fe' },
  panic: { fg: '#b91c1c', bg: '#fee2e2' },
  log: { fg: '#15803d', bg: '#dcfce7' },
};

/** 侧别 → 文字颜色。 */
const SIDE_COLORS: Record<string, string> = {
  'WebView(前端)': '#0369a1',
  '两侧之间(IPC)': '#475569',
  '两侧通用': '#475569',
  'Rust 核心进程': '#9a3412',
  'Rust 核心进程(panic 疑似)': '#9a3412',
};

const DIM = '#64748b';
const TEXT = '#172033';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

/** 按当前字体逐字折行(中文按字断行即可)。调用前先设置 ctx.font。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    const candidate = line + char;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.closePath();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
): void {
  ctx.strokeStyle = DIM;
  ctx.fillStyle = DIM;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - 7, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y1);
  ctx.lineTo(x2 - 9, y1 - 4);
  ctx.lineTo(x2 - 9, y1 + 4);
  ctx.closePath();
  ctx.fill();
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ExampleArgs = {
    symptom: 'invoke 的 Promise 永远不 resolve',
    build: 'dev',
  };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const info = SYMPTOM_TABLE[current.symptom];
    const availability =
      current.build === 'dev' ? info.devNote : info.releaseNote;
    const colors = CHANNEL_COLORS[info.kind];
    const sideColor = SIDE_COLORS[info.side] ?? TEXT;

    // ── 左栏:现象卡与侧别 ──────────────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('问题现象', 24, 24);

    ctx.font = `600 14px ${SANS}`;
    const symptomLines = wrapText(ctx, current.symptom, 264);
    const cardH = symptomLines.length * 21 + 30;
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, 24, 34, 296, cardH, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();

    ctx.fillStyle = TEXT;
    let sy = 34 + 23;
    for (const line of symptomLines) {
      ctx.fillText(line, 40, sy);
      sy += 21;
    }

    const badgeY = 34 + cardH + 12;
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, 24, badgeY, 296, 26, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    ctx.fillStyle = sideColor;
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText(`发生在:${info.side}`, 38, badgeY + 17);

    // 中间箭头与提示。
    const midY = 34 + cardH / 2;
    drawArrow(ctx, 328, midY, 388);
    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('该进哪条通道?', 322, midY + 20);

    // ── 右栏:判定结果 ──────────────────────────────────────
    const rx = 396;
    const rw = width - rx - 24;

    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('判定结果', rx, 24);

    ctx.fillStyle = colors.bg;
    roundRect(ctx, rx, 34, rw, 28, 6);
    ctx.fill();
    ctx.strokeStyle = colors.fg;
    ctx.stroke();
    ctx.fillStyle = colors.fg;
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText(`● 首选通道:${info.channel}`, rx + 12, 52);

    let ry = 84;
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('第一步', rx, ry);
    ry += 18;
    ctx.font = `12px ${SANS}`;
    for (const line of wrapText(ctx, info.step, rw)) {
      ctx.fillStyle = TEXT;
      ctx.fillText(line, rx, ry);
      ry += 18;
    }

    ry += 8;
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('依据', rx, ry);
    ry += 17;
    ctx.font = `11px ${SANS}`;
    for (const line of wrapText(ctx, info.basis, rw)) {
      ctx.fillStyle = '#475569';
      ctx.fillText(line, rx, ry);
      ry += 16;
    }

    ry += 8;
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('可用性(按构建形态)', rx, ry);
    ry += 18;
    const rows: Array<[string, string, boolean]> = [
      ['dev', info.devNote, current.build === 'dev'],
      ['release', info.releaseNote, current.build === 'release'],
    ];
    for (const [label, note, active] of rows) {
      ctx.fillStyle = active ? TEXT : DIM;
      ctx.font = `${active ? '600' : '400'} 12px ${SANS}`;
      ctx.fillText(`${active ? '●' : '○'} ${label} ▸ ${note}`, rx, ry);
      ry += 18;
    }

    emit({
      symptom: current.symptom,
      side: info.side,
      channel: info.channel,
      step: info.step,
      availability: `${current.build} ▸ ${availability}`,
    });
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
