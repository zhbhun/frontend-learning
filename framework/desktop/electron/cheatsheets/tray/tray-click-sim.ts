/**
 * 范例介绍：模拟三个平台上托盘图标的点按行为——设置 setContextMenu 之后，
 * 点按会发生什么、click 事件还触不触发（真实 Electron 无法在浏览器运行，
 * 本模拟复现官方文档行为与通行行为；真实环境的核对方式见正文快速上手）。
 *
 * 输入与前置状态：控件「平台」选择 macOS / Windows / Linux；控件
 * 「setContextMenu 已设置」决定是否给托盘挂了菜单——它是点按行为分化的开关。
 * 主要操作：左键 / 右键点击画布中的托盘图标（圆环）。
 * 预期结果：macOS 有菜单时任何点按都弹菜单、click 不再触发；Windows 菜单
 * 只在右键弹出、左键仍触发 click；Linux 交互以菜单为中心，click 是“激活”，
 * 触发方式由桌面环境决定。
 * 阅读主线：先在 macOS 上对比有菜单 / 无菜单的左键结果，再切到 Windows、
 * Linux 用同样的点按对照三平台差异。
 */

export type TrayPlatform = 'macOS' | 'Windows' | 'Linux';

export interface TrayClickSimOptions {
  platform: TrayPlatform;
  hasMenu: boolean;
}

export interface TrayClickSimSnapshot {
  formText: string;
  lastClick: string;
}

export interface TrayClickSimInstance {
  update(options: TrayClickSimOptions): void;
  dispose(): void;
}

// 布局常量：状态条在顶部，托盘条居中，菜单面板挂在图标下方
const BAR_H = 44;
const BAR_TOP = 96;
const ICON_R = 13;
const MENU_W = 200;
const MENU_ITEM_H = 30;
const HIT_R = ICON_R + 6;
const INITIAL_CLICK = '点击画布中的托盘图标（左键 / 右键）';

const MENU_ITEMS = ['显示主窗口', '暂停任务', '退出'];

interface ClickOutcome {
  menuOpen: boolean;
  text: string;
}

export function createTrayClickSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TrayClickSimSnapshot) => void,
): TrayClickSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let platform: TrayPlatform = 'macOS';
  let hasMenu = true;
  let lastClick = INITIAL_CLICK;
  let menuOpen = false;
  let hovered = false;

  function iconCenter(): { x: number; y: number } {
    const width = canvas.clientWidth || 640;
    // macOS 托盘在菜单栏右端，Windows / Linux 在通知区，模拟里都放右端
    return { x: width - 44, y: BAR_TOP + BAR_H / 2 };
  }

  // 依据官方文档行为与通行行为给出点按结果
  function outcome(button: 'left' | 'right'): ClickOutcome {
    const which = button === 'left' ? '左键' : '右键';
    if (platform === 'macOS') {
      if (hasMenu) {
        return {
          menuOpen: true,
          text: `${which} → 菜单弹出：点按被菜单接管，mouse-up 明文不再触发，click 同样不触发`,
        };
      }
      if (button === 'left') {
        return { menuOpen: false, text: '左键 → click 事件触发（没有设置菜单，菜单不弹）' };
      }
      return {
        menuOpen: false,
        text: '右键 → right-click 事件触发（仅 macOS / Windows 有此事件）',
      };
    }
    if (platform === 'Windows') {
      if (hasMenu && button === 'right') {
        return { menuOpen: true, text: '右键 → 菜单弹出：Windows 只把右键交给菜单' };
      }
      if (button === 'left') {
        return { menuOpen: false, text: '左键 → click 事件触发（左键不弹菜单）' };
      }
      return {
        menuOpen: false,
        text: '右键 → right-click 事件触发；没有设置菜单，不弹任何东西',
      };
    }
    // Linux：托盘经 StatusNotifierItem 呈现，点按被抽象成“激活”
    if (hasMenu) {
      if (button === 'left') {
        return {
          menuOpen: true,
          text: '左键 → 菜单弹出；click 是否同时触发取决于桌面环境的激活方式（单击 / 双击）',
        };
      }
      return {
        menuOpen: true,
        text: '右键 → 菜单弹出（Linux 没有独立的 right-click 事件）',
      };
    }
    if (button === 'left') {
      return {
        menuOpen: false,
        text: '左键 → 可能触发 click（激活）；没有菜单时图标几乎无法交互',
      };
    }
    return { menuOpen: false, text: '右键 → 无反应：Linux 没有 right-click 事件，也没有菜单' };
  }

  function snapshot(): TrayClickSimSnapshot {
    const menuText = hasMenu ? '已 setContextMenu' : '未设置菜单';
    return { formText: `${platform} · ${menuText}`, lastClick };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  function wrapText(text: string, maxWidth: number): string[] {
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

  function drawBar(width: number): void {
    const dark = platform === 'macOS';
    ctx.fillStyle = dark ? '#22262f' : '#eef1f6';
    ctx.fillRect(0, BAR_TOP, width, BAR_H);
    ctx.strokeStyle = dark ? 'rgba(0, 0, 0, 0.4)' : '#d5dce8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BAR_TOP + BAR_H);
    ctx.lineTo(width, BAR_TOP + BAR_H);
    ctx.stroke();

    // 状态条里放几个占位符号，营造真实菜单栏 / 通知区
    ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.35)' : '#9aa7ba';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    const deco = dark ? '⌘ ◐ ▤' : '▦ 🔊 ▲';
    ctx.textAlign = 'left';
    ctx.fillText(deco, 24, BAR_TOP + BAR_H / 2);
    ctx.fillText(dark ? '菜单栏（深 / 浅色自动反色）' : '通知区', 90, BAR_TOP + BAR_H / 2);
  }

  function drawIcon(): void {
    const { x, y } = iconCenter();
    const dark = platform === 'macOS';
    if (hovered) {
      ctx.fillStyle = platform === 'macOS' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(79, 124, 255, 0.14)';
      ctx.beginPath();
      ctx.arc(x, y, HIT_R, 0, Math.PI * 2);
      ctx.fill();
    }
    // 圆环图标：macOS 模拟模板图（单色自适应），其余平台用彩色图
    ctx.fillStyle = dark ? '#e8ecf4' : '#4f7cff';
    ctx.beginPath();
    ctx.arc(x, y, ICON_R - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, (ICON_R - 1) * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawMenu(): void {
    const { x } = iconCenter();
    const top = BAR_TOP + BAR_H + 6;
    const height = MENU_ITEMS.length * MENU_ITEM_H + 8;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x - MENU_W, top, MENU_W, height, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - MENU_W, top, MENU_W, height, 8);
    ctx.stroke();

    ctx.fillStyle = '#172033';
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    MENU_ITEMS.forEach((item, index) => {
      ctx.fillText(item, x - MENU_W + 16, top + 12 + index * MENU_ITEM_H + MENU_ITEM_H / 2);
    });
  }

  function draw(): void {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 360;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'middle';

    // 顶部标题行：托盘形态
    ctx.textAlign = 'left';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('托盘形态', 20, 28);
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#172033';
    ctx.fillText(snapshot().formText, 90, 28);

    drawBar(width);
    drawIcon();
    if (menuOpen) {
      drawMenu();
    }

    // 点按结果：菜单面板下方
    ctx.textAlign = 'left';
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    const textTop = BAR_TOP + BAR_H + (menuOpen ? MENU_ITEMS.length * MENU_ITEM_H + 26 : 22);
    const lines = wrapText(lastClick, width - 40);
    lines.forEach((line, index) => {
      ctx.fillStyle = index === 0 ? '#172033' : '#334155';
      ctx.fillText(line, 20, textTop + index * 20);
    });

    // 操作提示：右下角（避开左下角读数区）
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('左键点击图标 = 用户左键 · 右键点击图标 = 用户右键', width - 20, height - 20);
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function hitIcon(x: number, y: number): boolean {
    const { x: cx, y: cy } = iconCenter();
    return Math.hypot(x - cx, y - cy) <= HIT_R;
  }

  function onClick(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    if (!hitIcon(x, y)) {
      return;
    }
    const result = outcome('left');
    menuOpen = result.menuOpen;
    lastClick = result.text;
    refresh();
  }

  function onContextMenu(event: MouseEvent): void {
    event.preventDefault(); // 浏览器默认右键菜单一律拦下
    const { x, y } = canvasPoint(event);
    if (!hitIcon(x, y)) {
      return;
    }
    const result = outcome('right');
    menuOpen = result.menuOpen;
    lastClick = result.text;
    refresh();
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const over = hitIcon(x, y);
    if (over !== hovered) {
      hovered = over;
      draw();
    }
    canvas.style.cursor = over ? 'pointer' : 'default';
  }

  function onMouseLeave(): void {
    if (hovered) {
      hovered = false;
      draw();
    }
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    update(options) {
      platform = options.platform;
      hasMenu = options.hasMenu;
      lastClick = INITIAL_CLICK;
      menuOpen = false;
      hovered = false;
      refresh();
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
