/**
 * 范例介绍：模拟 Menu.buildFromTemplate 的模板规则——模板数组如何决定
 * 菜单的结构与行为（真实 Electron 无法在浏览器运行，本模拟复现官方文档
 * 规则；真实环境的核对方式见正文快速上手）。
 *
 * 输入与前置状态：一份子菜单模板（左区代码）；控件「平台」决定 role 项
 * 显示哪套快捷键（CommandOrControl 的解析结果）；控件「radio 组插分隔线」
 * 在「中字号」与「大字号」之间插入 { type: 'separator' }。
 * 主要操作：点击右侧菜单里的菜单项。
 * 预期结果：role 项自带标签与快捷键；radio 点击后同组互斥——同一层、
 * 中间没有被分隔线隔开的 radio 才算同组；checkbox 每次点击翻转选中。
 * 阅读主线：先点 radio 项看全组互斥，再打开「radio 组插分隔线」点
 * 「大字号」，观察互斥范围被分隔线断开。
 */

export type MenuPlatform = 'macOS' | 'Windows';

export interface MenuTemplateSimOptions {
  platform: MenuPlatform;
  separatorInRadio: boolean;
}

export interface MenuTemplateSimSnapshot {
  platformText: string;
  lastEvent: string;
}

export interface MenuTemplateSimInstance {
  update(options: MenuTemplateSimOptions): void;
  dispose(): void;
}

type Item =
  | { kind: 'role'; label: string; accelerator: string; code: string }
  | { kind: 'separator'; code: string }
  | { kind: 'radio'; label: string; code: string }
  | { kind: 'checkbox'; label: string; code: string };

// 布局常量：菜单行高与面板宽度，左区代码行与右区菜单行一一对齐
const ITEM_H = 28;
const PANEL_W = 240;
const CODE_X = 20;
const ROW_TOP = 56;
const TITLE_Y = 36;

const INITIAL_EVENT = '点击右侧菜单项，对照左侧模板';
const INITIAL_CHECKED: Record<string, boolean> = {
  小字号: true,
  中字号: false,
  大字号: false,
  自动换行: false,
};

function pointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

export function createMenuTemplateSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MenuTemplateSimSnapshot) => void,
): MenuTemplateSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let platform: MenuPlatform = 'macOS';
  let separatorInRadio = false;
  let lastEvent = INITIAL_EVENT;
  // 选中状态存在「菜单项实例」上（对应真实 MenuItem.checked），重建模板时不丢
  const checked: Record<string, boolean> = { ...INITIAL_CHECKED };

  let items: Item[] = [];
  let hoverIndex: number | null = null;
  let panelX = 0;
  let panelY = ROW_TOP;
  let panelBottom = ROW_TOP;

  function buildItems(): void {
    const radioCode = (label: string, initialChecked: boolean) =>
      initialChecked
        ? `{ type: 'radio', label: '${label}', checked: true },`
        : `{ type: 'radio', label: '${label}' },`;

    items = [
      {
        kind: 'role',
        label: '复制',
        accelerator: platform === 'macOS' ? '⌘C' : 'Ctrl+C',
        code: "{ role: 'copy' },",
      },
      { kind: 'separator', code: "{ type: 'separator' }," },
      { kind: 'radio', label: '小字号', code: radioCode('小字号', true) },
      { kind: 'radio', label: '中字号', code: radioCode('中字号', false) },
      ...(separatorInRadio
        ? [{ kind: 'separator' as const, code: "{ type: 'separator' }," }]
        : []),
      { kind: 'radio', label: '大字号', code: radioCode('大字号', false) },
      { kind: 'separator', code: "{ type: 'separator' }," },
      {
        kind: 'checkbox',
        label: '自动换行',
        code: "{ type: 'checkbox', label: '自动换行' },",
      },
    ];
  }

  function platformText(): string {
    return platform === 'macOS' ? 'macOS → ⌘ Cmd' : 'Windows → Ctrl';
  }

  function snapshot(): MenuTemplateSimSnapshot {
    return { platformText: platformText(), lastEvent };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  function rowCenterY(index: number): number {
    return panelY + index * ITEM_H + ITEM_H / 2;
  }

  function hitRowIndex(px: number, py: number): number | null {
    if (!pointInRect(px, py, panelX, panelY, PANEL_W, items.length * ITEM_H)) {
      return null;
    }
    const index = Math.floor((py - panelY) / ITEM_H);
    const item = items[index];
    // separator 只分组，不响应点击
    if (!item || item.kind === 'separator') {
      return null;
    }
    return index;
  }

  // radio 同组 = 同一层、相邻且中间没有被分隔线隔开的连续 radio 项
  function radioGroup(index: number): number[] {
    const group: number[] = [];
    let i = index;
    while (i >= 0 && items[i].kind === 'radio') {
      group.unshift(i);
      i -= 1;
    }
    i = index + 1;
    while (i < items.length && items[i].kind === 'radio') {
      group.push(i);
      i += 1;
    }
    return group;
  }

  function onClickItem(index: number): void {
    const item = items[index];
    if (item.kind === 'role') {
      lastEvent = `「${item.label}」→ 执行 role 内建行为（指定 role 时 click 被忽略）`;
      return;
    }
    if (item.kind === 'radio') {
      const group = radioGroup(index);
      const others = group
        .filter((i) => i !== index)
        .map((i) => `「${(items[i] as { label: string }).label}」`);
      group.forEach((i) => {
        const radio = items[i] as { kind: 'radio'; label: string };
        checked[radio.label] = i === index;
      });
      lastEvent =
        others.length > 0
          ? `「${item.label}」→ checked，同组互斥：${others.join('')} 熄灭`
          : `「${item.label}」→ checked，同组无其他项：分隔线断开了两组`;
      return;
    }
    if (item.kind === 'checkbox') {
      const before = checked[item.label];
      checked[item.label] = !before;
      lastEvent = `「${item.label}」checked: ${before} → ${!before}`;
    }
  }

  function draw(): void {
    const size = { width: canvas.clientWidth || 640, height: canvas.clientHeight || 360 };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, size.width, size.height);

    // 面板靠右放，窄画布时保底不越过右缘
    panelX = Math.max((size.width + 40) / 2, size.width - PANEL_W - 20);
    panelY = ROW_TOP;
    panelBottom = panelY + items.length * ITEM_H;

    // 区块标题
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('模板 template', CODE_X, TITLE_Y);
    ctx.fillText('构建出的菜单 menu', panelX, TITLE_Y);

    // 左区：模板代码，逐行与右侧菜单项对齐
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    items.forEach((item, index) => {
      ctx.fillStyle = item.kind === 'separator' ? '#94a3b8' : '#475569';
      ctx.fillText(item.code, CODE_X, rowCenterY(index));
    });
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('// checked 是初始状态；点击后的状态存在 MenuItem 实例上', CODE_X, panelBottom + 18);

    // 右区：面板
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, PANEL_W, items.length * ITEM_H, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, PANEL_W, items.length * ITEM_H, 8);
    ctx.stroke();

    items.forEach((item, index) => {
      const cy = rowCenterY(index);
      if (item.kind === 'separator') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(panelX + 10, cy);
        ctx.lineTo(panelX + PANEL_W - 10, cy);
        ctx.stroke();
        return;
      }

      // 悬停高亮行（真实菜单的 hover 行为）
      if (hoverIndex === index) {
        ctx.fillStyle = '#eef2f8';
        ctx.beginPath();
        ctx.roundRect(panelX + 4, panelY + index * ITEM_H + 2, PANEL_W - 8, ITEM_H - 4, 5);
        ctx.fill();
      }

      // 选中件：radio 圆点 / checkbox 方框勾选
      let isChecked = false;
      if (item.kind === 'radio' || item.kind === 'checkbox') {
        isChecked = checked[item.label] === true;
      }
      if (item.kind === 'radio') {
        ctx.beginPath();
        ctx.arc(panelX + 24, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isChecked ? '#4f7cff' : '#94a3b8';
        ctx.stroke();
        if (isChecked) {
          ctx.beginPath();
          ctx.arc(panelX + 24, cy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#4f7cff';
          ctx.fill();
        }
      }
      if (item.kind === 'checkbox') {
        ctx.beginPath();
        ctx.roundRect(panelX + 18, cy - 6.5, 13, 13, 3);
        ctx.fillStyle = isChecked ? '#4f7cff' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isChecked ? '#4f7cff' : '#94a3b8';
        ctx.stroke();
        if (isChecked) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(panelX + 21, cy + 0.5);
          ctx.lineTo(panelX + 23.5, cy + 3);
          ctx.lineTo(panelX + 28, cy - 3);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }

      ctx.fillStyle = '#172033';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(item.label, panelX + 40, cy);

      if (item.kind === 'role') {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(item.accelerator, panelX + PANEL_W - 14, cy);
        ctx.textAlign = 'left';
      }
    });
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function onClick(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const index = hitRowIndex(x, y);
    if (index === null) {
      return;
    }
    onClickItem(index);
    refresh();
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const index = hitRowIndex(x, y);
    if (index !== hoverIndex) {
      hoverIndex = index;
      draw();
    }
    canvas.style.cursor = index !== null ? 'pointer' : 'default';
  }

  function onMouseLeave(): void {
    if (hoverIndex !== null) {
      hoverIndex = null;
      draw();
    }
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  buildItems();

  return {
    update(options) {
      platform = options.platform;
      separatorInRadio = options.separatorInRadio;
      lastEvent = INITIAL_EVENT;
      hoverIndex = null;
      buildItems();
      refresh();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
