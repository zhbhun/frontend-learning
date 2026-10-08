/**
 * 范例介绍:模拟「编辑 capability 文件 → 窗口发起调用 → ACL 判定」的完整回路。
 * 输入:capability 的 windows 字段(覆盖哪些窗口)、permissions 数组(勾选的权限条目)、
 *   发起调用的窗口(main / settings)、尝试的命令(fs 读文件 / dialog 打开选择框 /
 *   core 事件 emit / 应用自建 greet)。
 * 主要操作:左侧按当前勾选画出 src-tauri/capabilities/default.json 的内容,右侧模拟
 *   「窗口 invoke(命令)」并给出判定徽标与依据;命中的权限行标绿,未覆盖的 windows
 *   行标红。
 * 预期结果:应用自建命令恒为允许;窗口未被 windows 覆盖时一律拒绝;命中 deny 时显式
 *   拒绝;其余由 permissions 是否覆盖该命令决定(默认拒绝)。
 * 阅读主线:放行 = 窗口被覆盖 × 权限命中 × 无显式 deny,缺任何一层都是拒绝。
 * 边界:演示应用只有 default.json 这一个 capability 文件,窗口只有 main 与 settings。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type WindowsValue =
  | '["main"]'
  | '["settings"]'
  | '["main", "settings"]'
  | '["*"]';

export type AttemptWindow = 'main' | 'settings';

export type AttemptCommand =
  | 'plugin:fs|read_text_file'
  | 'plugin:dialog|open'
  | 'plugin:event|emit'
  | 'greet';

export interface ExampleArgs {
  windows: WindowsValue;
  grants: string[];
  attemptWindow: AttemptWindow;
  attemptCommand: AttemptCommand;
}

export interface ExampleSnapshot {
  /** 读数:模拟的调用,如 main → plugin:fs|read_text_file。 */
  attempt: string;
  /** 读数:允许 / 拒绝,附判定层。 */
  verdict: string;
  /** 读数:命中依据一句话。 */
  basis: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** permissions 的候选条目(与 stories 的 inline-check 选项一致)。 */
const GRANT_OPTIONS = [
  'core:default',
  'fs:default',
  'dialog:default',
  'fs:deny-read-text-file',
] as const;

/** permissions 里需要与其他条目区分显示的显式拒绝条目。 */
const DENY_GRANT = 'fs:deny-read-text-file';

interface Decision {
  allowed: boolean;
  /** 判定层:ACL 之外 / 窗口未覆盖 / 显式拒绝 / 权限命中 / 默认拒绝。 */
  layer: string;
  /** 依据一句话,进读数。 */
  basis: string;
  /** 画在判定下方的两行展开说明。 */
  detail: [string, string];
  /** 命中的 permissions 条目(画布上标绿),无则为空。 */
  hitGrant?: string;
}

function decide(args: ExampleArgs): Decision {
  const { windows, grants, attemptWindow, attemptCommand } = args;

  // 应用自建命令:不经 ACL,默认所有本地窗口都能调。
  if (attemptCommand === 'greet') {
    return {
      allowed: true,
      layer: 'ACL 之外',
      basis: '应用命令默认放行,与 capability 无关',
      detail: [
        'generate_handler! 注册的命令默认不经 ACL,',
        '要管控需在 build.rs 用 AppManifest 显式声明。',
      ],
    };
  }

  // 第 1 层:窗口覆盖。没被任何 capability 覆盖的窗口没有任何授权。
  const covered = windows === '["*"]' || windows.includes(`"${attemptWindow}"`);
  if (!covered) {
    return {
      allowed: false,
      layer: '窗口未覆盖',
      basis: `windows 不含 "${attemptWindow}",零覆盖 = 零授权`,
      detail: [
        '该窗口没有命中任何 capability,连 core 命令',
        '(如 listen)也会被拒;新建窗口最常踩。',
      ],
    };
  }

  // 第 2 层:显式 deny,优先级高于任何 allow。
  if (
    attemptCommand === 'plugin:fs|read_text_file' &&
    grants.includes(DENY_GRANT)
  ) {
    return {
      allowed: false,
      layer: '显式拒绝',
      basis: 'deny 命中:deny 优先于 allow',
      detail: [
        'fs:deny-read-text-file 命中,即使 fs:default',
        '已授权也一样拒绝——deny 只当例外收口用。',
      ],
    };
  }

  // 第 3 层:allow 判定,逐条命令看有没有权限覆盖。
  const required: Record<
    AttemptCommand,
    { grant: string; basis: string; detail: [string, string] }
  > = {
    'plugin:fs|read_text_file': {
      grant: 'fs:default',
      basis: 'fs:default 命中',
      detail: [
        'fs:default 含 read-app-specific-dirs-recursive,',
        'config.json 在 $APPDATA 内,可读。',
      ],
    },
    'plugin:dialog|open': {
      grant: 'dialog:default',
      basis: 'dialog:default 命中',
      detail: [
        'dialog:default 含 allow-open,系统文件选择框',
        '可弹出;default 集就是这种官方权限集。',
      ],
    },
    'plugin:event|emit': {
      grant: 'core:default',
      basis: 'core:default 命中',
      detail: [
        'core:default 展开 → core:event:default 含 allow-emit,',
        '窗口事件可发送;core 命令同样默认拒绝。',
      ],
    },
    greet: {
      grant: '',
      basis: '',
      detail: ['', ''],
    },
  };

  const req = required[attemptCommand];
  if (grants.includes(req.grant)) {
    return {
      allowed: true,
      layer: '权限命中',
      basis: req.basis,
      detail: req.detail,
      hitGrant: req.grant,
    };
  }
  return {
    allowed: false,
    layer: '默认拒绝',
    basis: '没有权限覆盖这条命令',
    detail: [
      `permissions 未覆盖 ${attemptCommand};`,
      'dev 报错会列出能放行它的候选权限。',
    ],
  };
}

const DIM = '#64748b';
const TEXT = '#172033';
const PUNC = '#94a3b8';
const KEY = '#475569';
const DENY = '#dc2626';
const GOOD = '#15803d';
const GOOD_BG = '#dcfce7';
const BAD = '#b91c1c';
const BAD_BG = '#fee2e2';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

/** 一行 JSON = 若干 [文本, 颜色] 片段。 */
type Tok = [string, string];

function jsonLines(
  windowsDisplay: string,
  grants: string[],
  windowsAlert: boolean,
  hitGrant?: string,
): Tok[][] {
  const P = (t: string): Tok => [t, PUNC];
  const K = (t: string): Tok => [t, KEY];
  const S = (t: string): Tok => [t, TEXT];
  const lines: Tok[][] = [];

  lines.push([P('{')]);
  lines.push([P('  '), K('"identifier"'), P(': '), S('"default"'), P(',')]);
  lines.push([
    P('  '),
    K('"windows"'),
    P(': '),
    [windowsDisplay, windowsAlert ? DENY : TEXT] as Tok,
    P(','),
  ]);
  if (grants.length === 0) {
    lines.push([P('  '), K('"permissions"'), P(': []')]);
  } else {
    lines.push([P('  '), K('"permissions"'), P(': [')]);
    const entries = GRANT_OPTIONS.filter((g) => grants.includes(g));
    entries.forEach((g, index) => {
      const color = g === DENY_GRANT ? DENY : g === hitGrant ? GOOD : TEXT;
      const comma: Tok[] = index < entries.length - 1 ? [P(',')] : [];
      lines.push([P('    '), [`"${g}"`, color] as Tok, ...comma]);
    });
    lines.push([P('  ]')]);
  }
  lines.push([P('}')]);
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
  ctx.arcTo(x, y, x + w, y, radius);
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
    windows: '["main"]',
    grants: ['core:default', 'fs:default', 'dialog:default'],
    attemptWindow: 'main',
    attemptCommand: 'plugin:fs|read_text_file',
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

    const decision = decide(current);

    // ── 左栏:capability 文件 ────────────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('capability 文件', 24, 24);
    ctx.font = `11px ${MONO}`;
    ctx.fillText('src-tauri/capabilities/default.json', 130, 24);

    const lines = jsonLines(
      current.windows,
      current.grants,
      decision.layer === '窗口未覆盖',
      decision.hitGrant,
    );
    const boxH = lines.length * 17 + 16;
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, 24, 34, 368, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();

    let ly = 34 + 20;
    for (const toks of lines) {
      let lx = 38;
      for (const [text, color] of toks) {
        ctx.fillStyle = color;
        ctx.font = `12px ${MONO}`;
        ctx.fillText(text, lx, ly);
        lx += ctx.measureText(text).width;
      }
      ly += 17;
    }

    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText(
      '演示应用只有这一个 capability;窗口共 main 与 settings 两个。',
      24,
      34 + boxH + 20,
    );

    // ── 右栏:模拟调用 ──────────────────────────────────────
    const rx = 436;
    const rw = width - rx - 24;

    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('模拟调用', rx, 24);

    // 步骤 1:发起窗口。
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, rx, 34, rw, 26, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.font = `12px ${SANS}`;
    ctx.fillText(`窗口 "${current.attemptWindow}" 发起 invoke`, rx + 12, 51);

    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('↓ 命令进入 ACL 判定', rx + 12, 76);

    // 步骤 2:命令。
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, rx, 84, rw, 26, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(current.attemptCommand, rx + 12, 101);

    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('↓ 判定', rx + 12, 126);

    // 步骤 3:判定徽标。
    const verdict = decision.allowed ? '允许' : '拒绝';
    ctx.fillStyle = decision.allowed ? GOOD_BG : BAD_BG;
    roundRect(ctx, rx, 134, rw, 26, 6);
    ctx.fill();
    ctx.strokeStyle = decision.allowed ? GOOD : BAD;
    ctx.stroke();
    ctx.fillStyle = decision.allowed ? GOOD : BAD;
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText(`● ${verdict} · ${decision.layer}`, rx + 12, 151);

    // 展开说明。
    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText(decision.detail[0], rx, 180);
    ctx.fillText(decision.detail[1], rx, 196);

    emit({
      attempt: `${current.attemptWindow} → ${current.attemptCommand}`,
      verdict: `${verdict}(${decision.layer})`,
      basis: decision.basis,
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
