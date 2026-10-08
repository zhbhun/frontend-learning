/**
 * 范例介绍:演示应用菜单的构建,以及一次菜单点击怎样变成两条响应通道上的事件。
 * 输入:Controls 的「顶层结构」决定菜单栏按 macOS 规则分组为子菜单,还是平铺顶层普通项。
 * 主要操作:直接点击菜单栏标题展开下拉菜单,再点击其中的菜单项。
 * 预期结果:启用的 MenuItem / CheckMenuItem 点击后发出 MenuEvent,action 与 on_menu_event
 *          两条读数同时给出 id;禁用项与分隔线不产生事件;预定义项没有菜单事件、行为由系统执行;
 *          勾选项点击后状态自动翻转;平铺模式下顶层普通项被 macOS 忽略。
 * 阅读主线:点击 → handleClick → runChannels 对应正文的「响应菜单点击」;菜单数据对应五类成员速查表;
 *          真实运行验证步骤见课程目录 runtime-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TopLevel = 'submenus' | 'flat';

export interface ExampleArgs {
  topLevel: TopLevel;
}

export interface ExampleSnapshot {
  menuEvent: string;
  action: string;
  rustHandler: string;
  special: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

type ItemKind = 'MenuItem' | 'CheckMenuItem' | 'PredefinedMenuItem' | 'Separator';

interface DemoItem {
  kind: ItemKind;
  text: string;
  id?: string;
  accelerator?: string;
  enabled?: boolean;
  checked?: boolean;
  predefined?: string;
  note?: string;
}

// 菜单数据:对应正文「五类成员速查表」的四种叶子成员 + 分隔线
const FILE_ITEMS: DemoItem[] = [
  { kind: 'MenuItem', id: 'open', text: '打开…', accelerator: 'CmdOrCtrl+O' },
  { kind: 'MenuItem', id: 'export-pdf', text: '导出 PDF…', enabled: false },
  { kind: 'Separator', text: '' },
  {
    kind: 'CheckMenuItem',
    id: 'auto-save',
    text: '自动保存',
    checked: true,
    accelerator: 'CmdOrCtrl+S',
  },
  { kind: 'PredefinedMenuItem', text: '退出 Tauri', predefined: 'Quit', note: '结束应用进程' },
];

const EDIT_ITEMS: DemoItem[] = [
  { kind: 'PredefinedMenuItem', text: '复制', predefined: 'Copy', note: '作用于聚焦的文本框' },
  { kind: 'PredefinedMenuItem', text: '全选', predefined: 'SelectAll', note: '作用于聚焦的文本框' },
  { kind: 'Separator', text: '' },
  { kind: 'MenuItem', id: 'find', text: '查找…', accelerator: 'CmdOrCtrl+F' },
];

const SUBMENUS = [
  { key: 'file', title: '文件', items: FILE_ITEMS },
  { key: 'edit', title: '编辑', items: EDIT_ITEMS },
] as const;

const KIND_LABEL: Record<ItemKind, string> = {
  MenuItem: 'MenuItem',
  CheckMenuItem: 'CheckMenuItem',
  PredefinedMenuItem: 'PredefinedMenuItem',
  Separator: 'Separator',
};

interface HitArea {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'title' | 'item' | 'ghost';
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

  let options: ExampleArgs = { topLevel: 'submenus' };
  let openMenu: 'file' | 'edit' | null = 'file';
  let snapshot: ExampleSnapshot = {
    menuEvent: '尚无点击:展开子菜单后点击一个启用的菜单项',
    action: '—',
    rustHandler: '—',
    special: '—',
  };
  let hits: HitArea[] = [];
  let hoverKey = '';

  // 对应一次真实的菜单项激活:点击 → MenuEvent → 两条通道
  function runChannels(item: DemoItem) {
    if (item.kind === 'Separator') {
      snapshot = {
        menuEvent: '无 — 分隔线不可点击',
        action: '—',
        rustHandler: '—',
        special: '—',
      };
      return;
    }
    if (item.kind === 'PredefinedMenuItem') {
      snapshot = {
        menuEvent: '无 — 预定义项由系统执行',
        action: '未绑定 action:预定义项没有菜单事件',
        rustHandler: '—',
        special: `系统行为:${item.note ?? '由操作系统实现'}`,
      };
      return;
    }
    if (item.enabled === false) {
      snapshot = {
        menuEvent: '无 — 禁用项不产生事件',
        action: '—',
        rustHandler: '—',
        special: 'setEnabled(true) 可恢复点击',
      };
      return;
    }

    // 勾选项点击后由菜单自动翻转 checked,再发出事件
    const flipped =
      item.kind === 'CheckMenuItem'
        ? (item.checked = !item.checked)
        : undefined;

    snapshot = {
      menuEvent: `id="${item.id}" · ${KIND_LABEL[item.kind]}`,
      action: `action("${item.id}") → 前端逻辑`,
      rustHandler: `event.id() = "${item.id}" → 执行 "${item.id}" 分支`,
      special:
        flipped === undefined
          ? '—'
          : `自动保存:checked → ${flipped ? 'true' : 'false'}(点击自动翻转)`,
    };
  }

  function clickItem(item: DemoItem) {
    runChannels(item);
    draw();
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

  function drawMenuWindow(x: number, y: number, w: number, h: number) {
    // 应用窗口:菜单栏属于窗口(Windows/Linux)或屏幕顶部(macOS)
    roundRect(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.stroke();

    const barHeight = 28;
    drawingContext.fillStyle = '#eef2f8';
    drawingContext.fillRect(x + 1, y + 1, w - 2, barHeight);

    if (options.topLevel === 'flat') {
      // macOS 规则:顶层普通项被忽略——不渲染、点击无事件
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('打开…  自动保存(顶层普通项,被忽略)', x + 14, y + 19);
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font =
        '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText('macOS:顶层只允许 Submenu', x + 14, y + barHeight + 24);
      drawingContext.fillStyle = '#64748b';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '换成子菜单分组后,这些项必须放进 Submenu 才会生效。',
        x + 14,
        y + barHeight + 44,
      );
      return;
    }

    let titleX = x + 12;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    SUBMENUS.forEach((submenu) => {
      const titleWidth =
        drawingContext.measureText(submenu.title).width + 20;
      const active = openMenu === submenu.key;
      if (active) {
        drawingContext.fillStyle = '#dbe7ff';
        drawingContext.fillRect(titleX - 4, y + 4, titleWidth, barHeight - 8);
      }
      drawingContext.fillStyle = '#172033';
      drawingContext.fillText(submenu.title, titleX + 4, y + 18);
      hits.push({
        x: titleX - 4,
        y: y + 4,
        width: titleWidth,
        height: barHeight - 8,
        action: 'title',
        key: submenu.key,
      });
      titleX += titleWidth + 8;
    });

    if (openMenu) {
      const submenu = SUBMENUS.find((s) => s.key === openMenu)!;
      const origin = SUBMENUS.findIndex((s) => s.key === openMenu);
      const offsetX =
        x + 12 +
        SUBMENUS.slice(0, origin).reduce((acc, s) => {
          return acc + drawingContext.measureText(s.title).width + 28;
        }, 0);
      const itemHeight = 26;
      const dropdownHeight =
        submenu.items.length * itemHeight + 10;

      drawingContext.save();
      drawingContext.shadowColor = 'rgba(15, 23, 42, 0.18)';
      drawingContext.shadowBlur = 10;
      roundRect(offsetX, y + barHeight, 208, dropdownHeight, 6);
      drawingContext.fillStyle = '#ffffff';
      drawingContext.fill();
      drawingContext.restore();
      drawingContext.strokeStyle = '#dbe3f0';
      drawingContext.stroke();

      let itemY = y + barHeight + 5;
      submenu.items.forEach((item) => {
        if (item.kind === 'Separator') {
          drawingContext.strokeStyle = '#e2e8f0';
          drawingContext.beginPath();
          drawingContext.moveTo(offsetX + 8, itemY + itemHeight / 2);
          drawingContext.lineTo(offsetX + 200, itemY + itemHeight / 2);
          drawingContext.stroke();
        } else {
          const disabled = item.enabled === false;
          drawingContext.fillStyle = disabled ? '#a8b3c4' : '#172033';
          drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';

          const check =
            item.kind === 'CheckMenuItem' ? (item.checked ? '✓ ' : '  ') : '';
          drawingContext.fillText(check + item.text, offsetX + 10, itemY + 17);

          if (item.accelerator) {
            drawingContext.fillStyle = '#64748b';
            drawingContext.font =
              '11px ui-monospace, SFMono-Regular, Menlo, monospace';
            drawingContext.fillText(item.accelerator, offsetX + 110, itemY + 17);
          } else if (item.kind === 'PredefinedMenuItem') {
            drawingContext.fillStyle = '#8a97ab';
            drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
            drawingContext.fillText('系统', offsetX + 168, itemY + 17);
          }

          hits.push({
            x: offsetX + 6,
            y: itemY,
            width: 196,
            height: itemHeight,
            action: 'item',
            key: item.text,
          });
        }
        itemY += item.kind === 'Separator' ? 10 : itemHeight;
      });
    }

    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '编辑区:文本类操作(复制 / 全选)作用于这里的聚焦输入',
      x + 14,
      y + h - 16,
    );
  }

  function drawChannelRow(
    x: number,
    y: number,
    w: number,
    label: string,
    value: string,
    highlight: boolean,
  ) {
    roundRect(x, y, w, 40, 6);
    drawingContext.fillStyle = highlight ? '#eef4ff' : '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = highlight ? '#4f7cff' : '#dbe3f0';
    drawingContext.stroke();

    drawingContext.fillStyle = '#5d6b82';
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, x + 10, y + 16);

    drawingContext.fillStyle = highlight ? '#1d3fae' : '#475569';
    drawingContext.font =
      '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      value.length > 46 ? `${value.slice(0, 45)}…` : value,
      x + 10,
      y + 32,
    );
  }

  function drawPanel(x: number, y: number, w: number, h: number) {
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一次点击 → 两条响应通道', x, y + 14);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '菜单活在 Rust 侧;点击发出带 id 的 MenuEvent',
      x,
      y + 32,
    );

    drawChannelRow(x, y + 44, w, 'MenuEvent(共同事件)', snapshot.menuEvent, true);
    drawChannelRow(x, y + 92, w, 'action(id) · 前端', snapshot.action, true);
    drawChannelRow(x, y + 140, w, 'on_menu_event · Rust', snapshot.rustHandler, true);

    roundRect(x, y + 188, w, 52, 6);
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.stroke();
    drawingContext.fillStyle = '#5d6b82';
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('勾选 / 系统行为', x + 10, y + 206);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      snapshot.special.length > 40
        ? `${snapshot.special.slice(0, 39)}…`
        : snapshot.special,
      x + 10,
      y + 224,
    );

    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('点击空白处收起菜单', x, y + h - 8);
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
    const mid = Math.round(width * 0.56);
    const areaTop = 44;
    const areaBottom = height - 16;
    drawMenuWindow(12, areaTop, mid - 40, areaBottom - areaTop);
    drawPanel(mid - 12, areaTop, width - mid - 2, areaBottom - areaTop);

    emit(snapshot);
  }

  function handleMove(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    const key = hit ? `${hit.action}:${hit.key}` : '';
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (key !== hoverKey) {
      hoverKey = key;
      draw();
    }
  }

  function handleClick(event: MouseEvent) {
    const hit = hitAt(event.offsetX, event.offsetY);
    if (!hit) {
      openMenu = null;
      draw();
      return;
    }
    if (hit.action === 'title') {
      openMenu = openMenu === (hit.key as 'file' | 'edit') ? null : (hit.key as 'file' | 'edit');
      draw();
      return;
    }
    if (hit.action === 'item' && openMenu) {
      const submenu = SUBMENUS.find((s) => s.key === openMenu)!;
      const item = submenu.items.find((i) => i.text === hit.key);
      if (item) {
        clickItem(item);
      }
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
