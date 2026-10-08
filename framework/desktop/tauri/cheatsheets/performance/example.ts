/**
 * 范例介绍:模拟「[profile.release] 各选项 → 体积 / 编译时间 / 运行性能 / 调试能力」的权衡。
 * 输入:opt-level(3 / s / z)、lto(false / thin / true)、codegen-units(16 / 1)、
 *   strip(false / true)、panic(unwind / abort)。
 * 主要操作:左栏按当前选择画出 src-tauri/Cargo.toml 的 [profile.release] 片段,
 *   与 Cargo 默认值相同的值置灰、改动的值高亮;右栏画出四条相对"默认 release"的
 *   定性读数,并列出每个非默认选项的一句话依据。
 * 预期结果:全部保持默认时四条读数都是"≈ 默认";逐项套用官方推荐(opt-level="s"、
 *   lto=true、codegen-units=1、strip=true、panic="abort"),体积读数走低,
 *   编译时间走高,调试能力随 strip 下降,panic="abort" 附加 catch_unwind 失效的边界。
 * 阅读主线:体积不是免费的——每个降体积的杠杆都在别的轴上有代价,先看清代价再选。
 * 边界:读数为定性示意(方向有据:Cargo Book 与 Tauri「App Size」页,幅度因项目
 *   而异),不代表任何实测数字;请以 cargo build 实测为准。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type OptLevel = '3' | 's' | 'z';
export type LtoMode = 'false' | 'thin' | 'true';
export type CodegenUnits = '16' | '1';
export type PanicMode = 'unwind' | 'abort';

export interface ExampleArgs {
  optLevel: OptLevel;
  lto: LtoMode;
  codegenUnits: CodegenUnits;
  strip: boolean;
  panic: PanicMode;
}

export interface ExampleSnapshot {
  /** 读数:当前 [profile.release] 摘要。 */
  config: string;
  /** 读数:体积相对默认 release 的定性变化。 */
  size: string;
  /** 读数:编译时间相对默认 release 的定性变化。 */
  compile: string;
  /** 读数:运行性能相对默认 release 的定性变化。 */
  perf: string;
  /** 读数:调试能力相对默认 release 的定性变化。 */
  debug: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** 各选项对四条轴的贡献:0 = 与 Cargo 默认一致;负 = 下降,正 = 上升。 */
const OPT_LEVEL: Record<OptLevel, { size: number; perf: number; note: string }> = {
  '3': { size: 0, perf: 0, note: '' },
  s: {
    size: -1,
    perf: -1,
    note: '官方推荐:优先体积;追求运行速度就保持 3',
  },
  z: {
    size: -1.5,
    perf: -1.5,
    note: '最激进档;官方与 Cargo 均提示 s/z 不保证比 3 更小,实测为准',
  },
};

const LTO: Record<LtoMode, { size: number; compile: number; perf: number; note: string }> = {
  false: { size: 0, compile: 0, perf: 0, note: '' },
  thin: {
    size: -1,
    compile: 1,
    perf: 0.5,
    note: 'thin LTO:跨 crate 优化的折中档',
  },
  true: {
    size: -1.5,
    compile: 2,
    perf: 0.5,
    note: 'fat LTO:官方推荐档;链接期优化,编译明显变慢',
  },
};

const CODEGEN: Record<CodegenUnits, { size: number; compile: number; perf: number; note: string }> = {
  '16': { size: 0, compile: 0, perf: 0, note: '' },
  '1': {
    size: -1,
    compile: 1.5,
    perf: 0,
    note: '官方推荐:单个编译单元优化更充分,失去并行度',
  },
};

const STRIP: Record<'true' | 'false', { size: number; debug: number; note: string }> = {
  false: { size: 0, debug: 0, note: '' },
  true: {
    size: -1,
    debug: -2,
    note: '官方推荐:剥离调试符号;崩溃日志难以符号化定位',
  },
};

const PANIC: Record<PanicMode, { size: number; perf: number; note: string }> = {
  unwind: { size: 0, perf: 0, note: '' },
  abort: {
    size: -1,
    perf: 0.5,
    note: '官方推荐:去掉 unwind 代码;catch_unwind 失效,panic 即退出',
  },
};

interface Axis {
  score: number;
  /** 相对默认 release 的定性描述。 */
  label: string;
}

function describe(score: number, down: string, down2: string, up: string, up2: string): Axis {
  if (score <= -2.5) {
    return { score, label: `▼▼ ${down2}` };
  }
  if (score <= -0.75) {
    return { score, label: `▼ ${down}` };
  }
  if (score < 0.75) {
    return { score, label: '≈ 默认' };
  }
  if (score < 2.5) {
    return { score, label: `▲ ${up}` };
  }
  return { score, label: `▲▲ ${up2}` };
}

function decide(args: ExampleArgs): {
  axes: { size: Axis; compile: Axis; perf: Axis; debug: Axis };
  notes: string[];
  changedCount: number;
} {
  const opt = OPT_LEVEL[args.optLevel];
  const lto = LTO[args.lto];
  const cgu = CODEGEN[args.codegenUnits];
  const strip = STRIP[args.strip ? 'true' : 'false'];
  const panic = PANIC[args.panic];

  const size = opt.size + lto.size + cgu.size + strip.size + panic.size;
  const compile = lto.compile + cgu.compile;
  const perf = opt.perf + lto.perf + cgu.perf + panic.perf;
  const debug = strip.debug;

  const notes: string[] = [];
  if (opt.note) notes.push(`opt-level="${args.optLevel}" — ${opt.note}`);
  if (lto.note) notes.push(`lto=${args.lto} — ${lto.note}`);
  if (cgu.note) notes.push(`codegen-units=${args.codegenUnits} — ${cgu.note}`);
  if (strip.note) notes.push(`strip=${args.strip} — ${strip.note}`);
  if (panic.note) notes.push(`panic="${args.panic}" — ${panic.note}`);

  return {
    axes: {
      size: describe(size, '更小', '明显更小', '更大', '明显更大'),
      compile: describe(compile, '更短', '明显更短', '更长', '明显更长'),
      perf: describe(perf, '可能略降', '可能下降', '略升', '提升'),
      debug: describe(debug, '受损', '明显受损', '增强', '明显增强'),
    },
    notes,
    changedCount: notes.length,
  };
}

// ── 画布配色与字体(与其他课同一套视觉语言) ──────────────────
const DIM = '#64748b';
const TEXT = '#172033';
const KEY = '#475569';
const BLUE = '#4f7cff';
const GREEN = '#15803d';
const TRACK = '#e2e8f0';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

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
    optLevel: '3',
    lto: 'false',
    codegenUnits: '16',
    strip: false,
    panic: 'unwind',
  };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = Math.max(420, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const decision = decide(current);

    // ── 左栏:[profile.release] 片段 ────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('src-tauri/Cargo.toml', 24, 24);

    const lw = 368;
    const tomlLines: Array<Array<[string, string]>> = [
      [['[profile.release]', TEXT]],
      [['opt-level = ', TEXT], [`"${current.optLevel}"`, current.optLevel === '3' ? DIM : BLUE]],
      [['lto = ', TEXT], [current.lto, current.lto === 'false' ? DIM : BLUE]],
      [
        ['codegen-units = ', TEXT],
        [current.codegenUnits, current.codegenUnits === '16' ? DIM : BLUE],
      ],
      [['strip = ', TEXT], [String(current.strip), current.strip ? BLUE : DIM]],
      [['panic = ', TEXT], [`"${current.panic}"`, current.panic === 'unwind' ? DIM : BLUE]],
    ];

    const boxH = tomlLines.length * 18 + 16;
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, 24, 34, lw, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    let ly = 34 + 22;
    for (const toks of tomlLines) {
      let lx = 38;
      for (const [text, color] of toks) {
        ctx.fillStyle = color;
        ctx.font = `12px ${MONO}`;
        ctx.fillText(text, lx, ly);
        lx += ctx.measureText(text).width;
      }
      ly += 18;
    }

    const legendY = 34 + boxH + 22;
    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('灰值 = Cargo 默认(release) · 蓝值 = 相对默认已改', 24, legendY);

    // ── 右栏:四条定性轴 ────────────────────────────────────
    const rx = 420;
    const rw = width - rx - 24;

    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('相对「默认 release」的变化(定性示意)', rx, 24);

    const axes: Array<[string, Axis]> = [
      ['体积', decision.axes.size],
      ['编译时间', decision.axes.compile],
      ['运行性能', decision.axes.perf],
      ['调试能力', decision.axes.debug],
    ];
    let ay = 52;
    const trackW = rw - 168;
    for (const [name, axis] of axes) {
      ctx.fillStyle = TEXT;
      ctx.font = `600 12px ${SANS}`;
      ctx.fillText(name, rx, ay + 11);

      ctx.fillStyle = TRACK;
      roundRect(ctx, rx + 78, ay, trackW, 16, 4);
      ctx.fill();

      const barW = Math.min(trackW, (Math.abs(axis.score) / 4) * trackW);
      if (barW > 2) {
        ctx.fillStyle = axis.score < 0 ? GREEN : '#b45309';
        roundRect(ctx, axis.score < 0 ? rx + 78 : rx + 78 + trackW - barW, ay, barW, 16, 4);
        ctx.fill();
      }

      ctx.fillStyle = KEY;
      ctx.font = `11px ${SANS}`;
      ctx.fillText(axis.label, rx + 84 + trackW, ay + 12);
      ay += 34;
    }

    // 非默认选项的依据列表。
    let ny = ay + 6;
    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    if (decision.changedCount === 0) {
      ctx.fillText('全部为 Cargo 默认值——先在这条基线上实测一次,再逐项改动对比。', rx, ny);
      ny += 16;
    } else {
      for (const note of decision.notes) {
        for (const line of wrap(ctx, note, rw)) {
          ctx.fillText(line, rx, ny);
          ny += 15;
        }
      }
    }

    // 底部免责声明。
    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('方向有据(Cargo Book / Tauri「App Size」),幅度因项目而异——以 cargo build 实测为准。', 24, height - 16);

    emit({
      config: `opt-level="${current.optLevel}" · lto=${current.lto} · codegen-units=${current.codegenUnits} · strip=${current.strip} · panic="${current.panic}"`,
      size: decision.axes.size.label,
      compile: decision.axes.compile.label,
      perf: decision.axes.perf.label,
      debug: decision.axes.debug.label,
    });
  }

  function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (ctx.measureText(text).width <= maxWidth) {
      return [text];
    }
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
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
