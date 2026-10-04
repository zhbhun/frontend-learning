/**
 * 范例介绍：演示同一组权限声明为「安装时」或「运行时」时，用户分别看到什么。
 * 输入：三个具名权限开关（storage / tabs / notifications）+ 主机权限档位 + optional 开关。
 * 操作：在 Controls 中勾选权限、切换主机档位、切换 optional。
 * 预期：左侧安装对话框实时显示警告列表（含官方吸收规则），右侧显示运行时申请面板，
 *       读数给出对应的 manifest 权限字段与摘要。
 * 阅读主线：computeDeclarations 是核心——警告文案与吸收规则都来自官方权限列表。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 主机权限档位：不声明、单站点、<all_urls>。 */
export type HostOption = 'none' | 'site' | 'all';

export interface PermissionOptions {
  tabs: boolean;
  storage: boolean;
  notifications: boolean;
  host: HostOption;
  optional: boolean;
}

export interface PermissionSnapshot {
  /** 读数 1：勾选项对应的 manifest 权限字段文本 */
  manifestKeys: string;
  /** 读数 2：安装时警告摘要 */
  installSummary: string;
  /** 读数 3：运行时可申请摘要 */
  runtimeSummary: string;
  /** 画布内部使用：安装对话框的警告列表 */
  installWarnings: string[];
  /** 画布内部使用：运行时面板的能力项 */
  runtimeItems: string[];
}

export interface PermissionInstance {
  update(options: PermissionOptions): void;
  dispose(): void;
}

interface NamedPermission {
  name: string;
  /** 官方权限列表给出的警告文案；null 表示该权限不触发警告 */
  warning: string | null;
  /** permissions 数组里写的权限字符串 */
  key: string;
}

const NAMED_PERMISSIONS: NamedPermission[] = [
  { name: 'storage', warning: null, key: 'storage' },
  { name: 'tabs', warning: 'Read your browsing history', key: 'tabs' },
  { name: 'notifications', warning: 'Display notifications', key: 'notifications' },
];

const HOST_PATTERN: Record<Exclude<HostOption, 'none'>, string> = {
  site: 'https://example.com/*',
  all: '<all_urls>',
};

const HOST_WARNING: Record<Exclude<HostOption, 'none'>, string> = {
  site: 'Read and change your data on example.com',
  all: 'Read and change all your data on all websites',
};

/** 官方吸收规则：同时请求 <all_urls> 时，tabs 的警告不再单独显示。 */
function isSuppressed(item: NamedPermission, options: PermissionOptions): boolean {
  return item.name === 'tabs' && options.host === 'all';
}

export function computeDeclarations(options: PermissionOptions): PermissionSnapshot {
  const selected = NAMED_PERMISSIONS.filter(
    (item) => options[item.name as keyof PermissionOptions] === true,
  );

  const manifestKeys = options.optional
    ? `optional_permissions: ${selected.map((i) => i.key).join(', ') || '—'} · optional_host_permissions: ${options.host === 'none' ? '—' : HOST_PATTERN[options.host]}`
    : `permissions: ${selected.map((i) => i.key).join(', ') || '—'} · host_permissions: ${options.host === 'none' ? '—' : HOST_PATTERN[options.host]}`;

  const installWarnings = options.optional
    ? []
    : [
        ...selected
          .filter((item) => item.warning !== null && !isSuppressed(item, options))
          .map((item) => item.warning as string),
        ...(options.host === 'none' ? [] : [HOST_WARNING[options.host]]),
      ];

  const runtimeItems = options.optional
    ? [
        ...selected.map((item) => item.key),
        ...(options.host === 'none' ? [] : [HOST_PATTERN[options.host]]),
      ]
    : [];

  const installSummary = options.optional
    ? '无（能力已挪至运行时申请）'
    : installWarnings.length === 0
      ? '无（不需要特殊权限）'
      : `${installWarnings.length} 条：${installWarnings.join('；')}`;

  const runtimeSummary = options.optional
    ? 'request() 在用户手势中申请'
    : '未声明可选权限（安装时已一次性授予）';

  return {
    manifestKeys,
    installSummary,
    runtimeSummary,
    installWarnings,
    runtimeItems,
  };
}

const COLORS = {
  text: '#172033',
  secondary: '#475569',
  faint: '#94a3b8',
  cardBg: '#f8fafc',
  cardBorder: '#e2e8f0',
  accent: '#4f7cff',
  warnBg: '#fef9c3',
  warnBorder: '#facc15',
  chipBg: '#e0e9ff',
  buttonBg: '#e2e8f0',
};

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = COLORS.cardBg;
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  text: string,
) {
  ctx.fillStyle = COLORS.chipBg;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#31446e';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawInstallCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  warnings: string[],
  optional: boolean,
) {
  drawCard(ctx, x, y, width, height);
  const inner = x + 18;

  ctx.fillStyle = COLORS.text;
  ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('添加“权限演示”扩展吗？', inner, y + 32);

  ctx.fillStyle = COLORS.secondary;
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(optional ? '它不需要在安装时申请权限。' : '它可以：', inner, y + 56);

  let rowY = y + 82;
  if (warnings.length === 0) {
    ctx.fillStyle = COLORS.secondary;
    ctx.fillText(optional ? '声明项将在运行时按需申请。' : '该扩展不需要特殊权限。', inner, rowY);
  } else {
    for (const warning of warnings) {
      ctx.fillStyle = COLORS.warnBg;
      ctx.strokeStyle = COLORS.warnBorder;
      ctx.beginPath();
      ctx.roundRect(inner, rowY - 16, width - 36, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#713f12';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`⚠ ${warning}`, inner + 10, rowY);
      rowY += 32;
    }
  }

  const buttonY = y + height - 46;
  ctx.fillStyle = COLORS.buttonBg;
  ctx.beginPath();
  ctx.roundRect(inner, buttonY, 110, 28, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.secondary;
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('添加扩展程序', inner + 16, buttonY + 18);
}

function drawRuntimeCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  items: string[],
  optional: boolean,
) {
  drawCard(ctx, x, y, width, height);
  const inner = x + 18;

  ctx.fillStyle = COLORS.text;
  ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('运行时申请（chrome.permissions）', inner, y + 32);

  ctx.fillStyle = COLORS.secondary;
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';

  if (!optional) {
    ctx.fillText('未声明 optional_permissions / optional_host_permissions，', inner, y + 60);
    ctx.fillText('全部能力在安装时一次性授予，运行时无需申请。', inner, y + 80);
    return;
  }

  ctx.fillText('可选声明不触发安装警告，需要时按以下方式申请：', inner, y + 60);

  let chipX = inner;
  let chipY = y + 78;
  for (const item of items) {
    // 与 drawChip 内一致的等宽字体下测量，保证芯片宽度包住文本
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const chipWidth = Math.ceil(ctx.measureText(item).width) + 24;
    if (chipX + chipWidth > x + width - 18) {
      chipX = inner;
      chipY += 36;
    }
    drawChip(ctx, chipX, chipY, chipWidth, item);
    chipX += chipWidth + 10;
  }

  const buttonY = chipY + 46;
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.roundRect(inner, buttonY, 150, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText('申请这些权限', inner + 24, buttonY + 20);

  ctx.fillStyle = COLORS.faint;
  ctx.fillText('request() 必须在用户手势（如 click）中调用；', inner, buttonY + 56);
  ctx.fillText('用户可随时在拼图菜单收回站点访问。', inner, buttonY + 74);
}

export function createPermissionExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PermissionSnapshot) => void,
): PermissionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: PermissionOptions = {
    tabs: true,
    storage: true,
    notifications: false,
    host: 'all',
    optional: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const snapshot = computeDeclarations(current);

    // 顶部：勾选项实时生成的 manifest 权限字段
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('manifest.json 权限声明', 24, 28);
    ctx.fillStyle = COLORS.secondary;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(snapshot.manifestKeys, 24, 50);

    // 左右两卡片：安装时警告 vs 运行时申请
    const cardTop = 72;
    const cardHeight = height - cardTop - 24;
    const cardWidth = (width - 24 * 3) / 2;
    drawInstallCard(ctx, 24, cardTop, cardWidth, cardHeight, snapshot.installWarnings, current.optional);
    drawRuntimeCard(ctx, 24 * 2 + cardWidth, cardTop, cardWidth, cardHeight, snapshot.runtimeItems, current.optional);

    emit(snapshot);
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
