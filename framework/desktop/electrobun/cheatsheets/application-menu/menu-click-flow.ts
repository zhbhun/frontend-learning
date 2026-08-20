/**
 * 演示内容：应用菜单点击的判定链——菜单项挂 role 时由原生层直接执行（自动绑定系统
 * 快捷键，不回 JS）；挂 action 时触发 application-menu-clicked 事件，载荷
 * e.data = { id?, action, data? } 送回主进程；enabled 为 false 的项忽略点击；divider 只分隔。
 * 输入：menuPreset（edit-roles 角色菜单 / custom-actions 自定义项菜单）。
 * 操作：点击菜单栏标题展开下拉，再点击菜单项查看判定结果。
 * 预期结果：底部面板与读数显示所点项的配置、判定路径与事件载荷——role 项显示
 * 「原生执行、无事件」，action 项显示 e.data 载荷，禁用项显示「忽略」。真实原生
 * 菜单行为以课程目录的 application-menu-bar.ts 桌面范例为准。
 * 阅读主线：dispatchClick() 是唯一判定逻辑（对应 1.18.1 包内 menuConfigWithDefaults
 * 的 role/action 互斥与 applicationMenuHandler 的事件载荷），draw() 只负责呈现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type MenuPreset = 'edit-roles' | 'custom-actions';

export interface MenuClickFlowOptions {
  menuPreset: MenuPreset;
}

export interface MenuClickFlowSnapshot {
  clicked: string;
  dispatch: string;
  payload: string;
}

export interface MenuClickFlowInstance {
  update(options: MenuClickFlowOptions): void;
  dispose(): void;
}

interface SchematicItem {
  label: string;
  role?: string;
  action?: string;
  data?: unknown;
  accelerator?: string;
  enabled?: boolean;
  checked?: boolean;
  divider?: boolean;
}

interface SchematicMenu {
  title: string;
  items: SchematicItem[];
}

interface ClickOutcome {
  clicked: string;
  dispatch: string;
  payload: string;
}

interface HitTarget {
  area: 'bar' | 'item' | 'outside';
  index: number;
}

const BAR_HEIGHT = 34;
const ITEM_HEIGHT = 26;
const DROPDOWN_WIDTH = 250;
const PANEL_HEIGHT = 104;

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  barBg: '#e8edf5',
  barBorder: '#cbd5e1',
  menuBg: '#ffffff',
  menuBorder: '#94a3b8',
  hoverSoft: 'rgba(79, 124, 255, 0.16)',
  accent: '#4f7cff',
  panelBg: '#f6f8fb',
  panelBorder: '#cbd5e1',
};

// 只标注文档明确举例的角色快捷键（quit=⌘Q、copy=⌘C、paste=⌘V），其余角色不臆造。
const ROLE_SHORTCUTS: Record<string, string> = {
  quit: '⌘Q',
  copy: '⌘C',
  paste: '⌘V',
};

// preset 1：系统行为全部挂 role，点击在原生层执行、不回 JS（标签取自 roleLabelMap）。
const EDIT_ROLES_MENUS: SchematicMenu[] = [
  {
    title: 'Electrobun',
    items: [
      { label: 'Quit', role: 'quit' },
      { label: '', divider: true },
      { label: 'Hide', role: 'hide' },
      { label: 'Hide Others', role: 'hideOthers' },
      { label: 'Show All', role: 'showAll' },
    ],
  },
  {
    title: 'File',
    items: [
      { label: 'Close', role: 'close' },
      { label: 'Minimize', role: 'minimize' },
      { label: 'Zoom', role: 'zoom' },
    ],
  },
  {
    title: 'Edit',
    items: [
      { label: 'Undo', role: 'undo' },
      { label: 'Redo', role: 'redo' },
      { label: '', divider: true },
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' },
      { label: 'Delete', role: 'delete' },
      { label: '', divider: true },
      { label: 'Select All', role: 'selectAll' },
    ],
  },
];

// preset 2：自定义命令挂 action（可带 data / accelerator / checked / enabled）。
// accelerator 's' 按 macOS 默认修饰键显示为 ⌘S（Windows 为 Ctrl+S）。
const CUSTOM_ACTIONS_MENUS: SchematicMenu[] = [
  {
    title: 'Electrobun',
    items: [{ label: 'Quit', role: 'quit' }],
  },
  {
    title: 'File',
    items: [
      {
        label: '保存项目',
        action: 'save-project',
        accelerator: 's',
        data: { projectId: 42 },
      },
      { label: '导出 PDF', action: 'export-pdf', data: { format: 'pdf' } },
      { label: '', divider: true },
      { label: '自动保存', action: 'toggle-autosave', checked: true },
      { label: '关闭但不保存', action: 'close-unsaved', enabled: false },
    ],
  },
];

const IDLE_OUTCOME: ClickOutcome = {
  clicked: '未点击',
  dispatch: '点击菜单栏标题展开下拉，再点菜单项',
  payload: '—',
};

// 判定链：对应 1.18.1 包内 menuConfigWithDefaults（role/action 互斥、enabled 显式 false）
// 与 applicationMenuHandler（action 项还原载荷后发 application-menu-clicked）。
function dispatchClick(item: SchematicItem): ClickOutcome {
  if (item.divider) {
    return {
      clicked: 'divider（分隔线）',
      dispatch: '分隔线不可点击',
      payload: '—',
    };
  }

  const tag = item.role ? `role: "${item.role}"` : `action: "${item.action}"`;
  const clicked = `${item.label}（${tag}）`;

  if (item.enabled === false) {
    return {
      clicked,
      dispatch: '忽略：enabled 为 false，原生层渲染为禁用项',
      payload: '—',
    };
  }

  if (item.role) {
    return {
      clicked,
      dispatch: `原生执行 role: "${item.role}"，不触发事件`,
      payload: '—',
    };
  }

  const payload =
    item.data === undefined
      ? `{ action: "${item.action}" }`
      : `{ action: "${item.action}", data: ${JSON.stringify(item.data)} }`;

  return {
    clicked,
    dispatch: '触发 application-menu-clicked 事件',
    payload,
  };
}

function shortcutOf(item: SchematicItem): string {
  if (item.accelerator) {
    return `⌘${item.accelerator.toUpperCase()}`;
  }
  return item.role ? ROLE_SHORTCUTS[item.role] ?? '' : '';
}

// 面板文字按宽度断行，避免超出方框
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split('');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    if (line && context.measureText(line + token).width > maxWidth) {
      lines.push(line);
      line = token;
    } else {
      line += token;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

export function createMenuClickFlowSchematic(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MenuClickFlowSnapshot) => void,
): MenuClickFlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let preset: MenuPreset = 'edit-roles';
  let openIndex: number | null = null;
  let outcome: ClickOutcome = { ...IDLE_OUTCOME };
  let hover: HitTarget = { area: 'outside', index: -1 };

  // draw() 时重算的命中区域缓存，供点击 / 悬停命中测试使用
  let titleRects: Array<{ x: number; width: number }> = [];
  let itemRects: number[] = [];
  let dropdownX = 0;
  let dropdownY = 0;
  let dropdownH = 0;

  function menus(): SchematicMenu[] {
    return preset === 'edit-roles' ? EDIT_ROLES_MENUS : CUSTOM_ACTIONS_MENUS;
  }

  function hitTest(mx: number, my: number): HitTarget {
    if (my >= 0 && my <= BAR_HEIGHT) {
      const barIndex = titleRects.findIndex(
        (rect) => mx >= rect.x && mx <= rect.x + rect.width,
      );
      if (barIndex >= 0) {
        return { area: 'bar', index: barIndex };
      }
    }

    if (
      openIndex !== null &&
      mx >= dropdownX &&
      mx <= dropdownX + DROPDOWN_WIDTH &&
      my >= dropdownY &&
      my <= dropdownY + dropdownH
    ) {
      const rel = Math.floor((my - dropdownY - 5) / ITEM_HEIGHT);
      if (rel >= 0 && rel < itemRects.length) {
        return { area: 'item', index: rel };
      }
    }

    return { area: 'outside', index: -1 };
  }

  function itemClickable(index: number): boolean {
    if (openIndex === null) {
      return false;
    }
    const item = menus()[openIndex]?.items[index];
    return Boolean(item && !item.divider && item.enabled !== false);
  }

  function onClick(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);

    if (hit.area === 'bar') {
      openIndex = openIndex === hit.index ? null : hit.index;
      draw();
      return;
    }

    if (hit.area === 'item' && openIndex !== null) {
      const item = menus()[openIndex]?.items[hit.index];
      if (item) {
        outcome = dispatchClick(item);
        openIndex = null;
        draw();
      }
      return;
    }

    if (openIndex !== null) {
      openIndex = null;
      draw();
    }
  }

  function onPointerMove(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
    const hoverKey = `${hit.area}:${hit.index}`;

    if (`${hover.area}:${hover.index}` !== hoverKey) {
      hover = hit;
      draw();
    }

    const interactive =
      hit.area === 'bar' ||
      (hit.area === 'item' && itemClickable(hit.index));
    canvas.style.cursor = interactive ? 'pointer' : 'default';
  }

  function drawDropdown() {
    if (openIndex === null) {
      return;
    }

    const menu = menus()[openIndex];
    const titleRect = titleRects[openIndex];
    if (!menu || !titleRect) {
      return;
    }

    dropdownX = titleRect.x;
    dropdownY = BAR_HEIGHT;
    dropdownH = menu.items.length * ITEM_HEIGHT + 10;
    itemRects = [];

    // 白底下拉 + 轻阴影，悬浮于底部面板之上（与真实菜单一致）
    ctx.save();
    ctx.shadowColor = 'rgba(23, 32, 51, 0.2)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = COLORS.menuBg;
    ctx.beginPath();
    ctx.roundRect(dropdownX, dropdownY, DROPDOWN_WIDTH, dropdownH, 6);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = COLORS.menuBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(dropdownX, dropdownY, DROPDOWN_WIDTH, dropdownH, 6);
    ctx.stroke();

    menu.items.forEach((item, index) => {
      const y = dropdownY + 5 + index * ITEM_HEIGHT;
      itemRects.push(y);

      if (item.divider) {
        ctx.strokeStyle = COLORS.barBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dropdownX + 10, y + ITEM_HEIGHT / 2);
        ctx.lineTo(dropdownX + DROPDOWN_WIDTH - 10, y + ITEM_HEIGHT / 2);
        ctx.stroke();
        return;
      }

      const isHover =
        hover.area === 'item' && hover.index === index && itemClickable(index);
      if (isHover) {
        ctx.fillStyle = COLORS.hoverSoft;
        ctx.fillRect(dropdownX + 4, y, DROPDOWN_WIDTH - 8, ITEM_HEIGHT);
      }

      const label = `${item.checked ? '✓  ' : ''}${item.label}`;
      ctx.fillStyle =
        item.enabled === false ? COLORS.faint : isHover ? COLORS.heading : COLORS.muted;
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, dropdownX + 14, y + 17);

      const shortcut = shortcutOf(item);
      if (shortcut) {
        ctx.fillStyle = COLORS.faint;
        ctx.textAlign = 'right';
        ctx.fillText(shortcut, dropdownX + DROPDOWN_WIDTH - 12, y + 17);
        ctx.textAlign = 'left';
      }
    });
  }

  function drawPanel(x: number, y: number, width: number, height: number) {
    ctx.fillStyle = COLORS.panelBg;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('判定结果', x + 14, y + 20);

    const contentWidth = width - 28;
    let cursorY = y + 40;
    const lines: Array<[string, string, string]> = [
      [`项：${outcome.clicked}`, COLORS.heading, ''],
      [`判定：${outcome.dispatch}`, COLORS.muted, ''],
      [`e.data：${outcome.payload}`, outcome.payload === '—' ? COLORS.muted : COLORS.accent, 'mono'],
    ];

    for (const [text, color, style] of lines) {
      ctx.fillStyle = color;
      ctx.font =
        style === 'mono'
          ? '12px ui-monospace, SFMono-Regular, Menlo, monospace'
          : '12.5px ui-sans-serif, system-ui, sans-serif';
      for (const line of wrapText(text, contentWidth, ctx).slice(0, 2)) {
        ctx.fillText(line, x + 14, cursorY);
        cursorY += 16;
      }
    }

    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '示意复现判定链与载荷形状；真实原生菜单以 application-menu-bar.ts 桌面范例为准',
      x + 14,
      y + height - 10,
    );
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 菜单栏：每项一个标题，展开项高亮
    ctx.fillStyle = COLORS.barBg;
    ctx.fillRect(0, 0, width, BAR_HEIGHT);
    ctx.strokeStyle = COLORS.barBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BAR_HEIGHT + 0.5);
    ctx.lineTo(width, BAR_HEIGHT + 0.5);
    ctx.stroke();

    const list = menus();
    titleRects = [];
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    let titleX = 16;
    list.forEach((menu, index) => {
      const titleWidth = ctx.measureText(menu.title).width + 26;
      titleRects.push({ x: titleX, width: titleWidth });

      const isOpen = openIndex === index;
      if (isOpen) {
        ctx.fillStyle = COLORS.hoverSoft;
        ctx.fillRect(titleX, 0, titleWidth, BAR_HEIGHT);
      }
      ctx.fillStyle = isOpen ? COLORS.heading : COLORS.muted;
      ctx.fillText(menu.title, titleX + 13, BAR_HEIGHT / 2 + 4.5);
      titleX += titleWidth;
    });

    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`菜单形态: "${preset}"`, width - 14, BAR_HEIGHT / 2 + 4);
    ctx.textAlign = 'left';

    // 底部判定面板，随后画下拉使其悬浮于面板之上
    const panelY = height - PANEL_HEIGHT - 14;
    drawPanel(16, panelY, width - 32, PANEL_HEIGHT);
    drawDropdown();

    emit({
      clicked: outcome.clicked,
      dispatch: outcome.dispatch,
      payload: outcome.payload,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onPointerMove);

  return {
    update(options) {
      preset = options.menuPreset;
      openIndex = null;
      outcome = { ...IDLE_OUTCOME };
      hover = { area: 'outside', index: -1 };
      draw();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onPointerMove);
      resizeObserver.disconnect();
    },
  };
}
