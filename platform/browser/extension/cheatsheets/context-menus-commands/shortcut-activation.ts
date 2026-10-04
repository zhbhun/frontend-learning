/**
 * 范例介绍：演示 manifest commands 的 suggested_key 怎样决定快捷键能否注册、
 * 注册后按下会派发什么。
 * 前置状态：示例扩展声明了命令 toggle-highlight（或保留命令 _execute_action），
 * suggested_key、global、是否被其他扩展占用由参数给出。
 * 主要操作：选择快捷键组合、切换平台、开关节奏 global、切换命令是否为
 * _execute_action、模拟另一扩展占用同一组合。
 * 预期结果：不符合按键规则（没有 Ctrl/Alt、Ctrl+Alt 组合、媒体键带修饰键、
 * MacCtrl 用在非 mac 平台、global 超出 Ctrl+Shift+[0-9]）时 manifest 校验失败、
 * 扩展无法安装；合法但已被占用时快捷键不注册，chrome://extensions/shortcuts
 * 里 shortcut 为空；成功注册时 mac 平台上的 Ctrl 自动显示为 Command；
 * _execute_action 触发 action 而不派发 onCommand。
 * 阅读主线：键盘条给出组合形态，三张状态卡给出「校验 → 注册 → 派发」流水线。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ShortcutPlatform = 'windows' | 'mac' | 'linux' | 'chromeos';

export interface ShortcutActivationOptions {
  shortcut: string;
  platform: ShortcutPlatform;
  global: boolean;
  special: boolean;
  occupied: boolean;
}

export interface ShortcutActivationSnapshot {
  parseLabel: string;
  validateLabel: string;
  registerLabel: string;
  dispatchLabel: string;
  scopeLabel: string;
}

export interface ShortcutActivationInstance {
  update(options: ShortcutActivationOptions): void;
  dispose(): void;
}

const VW = 760;
const VH = 428;

const COMMAND_NAME = 'toggle-highlight';
const PLATFORM_LABELS: Record<ShortcutPlatform, string> = {
  windows: 'Windows',
  mac: 'macOS',
  linux: 'Linux',
  chromeos: 'ChromeOS',
};

interface ParsedShortcut {
  mods: string[];
  key: string;
  valid: boolean;
  error: string;
}

function parseShortcut(
  shortcut: string,
  platform: ShortcutPlatform,
  isGlobal: boolean,
): ParsedShortcut {
  const parts = shortcut.split('+').filter(Boolean);
  const key = parts[parts.length - 1] ?? '';
  const mods = parts.slice(0, -1);
  const modSet = new Set(mods);
  const isMediaKey = key.startsWith('Media');
  const invalid = (error: string): ParsedShortcut => ({
    mods,
    key,
    valid: false,
    error,
  });

  if (isGlobal && platform === 'chromeos') {
    return invalid('ChromeOS 不支持 global 命令');
  }
  if (modSet.has('MacCtrl') && platform !== 'mac') {
    return invalid('MacCtrl 只能出现在 mac 快捷键里，代表 macOS 的 Control 键');
  }
  if (modSet.has('Search') && platform !== 'chromeos') {
    return invalid('Search 修饰键只能在 ChromeOS 快捷键里使用');
  }
  if (isMediaKey && mods.length > 0) {
    return invalid('媒体键不能与修饰键组合');
  }
  // 扩展快捷键必须包含 Ctrl 或 Alt；mac 上 Command / MacCtrl 可替代 Ctrl，
  // Option 可替代 Alt
  const hasControl =
    modSet.has('Ctrl') ||
    modSet.has('Alt') ||
    (platform === 'mac' && (modSet.has('Command') || modSet.has('MacCtrl')));
  if (!isMediaKey && !hasControl) {
    return invalid('扩展快捷键必须包含 Ctrl 或 Alt');
  }
  if (modSet.has('Ctrl') && modSet.has('Alt')) {
    return invalid('Ctrl+Alt 组合不被允许，避免与 AltGr 键冲突');
  }
  if (isGlobal && !(modSet.has('Ctrl') && modSet.has('Shift') && /^[0-9]$/.test(key))) {
    return invalid('global 命令的建议快捷键限定 Ctrl+Shift+[0-9]');
  }
  return { mods, key, valid: true, error: '' };
}

/** macOS 上 Ctrl 会自动转换成 Command，manifest 写 Ctrl 也一样。 */
function normalizeMods(mods: string[], platform: ShortcutPlatform): string[] {
  if (platform !== 'mac') {
    return mods;
  }
  return mods.map((mod) => (mod === 'Ctrl' ? 'Command' : mod));
}

function buildSnapshot(options: ShortcutActivationOptions): ShortcutActivationSnapshot {
  const parsed = parseShortcut(options.shortcut, options.platform, options.global);
  const mods = normalizeMods(parsed.mods, options.platform);
  const combo = [...mods, parsed.key].join('+');

  const registered = parsed.valid && !options.occupied;
  const dispatch = !parsed.valid
    ? '扩展装不上，按了没反应'
    : options.occupied
      ? '未绑定快捷键，按了没反应'
      : options.special
        ? '触发 action：有 popup 打开 popup，无 popup 派发 action.onClicked'
        : `commands.onCommand 收到 "${COMMAND_NAME}"（第二参数带当前 tab）`;

  return {
    parseLabel: [...mods, parsed.key].join(' + '),
    validateLabel: parsed.valid ? '通过' : `失败：${parsed.error}`,
    registerLabel: registered
      ? `已注册：${combo}`
      : parsed.valid
        ? '未注册（被其他扩展占用）'
        : '未注册（manifest 校验失败）',
    dispatchLabel: dispatch,
    scopeLabel: options.global
      ? 'global：Chrome 失焦时也触发（ChromeOS 不支持）'
      : '浏览器作用域：Chrome 失焦时不触发',
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawKeycaps(
  ctx: CanvasRenderingContext2D,
  options: ShortcutActivationOptions,
  snapshot: ShortcutActivationSnapshot,
): void {
  const parsed = parseShortcut(options.shortcut, options.platform, options.global);
  const mods = normalizeMods(parsed.mods, options.platform);
  const caps = [...mods, parsed.key];
  const registered = parsed.valid && !options.occupied;

  ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
  const widths = caps.map((cap) => ctx.measureText(cap).width + 26);
  const gap = 10;
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (caps.length - 1);
  let x = (VW - total) / 2;
  const y = 78;
  const h = 40;

  caps.forEach((cap, index) => {
    const w = widths[index];
    ctx.fillStyle = registered ? '#ffffff' : '#f1f5f9';
    roundRect(ctx, x, y, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = registered ? '#4f7cff' : '#cbd5e1';
    ctx.stroke();
    ctx.fillStyle = registered ? '#0f172a' : '#94a3b8';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(cap, x + 13, y + 25);
    x += w + gap;
  });

  const caption = `suggested_key 声明（${PLATFORM_LABELS[options.platform]}）：${snapshot.parseLabel}`;
  ctx.fillStyle = '#475569';
  ctx.font = '400 12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(caption, (VW - ctx.measureText(caption).width) / 2, y + h + 24);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  tone: 'ok' | 'bad' | 'idle',
): void {
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(title, x + 14, y + 22);

  ctx.fillStyle =
    tone === 'ok' ? '#15803d' : tone === 'bad' ? '#b91c1c' : '#475569';
  ctx.font = '400 12px ui-sans-serif, system-ui, sans-serif';
  wrapText(ctx, value, x + 14, y + 44, w - 26, 16);
}

/** 简单换行：卡片内容超过一行时折行绘制。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line += char;
    }
  }
  if (line) {
    lines.push(line);
  }
  lines.slice(0, 3).forEach((content, index) => {
    ctx.fillText(content, x, y + index * lineHeight);
  });
}

function drawShortcutsPanel(
  ctx: CanvasRenderingContext2D,
  options: ShortcutActivationOptions,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const parsed = parseShortcut(options.shortcut, options.platform, options.global);
  const mods = normalizeMods(parsed.mods, options.platform);
  const combo = [...mods, parsed.key].join('+');
  const registered = parsed.valid && !options.occupied;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('chrome://extensions/shortcuts 里的本扩展', x + 14, y + 22);

  ctx.font = '400 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(options.special ? '_execute_action' : COMMAND_NAME, x + 14, y + 44);
  ctx.fillStyle = registered ? '#15803d' : '#b91c1c';
  ctx.fillText(registered ? combo : '（空）', x + 190, y + 44);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 12px ui-sans-serif, system-ui, sans-serif';
  const note = options.occupied
    ? 'getAll() 查得 shortcut === ""，即该命令未注册到快捷键'
    : parsed.valid
      ? '命令生效中；用户可在这里改绑其他组合'
      : 'manifest 未通过校验，扩展无法安装';
  ctx.fillText(note, x + 330, y + 44);
}

export function createShortcutActivation(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShortcutActivationSnapshot) => void,
): ShortcutActivationInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ShortcutActivationOptions = {
    shortcut: 'Ctrl+Shift+Y',
    platform: 'windows',
    global: false,
    special: false,
    occupied: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scale = size.width / VW;

    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    drawingContext.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, 0, 0);
    drawingContext.clearRect(0, 0, VW, VH);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('commands 的按键规则、注册状态与派发结果', 20, 36);

    const snapshot = buildSnapshot(current);
    const parsed = parseShortcut(current.shortcut, current.platform, current.global);
    const registered = parsed.valid && !current.occupied;

    drawKeycaps(drawingContext, current, snapshot);

    // 三张状态卡横排：校验 → 注册 → 派发
    const cardW = 236;
    const cardH = 150;
    const cardY = 180;
    const cards: Array<[string, string, 'ok' | 'bad' | 'idle']> = [
      [
        '1 · manifest 校验',
        snapshot.validateLabel,
        parsed.valid ? 'ok' : 'bad',
      ],
      [
        '2 · 注册状态',
        registered
          ? `${snapshot.registerLabel}；${snapshot.scopeLabel}`
          : snapshot.registerLabel,
        registered ? 'ok' : 'bad',
      ],
      [
        '3 · 按下快捷键时',
        snapshot.dispatchLabel,
        registered ? 'ok' : 'bad',
      ],
    ];
    cards.forEach(([title, value, tone], index) => {
      drawCard(drawingContext, 20 + index * (cardW + 16), cardY, cardW, cardH, title, value, tone);
    });

    drawShortcutsPanel(drawingContext, current, 20, 350, 720, 56);

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { ...options };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
