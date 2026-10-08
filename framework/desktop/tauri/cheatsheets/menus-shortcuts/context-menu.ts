/**
 * 范例介绍:演示上下文菜单如何替换 WebView 自带的右键菜单,以及 popup() 的行为边界。
 * 输入:Controls 的「拦截 contextmenu」与「调用 menu.popup()」两个开关。
 * 主要操作:在左侧文字卡片上右键;弹出自定义菜单后再点击菜单项。
 * 预期结果:两个开关都打开时弹出自定义 Menu,且 popup() 在菜单显示时就 resolve(未等选择);
 *          只拦截不弹菜单 → 右键无反应;不拦截 → WebView 默认菜单照常(此处用模拟示意)。
 * 阅读主线:handleContext 对应正文「上下文菜单」的 contextmenu + preventDefault + popup 链路;
 *          真实运行验证步骤见课程目录 runtime-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ContextArgs {
  /** 是否绑定 contextmenu 监听并调用 preventDefault() */
  intercept: boolean;
  /** 监听回调里是否调用 menu.popup() */
  popup: boolean;
}

export interface ContextSnapshot {
  domEvent: string;
  preventDefault: string;
  popupCall: string;
  shown: string;
  itemClick: string;
}

export interface ContextInstance {
  update(options: ContextArgs): void;
  dispose(): void;
}

interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
  menu: 'custom' | 'default';
  label: string;
}

// 自定义上下文菜单:预定义项与普通项可以混用
const CUSTOM_ITEMS = [
  { kind: 'PredefinedMenuItem', text: '复制', id: null },
  { kind: 'Separator', text: '', id: null },
  { kind: 'MenuItem', text: '打开链接', id: 'open-link' },
  { kind: 'MenuItem', text: '在文件夹中显示', id: 'reveal' },
] as const;

// WebView 默认菜单示意(真实浏览器里由 WebView 自己渲染)
const DEFAULT_ITEMS = ['返回', '重新加载', '另存为…', '检查'];

interface PopupState {
  x: number;
  y: number;
  which: 'custom' | 'default';
}

export function createContextMenu(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ContextSnapshot) => void,
): ContextInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ContextArgs = { intercept: true, popup: true };
  let popup: PopupState | null = null;
  let snapshot: ContextSnapshot = {
    domEvent: '在左侧文字上右键',
    preventDefault: '—',
    popupCall: '—',
    shown: '无',
    itemClick: '—',
  };
  let hits: HitArea[] = [];
  let hoverKey = '';
  let area = { x: 0, y: 0, width: 0, height: 0 };

  function apply(args: ContextArgs, x: number, y: number) {
    const inside =
      x >= area.x &&
      x <= area.x + area.width &&
      y >= area.y &&
      y <= area.y + area.height;
    if (!inside) {
      return;
    }

    snapshot = {
      domEvent: `contextmenu(${Math.round(x)}, ${Math.round(y)})`,
      preventDefault: args.intercept
        ? '已调用 — WebView 默认菜单被拦'
        : '未调用(未绑定监听)',
      popupCall: args.intercept && args.popup
        ? '已调用 · promise 已 resolve(显示即返回,未等选择)'
        : args.intercept
          ? '监听内未调用 popup()'
          : '未调用 — 没有监听执行',
      shown:
        args.intercept && args.popup
          ? '自定义 Menu(复制 / 打开链接 / 在文件夹中显示)'
          : args.intercept
            ? '无 — 只拦截不弹,右键没有反应'
            : 'WebView 默认菜单(模拟示意)',
      itemClick: '—',
    };

    popup =
      args.intercept && args.popup
        ? { x, y, which: 'custom' }
        : !args.intercept
          ? { x, y, which: 'default' }
          : null;
  }

  function clickPopupItem(hit: HitArea) {
    if (hit.menu === 'custom') {
      const item = CUSTOM_ITEMS.find((i) => i.text === hit.label);
      if (item?.id) {
        snapshot = { ...snapshot, itemClick: `action("${item.id}") → 执行命令` };
      } else {
        snapshot = {
          ...snapshot,
          itemClick: '复制是预定义项:系统执行,没有菜单事件',
        };
      }
    } else {
      snapshot = {
        ...snapshot,
        itemClick: 'WebView 默认菜单项:由 WebView 处理,无 MenuEvent',
      };
    }
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

  function drawWebviewArea(x: number, y: number, w: number, h: number) {
    area = { x, y, width: w, height: h };
    roundRect(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.stroke();

    drawingContext.fillStyle = '#eef2f8';
    drawingContext.fillRect(x + 1, y + 1, w - 2, 24);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('WebView(右键这段文字)', x + 10, y + 16);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('页面内容区', x + 16, y + 56);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      'document 上监听 contextmenu 并 preventDefault,',
      x + 16,
      y + 80,
    );
    drawingContext.fillText(
      '再对同一个 Menu 调用 popup(),就能接管右键。',
      x + 16,
      y + 100,
    );
  }

  function drawMenu(
    state: PopupState,
    items: Array<{ text: string; meta?: string; disabled?: boolean }>,
    which: 'custom' | 'default',
  ) {
    const width = 196;
    const itemHeight = 24;
    const height =
      items.length * itemHeight + (which === 'default' ? 26 : 10);
    // 菜单贴着鼠标弹出,越界时向内收
    const x = Math.min(state.x, area.x + area.width - width - 8);
    const y = Math.min(state.y, area.y + area.height - height - 8);

    drawingContext.save();
    drawingContext.shadowColor = 'rgba(15, 23, 42, 0.18)';
    drawingContext.shadowBlur = 10;
    roundRect(x, y, width, height, 6);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.restore();
    drawingContext.strokeStyle = which === 'default' ? '#b9c5d8' : '#dbe3f0';
    drawingContext.stroke();

    if (which === 'default') {
      drawingContext.fillStyle = '#8a97ab';
      drawingContext.font = '10px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('模拟:WebView 默认菜单', x + 10, y + 13);
    }

    let itemY = y + (which === 'default' ? 24 : 5);
    items.forEach((item) => {
      if (item.text === '') {
        drawingContext.strokeStyle = '#e2e8f0';
        drawingContext.beginPath();
        drawingContext.moveTo(x + 8, itemY + itemHeight / 2 - 6);
        drawingContext.lineTo(x + width - 8, itemY + itemHeight / 2 - 6);
        drawingContext.stroke();
      } else {
        drawingContext.fillStyle =
          item.disabled ?? false ? '#a8b3c4' : '#172033';
        drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(item.text, x + 10, itemY + 15);

        if (hoverKey === `${which}:${item.text}`) {
          drawingContext.fillStyle = 'rgba(79, 124, 255, 0.12)';
          drawingContext.fillRect(x + 4, itemY - 1, width - 8, itemHeight - 2);
          drawingContext.fillStyle =
            item.disabled ?? false ? '#a8b3c4' : '#172033';
          drawingContext.fillText(item.text, x + 10, itemY + 15);
        }
        if (item.meta) {
          drawingContext.fillStyle = '#8a97ab';
          drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
          drawingContext.fillText(item.meta, x + 140, itemY + 15);
        }
        hits.push({
          x,
          y: itemY - 1,
          width,
          height: itemHeight - 2,
          menu: which,
          label: item.text,
        });
      }
      itemY += item.text === '' ? 12 : itemHeight;
    });
  }

  function drawPanel(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('右键链路', x, y + 14);

    const rows: Array<[string, string, string]> = [
      ['DOM 事件', snapshot.domEvent, '#172033'],
      ['preventDefault', snapshot.preventDefault, '#172033'],
      ['menu.popup()', snapshot.popupCall, '#172033'],
      ['当前弹出', snapshot.shown, '#172033'],
      ['菜单点击', snapshot.itemClick, '#475569'],
    ];
    let rowY = y + 34;
    rows.forEach(([label, value, color]) => {
      drawingContext.fillStyle = '#5d6b82';
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, x, rowY);
      drawingContext.fillStyle = color;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const lines = wrapText(value, w - 8);
      drawingContext.fillText(lines[0] ?? '', x, rowY + 15);
      if (lines[1]) {
        drawingContext.fillText(lines[1], x, rowY + 29);
        rowY += 14;
      }
      rowY += 34;
    });

    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('左键点击空白处收起菜单', x, y + h - 8);
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      if (line && drawingContext.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    lines.push(line);
    return lines;
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
    drawWebviewArea(12, areaTop, mid - 40, areaBottom - areaTop);
    drawPanel(mid - 12, areaTop, width - mid - 2, areaBottom - areaTop);

    if (popup?.which === 'custom') {
      drawMenu(
        popup,
        CUSTOM_ITEMS.map((item) => ({
          text: item.text,
          meta: item.kind === 'PredefinedMenuItem' ? '系统' : undefined,
        })),
        'custom',
      );
    } else if (popup?.which === 'default') {
      drawMenu(
        popup,
        DEFAULT_ITEMS.map((text) => ({ text })),
        'default',
      );
    }

    emit(snapshot);
  }

  function handleMove(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    const key = hit ? `${hit.menu}:${hit.label}` : '';
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (key !== hoverKey) {
      hoverKey = key;
      draw();
    }
  }

  function handleClick(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    if (!hit) {
      popup = null;
      draw();
      return;
    }
    clickPopupItem(hit);
    draw();
  }

  function handleContext(event: MouseEvent) {
    // 页面卫生:总是拦掉浏览器自己的菜单,避免盖住演示画面;
    // 演示语义由 args 决定——未拦截时用模拟菜单示意 WebView 默认行为
    event.preventDefault();
    apply(options, event.offsetX, event.offsetY);
    draw();
  }

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('contextmenu', handleContext);
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      options = next;
      popup = null;
      draw();
    },
    dispose() {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContext);
      resizeObserver.disconnect();
    },
  };
}
