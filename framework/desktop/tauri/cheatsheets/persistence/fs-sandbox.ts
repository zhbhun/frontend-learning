/**
 * 范例介绍:模拟 fs 插件的一次文件调用——操作、相对路径、BaseDirectory 与 capabilities
 *   授权档位共同决定「路径解析成什么、放不放行、结果是什么」。
 * 输入:演示操作(writeTextFile / readTextFile / exists / mkdir / remove / readDir)、
 *   目标目录(BaseDirectory 成员)、相对路径、平台(macOS / Windows / Linux)、授权档位。
 * 主要操作:切换控件即重放一次调用:相对路径 + baseDir 解析成平台路径 → 按「命令 × scope」
 *   两维判定权限 → 在模拟目录树上执行;目录内容跨操作持续累积,错误消息按目标平台模拟真实
 *   errno 形态。
 * 预期结果:应用专属目录的读操作被 fs:default 放行;写文本在默认档位被拒(not allowed——
 *   命令未声明),补了命令不配 scope 报 forbidden path,命令 + scope 齐备才写入;默认档位下
 *   mkdir 子目录(default 的 scope 只盖应用目录本身)与 remove(命令未声明)同样被拒;
 *   Document / Temp 连读都在默认 scope 之外。
 * 阅读主线:fs 的授权是「命令权限 × 路径 scope」两个维度——缺哪一维,就以哪种错误拒绝。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FsOp =
  | 'writeTextFile'
  | 'readTextFile'
  | 'exists'
  | 'mkdir'
  | 'remove'
  | 'readDir';

export type BaseDirId =
  | 'AppData'
  | 'AppConfig'
  | 'AppLocalData'
  | 'AppCache'
  | 'AppLog'
  | 'Temp'
  | 'Document';

export type GrantId = 'default' | 'write-no-scope' | 'write-scope';

export type PlatformId = 'macOS' | 'Windows' | 'Linux';

export interface ExampleArgs {
  op: FsOp;
  baseDir: BaseDirId;
  path: string;
  grant: GrantId;
  platform: PlatformId;
}

export interface ExampleSnapshot {
  /** 读数:相对路径 + baseDir 解析出的平台路径。 */
  resolved: string;
  /** 读数:本次演示的调用签名。 */
  callLabel: string;
  /** 读数:调用的最终结果(返回值或 rejected 消息)。 */
  resultLabel: string;
  /** 读数:当前 baseDir 下的模拟目录内容(跨操作累积)。 */
  treeLabel: string;
}

/* 应用专属目录:fs:default 的读 scope 与 mkdir 根目录 scope 只覆盖这五个。 */
const APP_DIRS: readonly BaseDirId[] = [
  'AppData',
  'AppConfig',
  'AppLocalData',
  'AppCache',
  'AppLog',
];

/* 各平台目录根(以 bundle identifier = com.example.app 为例),与 path 模块解析规则一致。 */
const IDENTIFIER = 'com.example.app';

const ROOTS: Record<BaseDirId, Record<PlatformId, string>> = {
  AppData: {
    macOS: `~/Library/Application Support/${IDENTIFIER}`,
    Windows: `%APPDATA%\\${IDENTIFIER}`,
    Linux: `~/.local/share/${IDENTIFIER}`,
  },
  AppConfig: {
    macOS: `~/Library/Application Support/${IDENTIFIER}`,
    Windows: `%APPDATA%\\${IDENTIFIER}`,
    Linux: `~/.config/${IDENTIFIER}`,
  },
  AppLocalData: {
    macOS: `~/Library/Application Support/${IDENTIFIER}`,
    Windows: `%LOCALAPPDATA%\\${IDENTIFIER}`,
    Linux: `~/.local/share/${IDENTIFIER}`,
  },
  AppCache: {
    macOS: `~/Library/Caches/${IDENTIFIER}`,
    Windows: `%LOCALAPPDATA%\\${IDENTIFIER}`,
    Linux: `~/.cache/${IDENTIFIER}`,
  },
  AppLog: {
    macOS: `~/Library/Logs/${IDENTIFIER}`,
    Windows: `%LOCALAPPDATA%\\${IDENTIFIER}\\logs`,
    Linux: `~/.local/share/${IDENTIFIER}/logs`,
  },
  Temp: {
    macOS: '/var/folders/…/T',
    Windows: '%LOCALAPPDATA%\\Temp',
    Linux: '/tmp',
  },
  Document: {
    macOS: '~/Documents',
    Windows: '%USERPROFILE%\\Documents',
    Linux: '~/Documents',
  },
};

const SEP: Record<PlatformId, string> = {
  macOS: '/',
  Windows: '\\',
  Linux: '/',
};

/* ACL 命令名:插件命令按 <插件>.<命令> 报告,连字符命名转 snake_case。 */
const ACL_NAMES: Record<FsOp, string> = {
  writeTextFile: 'write_text_file',
  readTextFile: 'read_text_file',
  exists: 'exists',
  mkdir: 'mkdir',
  remove: 'remove',
  readDir: 'read_dir',
};

type ErrKind = 'enoent' | 'eexist' | 'enotempty' | 'enotdir' | 'isdir';

/* 各平台 errno 消息的真实形态(模拟呈现;Windows 文案取自 Win32 错误)。 */
const ERRORS: Record<PlatformId, Record<ErrKind, string>> = {
  macOS: {
    enoent: 'No such file or directory (os error 2)',
    eexist: 'File exists (os error 17)',
    enotempty: 'Directory not empty (os error 66)',
    enotdir: 'Not a directory (os error 20)',
    isdir: 'Is a directory (os error 21)',
  },
  Linux: {
    enoent: 'No such file or directory (os error 2)',
    eexist: 'File exists (os error 17)',
    enotempty: 'Directory not empty (os error 39)',
    enotdir: 'Not a directory (os error 20)',
    isdir: 'Is a directory (os error 21)',
  },
  Windows: {
    enoent: 'The system cannot find the file specified. (os error 2)',
    eexist: 'File exists (os error 183)',
    enotempty: 'The directory is not empty. (os error 145)',
    enotdir: 'The directory name is invalid. (os error 267)',
    isdir: 'Access is denied. (os error 5)',
  },
};

/* 三个授权档位对应的 capabilities 内容,描述里与读者核对。 */
const GRANT_LABELS: Record<GrantId, string> = {
  default: '仅 fs:default',
  'write-no-scope': '+ fs:allow-write-text-file(未配 scope)',
  'write-scope': '+ fs:allow-write-text-file / fs:allow-remove / fs:scope',
};

interface Verdict {
  ok: boolean;
  kind: 'ok' | 'not-allowed' | 'forbidden';
  text: string;
}

function verdict(op: FsOp, baseDir: BaseDirId, grant: GrantId): Verdict {
  const inApp = APP_DIRS.includes(baseDir);
  switch (op) {
    case 'writeTextFile':
      if (grant === 'default') {
        return {
          ok: false,
          kind: 'not-allowed',
          text: 'fs:default 不含写命令,fs:allow-write-text-file 未声明',
        };
      }
      if (grant === 'write-no-scope') {
        return {
          ok: false,
          kind: 'forbidden',
          text: '命令已声明,但没配 scope——不覆盖任何路径',
        };
      }
      return {
        ok: true,
        kind: 'ok',
        text: 'fs:allow-write-text-file + fs:scope 覆盖该路径',
      };
    case 'mkdir':
      if (grant === 'write-scope') {
        return {
          ok: true,
          kind: 'ok',
          text: 'allow-mkdir(fs:default 自带)+ scope 覆盖',
        };
      }
      return {
        ok: false,
        kind: 'forbidden',
        text: 'fs:default 只允许 mkdir 创建应用目录本身,子目录不在 scope 内',
      };
    case 'remove':
      if (grant === 'write-scope') {
        return { ok: true, kind: 'ok', text: 'fs:allow-remove + fs:scope 覆盖' };
      }
      return {
        ok: false,
        kind: 'not-allowed',
        text: 'fs:default 不含 remove 命令',
      };
    default:
      if (inApp) {
        return { ok: true, kind: 'ok', text: 'fs:default:递归读应用专属目录' };
      }
      if (grant === 'write-scope') {
        return { ok: true, kind: 'ok', text: 'fs:scope 覆盖该路径' };
      }
      return {
        ok: false,
        kind: 'forbidden',
        text: '命令可用,但 scope 只覆盖应用专属目录',
      };
  }
}

/* 模拟文件系统:每个 baseDir 一棵相对路径树,跨操作持续累积。 */
type EntryType = 'file' | 'dir';

function segments(rawPath: string): string[] {
  return rawPath
    .split(/[\\/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '.');
}

interface ExecResult {
  text: string;
  fail: boolean;
  mutate?: () => void;
}

function execute(
  op: FsOp,
  rawPath: string,
  platform: PlatformId,
  entries: Map<string, EntryType>,
): ExecResult {
  const err = (kind: ErrKind): ExecResult => ({
    text: `rejected: ${ERRORS[platform][kind]}`,
    fail: true,
  });
  const segs = segments(rawPath);
  const key = segs.join('/');

  /* 沿路径逐段查树;根视为目录。返回 undefined = 路径不存在。 */
  const lookup = (parts: string[]): EntryType | undefined => {
    let type: EntryType = 'dir';
    for (let i = 0; i < parts.length; i += 1) {
      if (type !== 'dir') {
        return undefined;
      }
      const entry = entries.get(parts.slice(0, i + 1).join('/'));
      if (!entry) {
        return undefined;
      }
      type = entry;
    }
    return type;
  };

  switch (op) {
    case 'writeTextFile': {
      if (segs.length === 0) {
        return err('isdir');
      }
      if (segs.length > 1) {
        const parent = lookup(segs.slice(0, -1));
        if (!parent) {
          return err('enoent'); // 父目录不会自动创建
        }
        if (parent === 'file') {
          return err('enotdir');
        }
      }
      const existed = entries.get(key);
      return {
        text: existed ? '已写入(覆盖原内容)' : '已创建并写入',
        fail: false,
        mutate: () => entries.set(key, 'file'),
      };
    }
    case 'readTextFile': {
      const type = lookup(segs);
      if (!type) {
        return err('enoent');
      }
      if (type === 'dir') {
        return err('isdir');
      }
      return { text: `返回 '{"demo":true}'`, fail: false };
    }
    case 'exists':
      return {
        text: `返回 ${entries.has(key) ? 'true' : 'false'}`,
        fail: false,
      };
    case 'mkdir': {
      if (segs.length === 0) {
        return err('eexist');
      }
      if (entries.has(key)) {
        return err('eexist'); // recursive: true 时已存在不算错
      }
      if (segs.length > 1) {
        const parent = lookup(segs.slice(0, -1));
        if (!parent) {
          return err('enoent'); // recursive 默认 false,不会逐级创建
        }
        if (parent === 'file') {
          return err('enotdir');
        }
      }
      return {
        text: '已创建目录',
        fail: false,
        mutate: () => entries.set(key, 'dir'),
      };
    }
    case 'remove': {
      const type = lookup(segs);
      if (!type) {
        return err('enoent');
      }
      if (type === 'dir') {
        const hasChildren = [...entries.keys()].some((k) =>
          k.startsWith(`${key}/`),
        );
        if (hasChildren) {
          return {
            text: `rejected: ${ERRORS[platform].enotempty} —— 需要 recursive: true`,
            fail: true,
          };
        }
      }
      return {
        text: '已删除',
        fail: false,
        mutate: () => {
          entries.delete(key);
          [...entries.keys()].forEach((k) => {
            if (k.startsWith(`${key}/`)) {
              entries.delete(k);
            }
          });
        },
      };
    }
    case 'readDir': {
      const type = lookup(segs);
      if (!type) {
        return err('enoent');
      }
      if (type === 'file') {
        return err('enotdir');
      }
      const prefix = key ? `${key}/` : '';
      const names = new Map<string, EntryType>();
      entries.forEach((entryType, k) => {
        if (!k.startsWith(prefix)) {
          return;
        }
        const rest = k.slice(prefix.length);
        const first = rest.split('/')[0];
        const isDir =
          rest.includes('/') || entries.get(`${prefix}${first}`) === 'dir';
        names.set(first, isDir ? 'dir' : 'file');
      });
      const children = [...names.entries()];
      if (children.length === 0) {
        return { text: '返回 [](空目录)', fail: false };
      }
      const head = children
        .slice(0, 3)
        .map(([name, entryType]) => name + (entryType === 'dir' ? '/' : ''))
        .join(' · ');
      return {
        text: `返回 ${children.length} 项:${head}${children.length > 3 ? ' …' : ''}`,
        fail: false,
      };
    }
  }
}

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#94a3b8';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const FAIL = '#b91c1c';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const CANVAS_W = 700;
const CANVAS_H = 470;

const LEFT_X = 24;
const LEFT_W = 280;
const RIGHT_X = 330;
const RIGHT_W = 346;
const PANEL_Y = 92;
const PANEL_H = 316;

/* 调用时间线(毫秒):解析 → 权限判定 → 执行。 */
const TL = { parse: 0, check: 260, result: 520, total: 900 };

type StepStatus = 'done' | 'current' | 'todo' | 'fail';

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
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

  let current: ExampleArgs = {
    op: 'writeTextFile',
    baseDir: 'AppData',
    path: 'settings.json',
    grant: 'default',
    platform: 'macOS',
  };
  /* 每个 baseDir 一棵树,跨操作持续累积:写过的文件在切换操作后仍在。 */
  const forest = new Map<BaseDirId, Map<string, EntryType>>();
  const treeOf = (baseDir: BaseDirId): Map<string, EntryType> => {
    let tree = forest.get(baseDir);
    if (!tree) {
      tree = new Map();
      forest.set(baseDir, tree);
    }
    return tree;
  };

  let startedAt = 0;
  let rafId = 0;
  let settleTimer = 0;
  let mutateTimer = 0;

  function clearTimers(): void {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
    }
    if (mutateTimer) {
      window.clearTimeout(mutateTimer);
      mutateTimer = 0;
    }
  }

  function panel(x: number, y: number, w: number, h: number): void {
    drawingContext.fillStyle = BOX_BG;
    roundRect(drawingContext, x, y, w, h, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = BOX_BORDER;
    drawingContext.stroke();
  }

  function label(
    x: number,
    y: number,
    text: string,
    options: {
      color?: string;
      mono?: boolean;
      weight?: number;
      size?: number;
    } = {},
  ): void {
    drawingContext.fillStyle = options.color ?? TEXT;
    const size = options.size ?? 11;
    const family = options.mono
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'ui-sans-serif, system-ui, sans-serif';
    drawingContext.font = `${options.weight ?? 400} ${size}px ${family}`;
    drawingContext.fillText(text, x, y);
  }

  function stepRow(x: number, y: number, text: string, status: StepStatus): void {
    const color =
      status === 'done'
        ? OK
        : status === 'current'
          ? ACCENT
          : status === 'fail'
            ? FAIL
            : PALE;
    const textColor = status === 'todo' ? PALE : status === 'fail' ? FAIL : TEXT;
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    drawingContext.arc(x + 6, y - 3, 4, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = textColor;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(text, x + 20, y);
  }

  function resolvePath(args: ExampleArgs): string {
    const sep = SEP[args.platform];
    const segs = segments(args.path);
    return [ROOTS[args.baseDir][args.platform], ...segs].join(sep);
  }

  function callSignature(args: ExampleArgs): [string, string] {
    const target = `'${args.path || ''}'`;
    const head =
      args.op === 'writeTextFile'
        ? `await writeTextFile(${target}, '…',`
        : `await ${args.op}(${target},`;
    return [head, `  { baseDir: BaseDirectory.${args.baseDir} });`];
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

    const args = current;
    const resolved = resolvePath(args);
    const tree = treeOf(args.baseDir);
    const v = verdict(args.op, args.baseDir, args.grant);
    const exec = v.ok
      ? execute(args.op, args.path, args.platform, tree)
      : {
          text:
            v.kind === 'not-allowed'
              ? `rejected: fs.${ACL_NAMES[args.op]} not allowed…`
              : `rejected: forbidden path: ${resolved}`,
          fail: true,
        };

    /* 顶部:路径解析。 */
    label(LEFT_X, 24, `相对路径 '${args.path}' · baseDir: BaseDirectory.${args.baseDir}`, {
      color: DIM,
    });
    label(LEFT_X, 44, `→ ${resolved}`, { mono: true, color: ACCENT, size: 11.5 });
    label(LEFT_X, 66, `${args.platform} · 授权:${GRANT_LABELS[args.grant]}`, {
      color: PALE,
      size: 10.5,
    });

    /* 左列:模拟目录树。 */
    panel(LEFT_X, PANEL_Y, LEFT_W, PANEL_H);
    label(LEFT_X + 12, PANEL_Y + 22, `模拟目录 · ${args.baseDir}(${tree.size} 项)`, {
      color: DIM,
      weight: 600,
    });
    const sortedEntries = [...tree.entries()].sort(([a], [b]) => a.localeCompare(b));
    if (sortedEntries.length === 0) {
      label(LEFT_X + 12, PANEL_Y + 52, '(空——先写一个文件试试)', { color: PALE });
    }
    sortedEntries.slice(0, 12).forEach(([key, type], index) => {
      const name = key.split('/').pop() ?? key;
      const depth = key.split('/').length - 1;
      const isDir = type === 'dir';
      label(
        LEFT_X + 16 + depth * 12,
        PANEL_Y + 52 + index * 20,
        isDir ? `${name}/` : name,
        { color: isDir ? ACCENT : TEXT, mono: true, size: 11 },
      );
    });
    if (sortedEntries.length > 12) {
      label(LEFT_X + 16, PANEL_Y + 52 + 12 * 20, `… 共 ${sortedEntries.length} 项`, {
        color: PALE,
      });
    }

    /* 右列:本次调用卡。 */
    panel(RIGHT_X, PANEL_Y, RIGHT_W, PANEL_H);
    const [callHead, callTail] = callSignature(args);
    label(RIGHT_X + 12, PANEL_Y + 22, '本次调用', { color: DIM, weight: 600 });
    label(RIGHT_X + 12, PANEL_Y + 46, callHead, { mono: true, size: 10.5 });
    label(RIGHT_X + 12, PANEL_Y + 64, callTail, { mono: true, size: 10.5 });

    const elapsed = startedAt === 0 ? TL.total : performance.now() - startedAt;
    const phase = (at: number) => startedAt === 0 || elapsed >= at;

    const steps: Array<{ text: string; at: number; fail?: boolean }> = [
      { text: `解析:${args.path || '(空)'} + ${args.baseDir}`, at: TL.parse },
      { text: `权限判定:${v.text}`, at: TL.check, fail: !v.ok },
    ];
    if (v.ok) {
      steps.push({ text: `执行:${exec.text}`, at: TL.result });
      steps.push({ text: 'Promise resolve', at: TL.result + 200 });
    } else {
      steps.push({ text: exec.text, at: TL.result, fail: true });
    }

    const finished = startedAt === 0 || elapsed >= TL.total;
    steps.forEach((step, index) => {
      const rowY = PANEL_Y + 96 + index * 26;
      const reached = phase(step.at);
      const status: StepStatus = step.fail
        ? reached
          ? 'fail'
          : 'todo'
        : !reached
          ? 'todo'
          : finished
            ? 'done'
            : index === steps.length - 1 ||
                elapsed < (steps[index + 1]?.at ?? Infinity)
              ? 'current'
              : 'done';
      stepRow(RIGHT_X + 16, rowY, step.text, status);
    });

    /* 底部提示与结果读数。 */
    label(LEFT_X, height - 18, '目录内容跨操作持续累积;错误消息按目标平台模拟真实形态', {
      color: PALE,
      size: 10,
    });
    label(RIGHT_X + 16, PANEL_Y + PANEL_H - 18, exec.text, {
      mono: true,
      size: 10.5,
      color: exec.fail ? FAIL : OK,
    });

    const treeLabel =
      tree.size === 0
        ? '(空)'
        : sortedEntries
            .slice(0, 4)
            .map(([key, type]) => (type === 'dir' ? `${key}/` : key))
            .join(' · ') + (tree.size > 4 ? ` …共 ${tree.size} 项` : '');

    emit({
      resolved,
      callLabel: `${callHead} ${callTail.trim()}`,
      resultLabel: exec.fail ? exec.text : `resolve —— ${exec.text}`,
      treeLabel,
    });
  }

  function tick(): void {
    const elapsed = performance.now() - startedAt;
    draw();
    if (elapsed >= TL.total) {
      rafId = 0;
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      clearTimers();
      current = { ...options, path: options.path.trim() };
      const args = current;
      const v = verdict(args.op, args.baseDir, args.grant);

      // 预先算好执行结果;成功时在时间线的「执行」时刻真正改树(模拟写生效)。
      const exec = v.ok
        ? execute(args.op, args.path, args.platform, treeOf(args.baseDir))
        : undefined;
      if (exec?.mutate) {
        const mutate = exec.mutate;
        mutateTimer = window.setTimeout(() => {
          mutate();
          draw();
        }, TL.result);
      }

      startedAt = performance.now();
      draw();
      rafId = window.requestAnimationFrame(tick);
      // 兜底:动画结束后再刷新一次读数,避免节流吞掉最终结果。
      settleTimer = window.setTimeout(() => draw(), TL.total + 150);
    },
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
