/**
 * 范例介绍:对比同一个键(CmdOrCtrl+Shift+P)作为菜单加速键与全局快捷键的触发条件。
 * 输入:Controls 的「应用聚焦」与「全局快捷键注册状态」;主要操作是点击「按下 / 松开」模拟一次按键。
 * 预期结果:加速键只在应用聚焦时发出 MenuEvent;全局快捷键在已注册时无论聚焦与否都发出
 *          ShortcutEvent(state 为 Pressed / Released);被其他应用占用时不触发,未注册时无事件。
 * 阅读主线:keyDown / keyUp 分别对应正文的 MenuEvent 与 ShortcutEvent 两条通道;
 *          真实运行验证步骤见课程目录 runtime-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type GlobalState = 'unregistered' | 'registered' | 'taken';

export interface ShortcutArgs {
  /** 我们的应用是否处于前台聚焦 */
  appFocused: boolean;
  /** 全局快捷键注册状态 */
  globalState: GlobalState;
}

export interface ShortcutSnapshot {
  accelerator: string;
  global: string;
  keyLine: string;
}

export interface ShortcutInstance {
  update(options: ShortcutArgs): void;
  dispose(): void;
}

interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'down' | 'up';
}

const SHORTCUT_TEXT = 'CmdOrCtrl+Shift+P';
const GLOBAL_TEXT: Record<GlobalState, string> = {
  unregistered: '未注册',
  registered: '已注册',
  taken: '已被其他应用占用',
};

export function createShortcuts(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShortcutSnapshot) => void,
): ShortcutInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ShortcutArgs = { appFocused: true, globalState: 'registered' };
  let keyDown = false;
  let pressedOnce = false;
  let snapshot: ShortcutSnapshot = {
    accelerator: '尚未按键',
    global: '尚未按键',
    keyLine: '尚无按键',
  };
  let hits: HitArea[] = [];
  let hoverKey = '';

  // 对应菜单加速键:应用聚焦时由菜单系统处理,单次触发,没有按下/松开之分
  function acceleratorLine(): string {
    if (!pressedOnce) {
      return '尚未按键';
    }
    return options.appFocused
      ? 'MenuEvent id="show-palette" → 打开命令面板'
      : '未触发 — 应用不在前台,菜单系统不处理';
  }

  // 对应 global-shortcut 插件:已注册则任何前台下都触发,事件带 state
  function globalLine(): string {
    if (options.globalState !== 'registered') {
      return options.globalState === 'taken'
        ? '被占用 — handler 不会触发,换更独特的组合'
        : '未注册 — 无事件,先 register()';
    }
    if (keyDown) {
      return 'ShortcutEvent state="Pressed"';
    }
    return pressedOnce
      ? 'ShortcutEvent state="Released"'
      : '已注册,等待按键';
  }

  function keyDownNow() {
    keyDown = true;
    pressedOnce = true;
    snapshot = {
      accelerator: acceleratorLine(),
      global: globalLine(),
      keyLine: `${SHORTCUT_TEXT}(按住)`,
    };
    draw();
  }

  function keyUpNow() {
    keyDown = false;
    pressedOnce = true;
    snapshot = {
      accelerator: acceleratorLine(),
      global: globalLine(),
      keyLine: `${SHORTCUT_TEXT} 已松开`,
    };
    draw();
  }

  function hitAt(x: number, y: number): HitArea | undefined {
    return hits.find(
      (h) =>
        x >= h.x && x <= h.x + h.width && y >= h.y && y <= h.y + h.height,
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

  function drawAppWindow(x: number, y: number, w: number, h: number) {
    drawingContext.save();
    if (!options.appFocused) {
      drawingContext.globalAlpha = 0.75;
    }
    roundRect(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = options.appFocused ? '#4f7cff' : '#cbd5e1';
    drawingContext.lineWidth = options.appFocused ? 2 : 1;
    drawingContext.stroke();
    drawingContext.lineWidth = 1;

    drawingContext.fillStyle = '#eef2f8';
    drawingContext.fillRect(x + 1, y + 1, w - 2, 26);
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('tauri-app', x + 10, y + 17);

    // 菜单栏:命令面板项挂着加速键
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('视图', x + 10, y + 44);
    drawingContext.fillStyle = '#172033';
    drawingContext.fillText('显示命令面板', x + 46, y + 44);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(SHORTCUT_TEXT, x + 146, y + 44);
    drawingContext.restore();

    if (options.appFocused) {
      drawingContext.fillStyle = '#1d3fae';
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('聚焦中(前台)', x + 10, y + h - 12);
    } else {
      drawingContext.fillStyle = '#64748b';
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('在后台(被其他应用遮挡)', x + 10, y + h - 12);
    }
  }

  function drawOtherApp(x: number, y: number, w: number, h: number) {
    roundRect(x, y, w, h, 8);
    drawingContext.save();
    drawingContext.shadowColor = 'rgba(15, 23, 42, 0.2)';
    drawingContext.shadowBlur = 12;
    drawingContext.fillStyle = '#f1f5f9';
    drawingContext.fill();
    drawingContext.restore();
    drawingContext.strokeStyle = '#94a3b8';
    drawingContext.stroke();

    drawingContext.fillStyle = '#334155';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('其他应用(前台)', x + 10, y + 20);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '全局快捷键在这里按下也能触发我们的 handler',
      x + 10,
      y + 42,
    );
  }

  function drawDesktop(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#e6ecf6';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.strokeStyle = '#d3ddf0';
    drawingContext.stroke();

    drawAppWindow(x + 16, y + 16, w - 32, h - 32);
    if (!options.appFocused) {
      drawOtherApp(x + w / 2 - 40, y + h / 2 - 46, w / 2 + 24, h / 2 + 24);
    }
  }

  function drawButton(
    x: number,
    y: number,
    w: number,
    action: 'down' | 'up',
    text: string,
    color: string,
  ) {
    const h = 32;
    roundRect(x, y, w, h, 7);
    drawingContext.fillStyle = hoverKey === action ? '#3b62e0' : color;
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(text, x + w / 2, y + h / 2 + 4);
    drawingContext.textAlign = 'left';
    hits.push({ x, y, width: w, height: h, action });
  }

  function drawPanel(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('按键的两条通道', x, y + 14);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `同一组合 ${SHORTCUT_TEXT}:加速键挂在菜单项上,`,
      x,
      y + 32,
    );
    drawingContext.fillText(
      `全局快捷键由 global-shortcut 插件注册(${GLOBAL_TEXT[options.globalState]})。`,
      x,
      y + 48,
    );

    drawButton(x, y + 64, w / 2 - 6, 'down', `按下 ${SHORTCUT_TEXT}`, '#4f7cff');
    drawButton(x + w / 2 + 6, y + 64, w / 2 - 6, 'up', '松开', '#334155');

    const rows: Array<[string, string]> = [
      ['菜单加速键', snapshot.accelerator],
      ['全局快捷键', snapshot.global],
      ['当前按键', snapshot.keyLine],
    ];
    let rowY = y + 116;
    rows.forEach(([label, value]) => {
      drawingContext.fillStyle = '#5d6b82';
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, x, rowY);
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(
        value.length > 40 ? `${value.slice(0, 39)}…` : value,
        x,
        rowY + 16,
      );
      rowY += 36;
    });

    const both =
      options.appFocused &&
      options.globalState === 'registered' &&
      keyDown;
    if (both) {
      drawingContext.fillStyle = '#b45309';
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '两条通道同时触发:同一按键可能双通道命中,注意去重',
        x,
        rowY + 2,
      );
    }
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
    const areaTop = 44;
    const areaBottom = height - 16;
    drawDesktop(12, areaTop, mid - 40, areaBottom - areaTop);
    drawPanel(mid - 12, areaTop, width - mid - 2, areaBottom - areaTop);

    emit(snapshot);
  }

  function handleMove(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    const key = hit ? hit.action : '';
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (key !== hoverKey) {
      hoverKey = key;
      draw();
    }
  }

  function handleClick(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    if (!hit) {
      return;
    }
    if (hit.action === 'down') {
      keyDownNow();
    } else {
      keyUpNow();
    }
  }

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      options = next;
      draw();
    },
    dispose() {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
    },
  };
}
