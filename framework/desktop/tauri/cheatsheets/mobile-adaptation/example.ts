/**
 * 范例介绍:模拟「选一个桌面版在用的能力点 × 目标移动平台 → 官方支持判定 + 迁移对策」。
 * 输入:能力点(窗口 / 菜单 / 托盘等核心 API 与常用插件共 14 项)、目标平台(Android / iOS)。
 * 主要操作:左栏按分组列出能力点,色点按当前目标平台标出支持级别;右栏给出桌面与
 *   目标平台的支持徽标、平台备注和迁移对策,判定数据对齐官方插件支持矩阵与文档表述。
 * 预期结果:桌面专属能力(menu、tray、updater 等)在移动端为「不支持」并给出替代方案;
 *   全平台能力在移动端可能降级为「部分支持」(fs 限应用目录、clipboard 仅纯文本等);
 *   移动专属能力(nfc)桌面端为「不支持」;通知两端可用但移动端要先运行时授权。
 * 阅读主线:迁移 = 查支持级别 × 读平台备注 × 按对策收口——不支持找替代,部分支持按
 *   限制改写法,能用的补平台声明与运行时授权。
 * 边界:级别与备注是编写本课时的官方矩阵快照,以 tauri.app/plugin/ 实时表格为准;
 *   仅覆盖高频能力点,未列出的按同一方法查矩阵。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CapabilityPoint =
  | 'api:multi-window'
  | 'core:menu'
  | 'core:tray'
  | 'plugin:global-shortcut'
  | 'plugin:window-state'
  | 'plugin:single-instance'
  | 'plugin:updater'
  | 'plugin:fs|read_text_file'
  | 'plugin:clipboard-manager|write_text'
  | 'plugin:dialog|open'
  | 'plugin:opener|open_url'
  | 'plugin:deep-link'
  | 'plugin:notification'
  | 'plugin:nfc|scan';

export type TargetPlatform = 'Android' | 'iOS';

export type SupportLevel = 'full' | 'partial' | 'none';

export interface ExampleArgs {
  point: CapabilityPoint;
  target: TargetPlatform;
}

export interface ExampleSnapshot {
  /** 读数:能力点 id。 */
  point: string;
  /** 读数:目标平台。 */
  target: string;
  /** 读数:移动端判定,如「部分支持 · 仅纯文本」。 */
  verdict: string;
  /** 读数:迁移对策(整段合并)。 */
  strategy: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** 支持级别:徽标全称与列表短词。 */
const LEVEL_WORD: Record<SupportLevel, string> = {
  full: '完整支持',
  partial: '部分支持',
  none: '不支持',
};

const LEVEL_TICK: Record<SupportLevel, string> = {
  full: '支持',
  partial: '部分',
  none: '不支持',
};

interface Cell {
  level: SupportLevel;
  /** 平台备注,已按行写好(最多两行)。 */
  note: string[];
}

interface PointProfile {
  /** 中文名。 */
  label: string;
  desktop: Cell;
  android: Cell;
  ios: Cell;
  /** 读数里跟在级别后的短说明。 */
  short: string;
  /** 迁移对策(两到三行)。 */
  strategy: string[];
  /** 判定依据的官方出处。 */
  basis: string;
}

/** 能力点档案:级别与备注对齐官方插件支持矩阵与对应文档页。 */
const PROFILES: Record<CapabilityPoint, PointProfile> = {
  'api:multi-window': {
    label: '新建窗口 WebviewWindowBuilder',
    desktop: { level: 'full', note: ['想建就建,窗口自由布局。'] },
    android: {
      level: 'partial',
      note: ['平板并排(Activity Embedding,12L+);', '手机压入返回栈,返回键回上一窗。'],
    },
    ios: {
      level: 'partial',
      note: ['iPad 并排(UIScene,13+);', '手机常直接替换当前界面。'],
    },
    short: '平板并排,手机压栈/替换',
    strategy: [
      '运行时查 app.supportsMultipleWindows 再建窗;',
      'capability 放行 core:webview:allow-create-webview-window,',
      'windows 覆盖动态标签(如 "main-*")。',
    ],
    basis: '官方文档:Multi-Window on Mobile',
  },
  'core:menu': {
    label: '窗口菜单 Menu',
    desktop: { level: 'full', note: ['原生菜单栏 / 上下文菜单。'] },
    android: {
      level: 'none',
      note: ['无菜单栏概念;官方标注', '「Available on desktop」。'],
    },
    ios: {
      level: 'none',
      note: ['无菜单栏概念;官方标注', '「Available on desktop」。'],
    },
    short: '仅桌面',
    strategy: ['操作收进页面内 UI:', '底部导航、悬浮按钮或「更多」面板。'],
    basis: '官方文档:Window Menu(Available on desktop)',
  },
  'core:tray': {
    label: '系统托盘 TrayIcon',
    desktop: { level: 'full', note: ['托盘图标 + 菜单常驻。'] },
    android: {
      level: 'none',
      note: ['移动端没有系统托盘;', '支持矩阵 android / ios 均无支持。'],
    },
    ios: {
      level: 'none',
      note: ['移动端没有系统托盘;', '支持矩阵 android / ios 均无支持。'],
    },
    short: '仅桌面',
    strategy: ['不在移动分支创建托盘;', '常驻入口交给应用图标与通知。'],
    basis: '官方插件支持矩阵(system-tray 行)',
  },
  'plugin:global-shortcut': {
    label: '全局快捷键 global-shortcut',
    desktop: { level: 'full', note: ['系统级全局热键。'] },
    android: { level: 'none', note: ['系统不提供全局热键。'] },
    ios: { level: 'none', note: ['系统不提供全局热键。'] },
    short: '仅桌面',
    strategy: ['触发入口收进应用内 UI;', '移动分支不注册快捷键。'],
    basis: '官方插件支持矩阵(该插件行)',
  },
  'plugin:window-state': {
    label: '窗口状态恢复 window-state',
    desktop: { level: 'full', note: ['记住并恢复窗口大小位置。'] },
    android: { level: 'none', note: ['窗口形态由系统管理。'] },
    ios: { level: 'none', note: ['窗口形态由系统管理。'] },
    short: '仅桌面',
    strategy: ['移动分支删掉恢复逻辑;', '分屏记忆交给系统。'],
    basis: '官方插件支持矩阵(该插件行)',
  },
  'plugin:single-instance': {
    label: '单实例 single-instance',
    desktop: { level: 'full', note: ['二次启动唤起已有实例。'] },
    android: { level: 'none', note: ['由系统任务模型约束。'] },
    ios: { level: 'none', note: ['由系统任务模型约束。'] },
    short: '仅桌面',
    strategy: ['系统已保证单实例;', '插件仅编进桌面分支。'],
    basis: '官方插件支持矩阵(该插件行)',
  },
  'plugin:updater': {
    label: '应用内更新 updater',
    desktop: { level: 'full', note: ['应用内检查并安装更新。'] },
    android: { level: 'none', note: ['更新由商店托管。'] },
    ios: { level: 'none', note: ['更新由商店托管。'] },
    short: '仅桌面',
    strategy: ['更新交给 App Store / Google Play;', '打包签名流程见 6.3 课。'],
    basis: '官方插件支持矩阵(该插件行)',
  },
  'plugin:fs|read_text_file': {
    label: '读文件 fs read_text_file',
    desktop: { level: 'full', note: ['按 scope 访问文件系统。'] },
    android: { level: 'partial', note: ['默认仅限应用文件夹。'] },
    ios: { level: 'partial', note: ['默认仅限应用文件夹。'] },
    short: '默认限应用文件夹',
    strategy: ['数据落到 appDataDir;', '用户文件经 dialog 挑选后按需读写。'],
    basis: '官方插件支持矩阵(* 脚注)',
  },
  'plugin:clipboard-manager|write_text': {
    label: '写剪贴板 clipboard write_text',
    desktop: { level: 'full', note: ['富内容(图片等)可用。'] },
    android: { level: 'partial', note: ['仅支持纯文本。'] },
    ios: { level: 'partial', note: ['仅支持纯文本。'] },
    short: '仅纯文本',
    strategy: ['只当纯文本剪贴板用;', '富内容走系统分享或落盘传递。'],
    basis: '官方插件支持矩阵(* 脚注)',
  },
  'plugin:dialog|open': {
    label: '打开选择框 dialog open',
    desktop: { level: 'full', note: ['文件与目录选择都可。'] },
    android: { level: 'partial', note: ['不支持文件夹选择。'] },
    ios: { level: 'partial', note: ['不支持文件夹选择。'] },
    short: '无文件夹选择',
    strategy: ['移动端只提供选文件;', '目录级管理改应用内实现。'],
    basis: '官方插件支持矩阵(* 脚注)',
  },
  'plugin:opener|open_url': {
    label: '打开链接 opener open_url',
    desktop: { level: 'full', note: ['URL 与本地路径都能打开。'] },
    android: { level: 'partial', note: ['仅允许 open 打开 URL。'] },
    ios: { level: 'partial', note: ['仅允许 open 打开 URL。'] },
    short: '仅 open 打开 URL',
    strategy: ['仅保留网页 / 外链跳转;', '本地文件改用分享能力。'],
    basis: '官方插件支持矩阵(* 脚注)',
  },
  'plugin:deep-link': {
    label: '深链注册 deep-link',
    desktop: {
      level: 'partial',
      note: ['Windows / Linux 支持运行时注册;', 'macOS 同样仅配置注册。'],
    },
    android: { level: 'partial', note: ['必须在配置中注册;', '不支持运行时注册。'] },
    ios: { level: 'partial', note: ['必须在配置中注册;', '不支持运行时注册。'] },
    short: '仅配置注册',
    strategy: ['注册写进 tauri.conf.json;', '别依赖运行时 register。'],
    basis: '官方插件支持矩阵(* 脚注)',
  },
  'plugin:notification': {
    label: '系统通知 notification',
    desktop: { level: 'full', note: ['可直接发送。'] },
    android: { level: 'full', note: ['可发送,但先要运行时授权。'] },
    ios: { level: 'full', note: ['可发送,但先要运行时授权。'] },
    short: '先运行时授权',
    strategy: ['isPermissionGranted → requestPermission;', '授权通过后再发送。'],
    basis: '官方插件支持矩阵 + 通知插件页',
  },
  'plugin:nfc|scan': {
    label: 'NFC 读卡 nfc scan',
    desktop: { level: 'none', note: ['桌面端不支持。'] },
    android: { level: 'full', note: ['支持;在清单中声明 NFC 权限。'] },
    ios: {
      level: 'full',
      note: ['支持;还需 Info.plist 用途说明', '与 NFC capability。'],
    },
    short: '移动专属',
    strategy: ['桌面分支准备降级交互;', '移动端按插件文档补平台声明。'],
    basis: '官方插件页:NFC(权限与声明)',
  },
};

/** 左栏分组与顺序。 */
const GROUPS: Array<{ name: string; points: CapabilityPoint[] }> = [
  { name: '窗口与核心', points: ['api:multi-window', 'core:menu', 'core:tray'] },
  {
    name: '桌面专属插件',
    points: [
      'plugin:global-shortcut',
      'plugin:window-state',
      'plugin:single-instance',
      'plugin:updater',
    ],
  },
  {
    name: '全平台 · 移动有折扣',
    points: [
      'plugin:fs|read_text_file',
      'plugin:clipboard-manager|write_text',
      'plugin:dialog|open',
      'plugin:opener|open_url',
      'plugin:deep-link',
      'plugin:notification',
    ],
  },
  { name: '移动专属', points: ['plugin:nfc|scan'] },
];

const FULL = '#15803d';
const FULL_BG = '#dcfce7';
const PARTIAL = '#b45309';
const PARTIAL_BG = '#fef3c7';
const NONE = '#b91c1c';
const NONE_BG = '#fee2e2';
const LEVEL_COLOR: Record<SupportLevel, string> = {
  full: FULL,
  partial: PARTIAL,
  none: NONE,
};
const LEVEL_BG: Record<SupportLevel, string> = {
  full: FULL_BG,
  partial: PARTIAL_BG,
  none: NONE_BG,
};

const DIM = '#64748b';
const TEXT = '#172033';
const MUTED = '#334155';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';
const SELECT_BG = '#eff6ff';
const SELECT_BORDER = '#93c5fd';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

function cell(profile: PointProfile, target: TargetPlatform): Cell {
  return target === 'Android' ? profile.android : profile.ios;
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

  let current: ExampleArgs = { point: 'core:tray', target: 'iOS' };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const profile = PROFILES[current.point];
    const mobileCell = cell(profile, current.target);

    // ── 左栏:能力点清单 ────────────────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('能力点清单', 24, 24);
    ctx.fillStyle = MUTED;
    ctx.font = `11px ${SANS}`;
    ctx.fillText(`色点 = ${current.target} 支持级别`, 110, 24);

    const panelBottom = height - 30;
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, 24, 34, 332, panelBottom - 34, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();

    let ly = 54;
    for (const group of GROUPS) {
      ctx.fillStyle = DIM;
      ctx.font = `600 10px ${SANS}`;
      ctx.fillText(group.name, 36, ly);
      ly += 18;
      for (const point of group.points) {
        const selected = point === current.point;
        const rowLevel = cell(PROFILES[point], current.target).level;
        if (selected) {
          ctx.fillStyle = SELECT_BG;
          roundRect(ctx, 30, ly - 12, 320, 18, 4);
          ctx.fill();
          ctx.strokeStyle = SELECT_BORDER;
          ctx.stroke();
        }
        ctx.fillStyle = LEVEL_COLOR[rowLevel];
        ctx.beginPath();
        ctx.arc(42, ly - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = selected ? TEXT : MUTED;
        ctx.font = `10.5px ${MONO}`;
        ctx.fillText(point, 52, ly);
        ctx.fillStyle = LEVEL_COLOR[rowLevel];
        ctx.font = `10px ${SANS}`;
        const tick = LEVEL_TICK[rowLevel];
        ctx.fillText(tick, 344 - ctx.measureText(tick).width, ly);
        ly += 18;
      }
      ly += 4;
    }

    // ── 右栏:能力点判定 ────────────────────────────────────
    const rx = 396;
    const rw = width - rx - 24;

    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('能力点判定', rx, 24);

    // 选中能力点。
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, rx, 34, rw, 48, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.font = `600 12.5px ${SANS}`;
    ctx.fillText(profile.label, rx + 12, 54);
    ctx.fillStyle = DIM;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(current.point, rx + 12, 72);

    // 两行支持徽标:桌面 / 目标平台。
    let by = 96;
    const rows: Array<{ name: string; cell: Cell }> = [
      { name: '桌面', cell: profile.desktop },
      { name: current.target, cell: mobileCell },
    ];
    for (const row of rows) {
      const word = LEVEL_WORD[row.cell.level];
      ctx.fillStyle = LEVEL_BG[row.cell.level];
      roundRect(ctx, rx, by, 64, 22, 5);
      ctx.fill();
      ctx.strokeStyle = LEVEL_COLOR[row.cell.level];
      ctx.stroke();
      ctx.fillStyle = LEVEL_COLOR[row.cell.level];
      ctx.font = `600 11px ${SANS}`;
      ctx.fillText(word, rx + 32 - ctx.measureText(word).width / 2, by + 15);

      ctx.fillStyle = DIM;
      ctx.font = `600 10px ${SANS}`;
      ctx.fillText(row.name, rx + 74, by + 9);
      ctx.fillStyle = MUTED;
      ctx.font = `11px ${SANS}`;
      row.cell.note.forEach((line, index) => {
        ctx.fillText(line, rx + 74, by + 24 + index * 14);
      });

      by += 26 + row.cell.note.length * 14 + 6;
    }

    // 迁移对策。
    ctx.strokeStyle = BOX_BORDER;
    ctx.beginPath();
    ctx.moveTo(rx, by);
    ctx.lineTo(rx + rw, by);
    ctx.stroke();
    by += 16;
    ctx.fillStyle = DIM;
    ctx.font = `600 10px ${SANS}`;
    ctx.fillText('迁移对策', rx, by);
    by += 16;
    ctx.fillStyle = TEXT;
    ctx.font = `11px ${SANS}`;
    for (const line of profile.strategy) {
      ctx.fillText(line, rx, by);
      by += 15;
    }

    // 依据。
    ctx.fillStyle = DIM;
    ctx.font = `10px ${SANS}`;
    ctx.fillText(`依据:${profile.basis}`, rx, height - 30);

    emit({
      point: current.point,
      target: current.target,
      verdict: `${LEVEL_WORD[mobileCell.level]} · ${profile.short}`,
      strategy: profile.strategy.join(' '),
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
