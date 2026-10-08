/**
 * 范例介绍:模拟「关窗常驻」的状态机,对比三种关窗行为与两条拦截路线。
 * 输入:Controls 的「关窗行为」——none(不拦截)/ exit-requested(app 级
 *      RunEvent::ExitRequested 拦截)/ close-requested(窗口级 CloseRequested 拦截)。
 * 主要操作:点主窗口的关闭按钮;常驻后左键点托盘图标;右键托盘 → 菜单
 *          「退出 Tauri」;进程退出后点「重置演示」恢复初始状态。
 * 预期结果:none 下关窗即进程退出;exit-requested 下窗口销毁但进程常驻,托盘恢复
 *          会遇到 get_webview_window 为 None;close-requested 下窗口隐藏、托盘一键
 *          恢复;菜单「退出」走 code = Some(0),在任何关窗行为下都真正退出。
 * 阅读主线:closeWindow / trayLeftClick / quitApp 对应正文的「关窗常驻」;
 *          真实运行验证步骤见课程目录 runtime-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CloseBehavior = 'exit-requested' | 'close-requested' | 'none';

export interface ResidentArgs {
  closeBehavior: CloseBehavior;
}

export interface ResidentSnapshot {
  process: string;
  window: string;
  exit: string;
  tray: string;
}

export interface ResidentInstance {
  update(options: ResidentArgs): void;
  dispose(): void;
}

type WindowState = 'visible' | 'hidden' | 'destroyed';

interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'close' | 'icon' | 'item' | 'reset';
  key: string;
}

const MENU_ITEMS = [
  { id: 'show', text: '显示主窗口' },
  { id: 'quit', text: '退出 Tauri' },
];

export function createResident(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ResidentSnapshot) => void,
): ResidentInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ResidentArgs = { closeBehavior: 'exit-requested' };
  let processAlive = true;
  let windowState: WindowState = 'visible';
  let menuOpen = false;
  let hits: HitArea[] = [];
  let iconRect = { x: 0, y: 0, width: 0, height: 0 };
  let snapshot: ResidentSnapshot = {
    process: '运行中',
    window: '显示',
    exit: '—(还没关过窗口)',
    tray: '—',
  };

  function reset() {
    processAlive = true;
    windowState = 'visible';
    menuOpen = false;
    snapshot = {
      process: '运行中',
      window: '显示',
      exit: '—(还没关过窗口)',
      tray: '—',
    };
  }

  // 用户点窗口关闭按钮:三种关窗行为对应真实的三种拦截写法
  function closeWindow() {
    if (options.closeBehavior === 'none') {
      windowState = 'destroyed';
      processAlive = false;
      menuOpen = false;
      snapshot = {
        process: '已退出',
        window: '—(进程已退出)',
        exit: '无拦截:最后一个窗口关闭 → 进程退出',
        tray: '托盘已随进程消失',
      };
      return;
    }
    if (options.closeBehavior === 'exit-requested') {
      windowState = 'destroyed';
      snapshot = {
        ...snapshot,
        window: '已销毁',
        exit: 'ExitRequested { code: None } → api.prevent_exit(),进程常驻',
      };
      return;
    }
    windowState = 'hidden';
    snapshot = {
      ...snapshot,
      window: '隐藏',
      exit: 'CloseRequested → api.prevent_close() + window.hide(),窗口保留',
    };
  }

  // 常驻后点托盘左键:两条路线的窗口状态不同,恢复方式也不同
  function restoreWindow(via: 'click' | 'menu') {
    if (windowState === 'visible') {
      snapshot = {
        ...snapshot,
        tray:
          via === 'click'
            ? 'Click { Left, Up } → set_focus()(窗口已在显示)'
            : 'MenuEvent id="show" → set_focus()',
      };
      return;
    }
    if (windowState === 'hidden') {
      windowState = 'visible';
      snapshot = {
        ...snapshot,
        window: '显示',
        tray:
          via === 'click'
            ? 'Click { Left, Up } → show() + set_focus()'
            : 'MenuEvent id="show" → show() + set_focus()',
      };
      return;
    }
    snapshot = {
      ...snapshot,
      tray:
        'get_webview_window("main") = None — 窗口已销毁,需重建',
    };
  }

  // 托盘菜单「退出」:app.exit(0) 是程序化退出,code = Some(0),不被拦截
  function quitApp() {
    processAlive = false;
    menuOpen = false;
    windowState = 'destroyed';
    snapshot = {
      process: '已退出',
      window: '—(进程已退出)',
      exit: 'app.exit(0) → ExitRequested { code: Some(0) } → code.is_none() 为假,放行退出',
      tray: '托盘已随进程消失',
    };
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

  function drawWindowCard(x: number, y: number, w: number, h: number) {
    if (!processAlive || windowState === 'destroyed') {
      // 进程退出(app 级不拦 / 菜单退出)或 app 级拦截下窗口销毁:只留占位提示
      drawingContext.setLineDash([5, 4]);
      drawingContext.strokeStyle = '#b6c2d4';
      roundRect(x, y, w, h, 8);
      drawingContext.stroke();
      drawingContext.setLineDash([]);
      drawingContext.fillStyle = '#8a97ab';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        processAlive ? '窗口已销毁' : '进程已退出',
        x + w / 2 - 36,
        y + h / 2 - 10,
      );
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        processAlive ? 'app 级拦截下恢复窗口需重建' : '窗口随进程一起结束',
        x + w / 2 - 76,
        y + h / 2 + 10,
      );
      return;
    }

    drawingContext.save();
    if (windowState === 'hidden') {
      drawingContext.globalAlpha = 0.38; // 窗口级拦截:hide() 后实例还在
    }
    roundRect(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.stroke();

    // 标题栏 + 关闭按钮
    drawingContext.fillStyle = '#eef2f8';
    drawingContext.fillRect(x + 1, y + 1, w - 2, 26);
    drawingContext.fillStyle = '#e05555';
    drawingContext.beginPath();
    drawingContext.arc(x + 16, y + 14, 5, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('Tauri 应用', x + 30, y + 18);
    drawingContext.restore();

    hits.push({
      x: x + 8,
      y: y + 6,
      width: 18,
      height: 16,
      action: 'close',
      key: 'close',
    });

    drawingContext.fillStyle = windowState === 'hidden' ? '#8a97ab' : '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      windowState === 'hidden' ? '窗口已隐藏(实例仍在)' : '主窗口 main',
      x + 16,
      y + 56,
    );
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      windowState === 'hidden'
        ? 'CloseRequested 被拦下,窗口只是看不见'
        : '点左上角红点 = 用户请求关闭窗口',
      x + 16,
      y + 76,
    );
  }

  function drawTrayArea(x: number, y: number, w: number) {
    if (!processAlive) {
      drawingContext.fillStyle = '#b6c2d4';
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('进程退出,托盘图标一并消失', x, y + 16);
      return;
    }

    const barHeight = 30;
    drawingContext.fillStyle = '#eef2f8';
    drawingContext.fillRect(x, y, w, barHeight);
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.strokeRect(x + 0.5, y + 0.5, w - 1, barHeight - 1);

    const iconSize = 16;
    const iconX = x + w - 32;
    const iconY = y + (barHeight - iconSize) / 2;
    iconRect = { x: iconX, y: iconY, width: iconSize, height: iconSize };
    drawingContext.fillStyle = '#1e293b';
    roundRect(iconX, iconY, iconSize, iconSize, 4);
    drawingContext.fill();
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.font = '700 10px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.textBaseline = 'middle';
    drawingContext.fillText('T', iconX + iconSize / 2, iconY + iconSize / 2 + 1);
    drawingContext.textAlign = 'left';
    drawingContext.textBaseline = 'alphabetic';

    hits.push({
      x: iconX - 4,
      y: y + 3,
      width: iconSize + 8,
      height: barHeight - 6,
      action: 'icon',
      key: 'tray',
    });

    if (menuOpen) {
      const itemHeight = 26;
      const menuWidth = 150;
      const menuX = Math.min(x + w - menuWidth - 4, iconX - menuWidth / 2);
      const menuY = y + barHeight + 6;
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

    if (!menuOpen) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('左键托盘 = 恢复窗口;右键托盘 = 菜单', x, y + barHeight + 20);
    }
  }

  function drawStateRow(
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
    drawingContext.fillText('关窗之后发生了什么', x, y + 14);

    drawStateRow(
      x,
      y + 26,
      w,
      '进程 · 窗口',
      `${snapshot.process} · ${snapshot.window}`,
    );
    drawStateRow(x, y + 78, w, '退出 / 关闭请求', snapshot.exit);
    drawStateRow(x, y + 130, w, '托盘动作', snapshot.tray);

    // 重置按钮:进程退出后状态机无法自恢复,提供入口
    const buttonY = y + h - 34;
    roundRect(x, buttonY, 96, 26, 6);
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('重置演示', x + 18, buttonY + 18);
    hits.push({
      x,
      y: buttonY,
      width: 96,
      height: 26,
      action: 'reset',
      key: 'reset',
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(660, size.width);
    const height = Math.max(380, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    hits = [];
    const mid = Math.round(width * 0.52);
    const areaTop = 40;
    const areaBottom = height - 16;

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `关窗行为:${options.closeBehavior}(Controls 可切换)`,
      12,
      24,
    );

    drawWindowCard(12, areaTop, mid - 52, areaBottom - areaTop);
    drawTrayArea(mid - 24, areaTop, width - mid - 24);
    drawPanel(mid - 24, areaTop + 108, width - mid - 24, areaBottom - areaTop - 108);

    emit(snapshot);
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
    if (hit.action === 'reset') {
      reset();
      draw();
      return;
    }
    if (!processAlive) {
      return; // 进程退出后托盘交互不再存在
    }
    if (hit.action === 'close') {
      closeWindow();
      draw();
      return;
    }
    if (hit.action === 'item' && menuOpen) {
      if (hit.key === 'quit') {
        quitApp();
      } else {
        restoreWindow('menu');
        menuOpen = false;
      }
      draw();
      return;
    }
    // 左键托盘图标:关闭托盘模拟里左键固定走 on_tray_icon_event 恢复窗口
    menuOpen = false;
    restoreWindow('click');
    draw();
  }

  function handleContextMenu(event: MouseEvent) {
    const inIcon =
      event.offsetX >= iconRect.x - 4 &&
      event.offsetX <= iconRect.x + iconRect.width + 4 &&
      event.offsetY >= iconRect.y - 4 &&
      event.offsetY <= iconRect.y + iconRect.height + 4;
    if (!processAlive || !inIcon) {
      return;
    }
    event.preventDefault();
    menuOpen = true;
    draw();
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      options = next;
      draw();
    },
    dispose() {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      resizeObserver.disconnect();
    },
  };
}
