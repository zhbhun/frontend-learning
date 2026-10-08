/**
 * 范例介绍:模拟托盘区的交互,展示一次悬停 / 点击怎样变成两条通道上的读数。
 * 输入:Controls 的「左键弹菜单」对应 showMenuOnLeftClick(默认 true);
 *      「平台」切换 macOS 与 Linux 对托盘事件的支持差异。
 * 主要操作:把鼠标移到托盘图标上再移开;左键 / 右键点击托盘图标;
 *          点击弹出菜单里的菜单项。
 * 预期结果:悬停产生 Enter → Move → Leave;左键产生 Click { button, button_state },
 *          是否弹菜单由 showMenuOnLeftClick 决定;菜单项点击给出 MenuEvent id 与
 *          两条响应通道;Linux 不发出任何托盘事件,菜单仍由系统弹出。
 * 阅读主线:handleMove / handleClick / runMenuEvent 对应正文的「托盘事件」「托盘菜单」;
 *          真实运行验证步骤见课程目录 runtime-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type Platform = 'macos' | 'linux';

export interface ExampleArgs {
  showMenuOnLeftClick: boolean;
  platform: Platform;
}

export interface ExampleSnapshot {
  trayEvent: string;
  menuEvent: string;
  handler: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

interface DemoMenuItem {
  id: string;
  text: string;
  handler: string;
}

const MENU_ITEMS: DemoMenuItem[] = [
  { id: 'show', text: '显示主窗口', handler: 'on_menu_event → show() + set_focus()' },
  { id: 'quit', text: '退出 Tauri', handler: 'on_menu_event → app.exit(0)' },
];

interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'icon' | 'item';
  key: string;
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

  let options: ExampleArgs = { showMenuOnLeftClick: true, platform: 'macos' };
  let pointerOnIcon = false;
  let menuOpen = false;
  let hits: HitArea[] = [];
  let iconRect = { x: 0, y: 0, width: 0, height: 0 };
  let snapshot: ExampleSnapshot = {
    trayEvent: '—(悬停或点击托盘图标)',
    menuEvent: '—(点开托盘菜单)',
    handler: '—',
  };

  // 托盘事件读数:Linux 不发出 TrayIconEvent,读数固定为提示文案
  function pushTrayEvent(text: string) {
    snapshot = {
      ...snapshot,
      trayEvent:
        options.platform === 'linux' ? '未发出 — Linux 不发出托盘事件' : text,
    };
  }

  // 对应一次真实的托盘菜单点击:MenuEvent → on_menu_event / action 两条通道
  function runMenuEvent(item: DemoMenuItem) {
    snapshot = {
      ...snapshot,
      menuEvent: `id="${item.id}"`,
      handler: `action("${item.id}") · ${item.handler}`,
    };
  }

  function inIconArea(x: number, y: number): boolean {
    return (
      x >= iconRect.x - 4 &&
      x <= iconRect.x + iconRect.width + 4 &&
      y >= iconRect.y - 4 &&
      y <= iconRect.y + iconRect.height + 4
    );
  }

  function hitAt(x: number, y: number): HitArea | undefined {
    return hits.find(
      (area) =>
        x >= area.x &&
        x <= area.x + area.width &&
        y >= area.y &&
        y <= area.y + area.height,
    );
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function drawTrayIcon(x: number, y: number, size: number) {
    drawingContext.fillStyle = options.platform === 'linux' ? '#334155' : '#1e293b';
    roundRect(x, y, size, size, 4);
    drawingContext.fill();
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.font = `700 ${Math.round(size * 0.62)}px ui-sans-serif, system-ui, sans-serif`;
    drawingContext.textAlign = 'center';
    drawingContext.textBaseline = 'middle';
    drawingContext.fillText('T', x + size / 2, y + size / 2 + 1);
    drawingContext.textAlign = 'left';
    drawingContext.textBaseline = 'alphabetic';
  }

  function drawMenubar(x: number, y: number, w: number) {
    const barHeight = 30;
    drawingContext.fillStyle = '#eef2f8';
    drawingContext.fillRect(x, y, w, barHeight);
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.strokeRect(x + 0.5, y + 0.5, w - 1, barHeight - 1);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('Tauri', x + 14, y + 19);

    // 托盘图标固定在菜单栏右端,与时钟相邻
    const iconSize = 16;
    const iconX = x + w - 92;
    const iconY = y + (barHeight - iconSize) / 2;
    iconRect = { x: iconX, y: iconY, width: iconSize, height: iconSize };
    drawTrayIcon(iconX, iconY, iconSize);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('10:24', x + w - 56, y + 19);

    hits.push({
      x: iconX - 4,
      y: y + 3,
      width: iconSize + 8,
      height: barHeight - 6,
      action: 'icon',
      key: 'tray',
    });
  }

  function drawMenu() {
    const itemHeight = 26;
    const menuWidth = 168;
    const menuX = Math.max(20, iconRect.x - menuWidth / 2);
    const menuY = iconRect.y + iconRect.height + 8;
    const menuHeight = MENU_ITEMS.length * itemHeight + 10;

    drawingContext.save();
    drawingContext.shadowColor = 'rgba(15, 23, 42, 0.18)';
    drawingContext.shadowBlur = 10;
    roundRect(menuX, menuY, menuWidth, menuHeight, 6);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.restore();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.stroke();

    let itemY = menuY + 5;
    MENU_ITEMS.forEach((item) => {
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(item.text, menuX + 12, itemY + 17);
      hits.push({
        x: menuX + 6,
        y: itemY,
        width: menuWidth - 12,
        height: itemHeight,
        action: 'item',
        key: item.id,
      });
      itemY += itemHeight;
    });
  }

  function drawTooltip() {
    if (!pointerOnIcon || options.platform === 'linux') {
      return; // tooltip 在 Linux 不支持
    }
    const text = 'Tauri 托盘';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    const textWidth = drawingContext.measureText(text).width;
    const tipX = iconRect.x + iconRect.width / 2 - textWidth / 2 - 8;
    const tipY = iconRect.y - 32;
    roundRect(tipX, tipY, textWidth + 16, 22, 4);
    drawingContext.fillStyle = '#172033';
    drawingContext.fill();
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fillText(text, tipX + 8, tipY + 15);
  }

  function drawChannelRow(
    x: number,
    y: number,
    w: number,
    label: string,
    value: string,
  ) {
    roundRect(x, y, w, 44, 6);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.stroke();

    drawingContext.fillStyle = '#5d6b82';
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, x + 10, y + 17);

    drawingContext.fillStyle = '#1d3fae';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      value.length > 44 ? `${value.slice(0, 43)}…` : value,
      x + 10,
      y + 34,
    );
  }

  function drawPanel(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一次交互 → 两条响应通道', x, y + 14);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '托盘事件走 TrayIconEvent,菜单点击走 MenuEvent',
      x,
      y + 32,
    );

    drawChannelRow(x, y + 44, w, 'TrayIconEvent(图标自身)', snapshot.trayEvent);
    drawChannelRow(x, y + 96, w, '托盘菜单 MenuEvent', snapshot.menuEvent);
    drawChannelRow(x, y + 148, w, '响应通道 action · on_menu_event', snapshot.handler);

    roundRect(x, y + 200, w, 44, 6);
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.stroke();
    drawingContext.fillStyle = '#5d6b82';
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('平台提示', x + 10, y + 216);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      options.platform === 'linux'
        ? 'Linux:托盘事件不发出;菜单弹出由系统处理'
        : 'macOS / Windows:悬停与点击均发出事件',
      x + 10,
      y + 234,
    );
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(620, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    hits = [];
    const mid = Math.round(width * 0.55);
    const areaTop = 40;
    const areaBottom = height - 16;
    const leftWidth = mid - 40;

    drawMenubar(12, areaTop, leftWidth);
    if (menuOpen) {
      drawMenu();
    }
    drawTooltip();

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '操作托盘图标:悬停 / 左键 / 右键(平台行为不同)',
      12,
      areaTop + 120,
    );
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `showMenuOnLeftClick = ${options.showMenuOnLeftClick}(Linux 不支持此设置)`,
      12,
      areaTop + 142,
    );

    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '点击空白处收起菜单;面板读数见右侧',
      12,
      areaBottom - 8,
    );

    drawPanel(mid - 12, areaTop, width - mid + 2, areaBottom - areaTop);

    emit(snapshot);
  }

  function handleMove(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    canvas.style.cursor = hit ? 'pointer' : 'default';

    const onIcon = inIconArea(event.offsetX, event.offsetY);
    if (onIcon && !pointerOnIcon) {
      pointerOnIcon = true;
      pushTrayEvent('Enter { position, rect }');
      draw(); // tooltip 出现需要重绘
    } else if (onIcon && pointerOnIcon) {
      pushTrayEvent('Move { position, rect }');
      emit(snapshot); // 布局不变,只刷读数
    } else if (!onIcon && pointerOnIcon) {
      pointerOnIcon = false;
      pushTrayEvent('Leave { position, rect }');
      draw();
    }
  }

  function handleClick(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    if (!hit) {
      if (menuOpen) {
        menuOpen = false;
        draw();
      }
      return;
    }
    if (hit.action === 'item' && menuOpen) {
      const item = MENU_ITEMS.find((candidate) => candidate.id === hit.key);
      if (item) {
        runMenuEvent(item);
        menuOpen = false;
        draw();
      }
      return;
    }
    // 点击托盘图标
    if (options.platform === 'linux') {
      // Linux:事件不发出,菜单弹出由系统处理(左键右键都弹)
      menuOpen = true;
      draw();
      return;
    }
    pushTrayEvent('Click { button: Left, button_state: Up }');
    // showMenuOnLeftClick 决定左键是否弹菜单;右键永远弹
    menuOpen = options.showMenuOnLeftClick;
    draw();
  }

  function handleContextMenu(event: MouseEvent) {
    if (!inIconArea(event.offsetX, event.offsetY)) {
      return; // 只接管托盘图标上的右键
    }
    event.preventDefault(); // 不拦,浏览器默认菜单会盖住托盘菜单
    pushTrayEvent('Click { button: Right, button_state: Up }');
    menuOpen = true;
    draw();
  }

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      const prevPlatform = options.platform;
      options = next;
      if (next.platform === 'linux') {
        snapshot = {
          ...snapshot,
          trayEvent: '未发出 — Linux 不发出托盘事件',
        };
      } else if (prevPlatform === 'linux') {
        // 切回 macos 时清掉 Linux 提示文案,避免残留误导
        snapshot = {
          ...snapshot,
          trayEvent: '—(悬停或点击托盘图标)',
        };
      }
      draw();
    },
    dispose() {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      resizeObserver.disconnect();
    },
  };
}
