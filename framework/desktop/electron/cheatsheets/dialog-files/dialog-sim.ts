/**
 * 范例介绍：模拟 macOS 风格的打开对话框，演示 filters 与 properties 怎样决定
 * 「能选什么」，以及 dialog.showOpenDialog 的 Promise 最终 resolve 出什么。
 * 输入：控件 filters（扩展名过滤）、multiSelections（可多选）、openDirectory（可选文件夹）。
 * 操作：点击文件行选择（被过滤的行置灰不可选），再点「打开」或「取消」。
 * 预期：打开 → fulfilled，结果对象带所选绝对路径；取消 → 同样 fulfilled 且
 *       { canceled: true, filePaths: [] }，不抛错；文件夹只有勾选 openDirectory 才可选。
 * 阅读主线：对话框是「选择结果」的发生地——Promise 在用户点确认 / 取消后才落定，
 *           递给应用的只有路径，不是内容。本模拟按 macOS 行为绘制，Windows/Linux 差异见正文。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FilterPreset = '文本与数据' | '图片' | '全部文件';

export interface DialogSimOptions {
  filter: FilterPreset;
  multiSelect: boolean;
  openDirectory: boolean;
}

export interface DialogSimSnapshot {
  propertiesText: string;
  promiseText: string;
  resultText: string;
  pathsText: string;
}

export interface DialogSimInstance {
  update(options: DialogSimOptions): void;
  dispose(): void;
}

// 模拟的文件清单与基准目录：真实路径由主进程的 dialog 返回，这里只造可见的候选行
const BASE_DIR = '/Users/you/Documents';

interface FakeEntry {
  name: string;
  kind: 'file' | 'folder';
  ext?: string;
}

const ENTRIES: FakeEntry[] = [
  { name: 'notes.txt', kind: 'file', ext: 'txt' },
  { name: 'config.json', kind: 'file', ext: 'json' },
  { name: 'photo.png', kind: 'file', ext: 'png' },
  { name: 'song.mp3', kind: 'file', ext: 'mp3' },
  { name: '素材', kind: 'folder' },
];

// 与控件对应的 FileFilter.extensions：扩展名不带点不带星，'*' 表示全部
const FILTER_EXTS: Record<FilterPreset, string[]> = {
  '文本与数据': ['txt', 'json'],
  '图片': ['png'],
  '全部文件': ['*'],
};

function matchesFilter(entry: FakeEntry, filter: FilterPreset): boolean {
  if (entry.kind === 'folder') {
    return true; // filters 只作用于文件，文件夹始终显示
  }
  const exts = FILTER_EXTS[filter];
  return exts.includes('*') || (entry.ext !== undefined && exts.includes(entry.ext));
}

function entryPath(entry: FakeEntry): string {
  return `${BASE_DIR}/${entry.name}`;
}

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  boxBg: '#ffffff',
  disabled: '#94a3b8',
  selectedBg: '#4f7cff',
  selectedText: '#ffffff',
  hoverBg: '#eef2ff',
  buttonBg: '#4f7cff',
  buttonHover: '#3b63e0',
  buttonIdle: '#e2e8f0',
  buttonIdleHover: '#cbd5e1',
  ok: '#15803d',
  pending: '#b45309',
  mono: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '10px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  label: '11px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
  row: '13px ui-sans-serif, system-ui, sans-serif',
  button: '600 14px ui-sans-serif, system-ui, sans-serif',
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LAYOUT = {
  title: { x: 48, y: 38 },
  pageBox: { x: 48, y: 66, width: 180, height: 120 },
  panel: { x: 260, y: 66, width: 452, height: 318 },
  rows: { x: 276, width: 420, top: 112, height: 38 },
  cancelButton: { x: 498, y: 330, width: 78, height: 32 },
  openButton: { x: 588, y: 330, width: 104, height: 32 },
  footer: { x: 48, y: 416 },
};

export function createDialogSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DialogSimSnapshot) => void,
): DialogSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: DialogSimOptions = {
    filter: '文本与数据',
    multiSelect: true,
    openDirectory: false,
  };
  let selected = new Set<number>();
  // Promise 的形态与 showOpenDialog 一致：确认 / 取消后才落定，取消不抛错
  let resolved: { canceled: boolean; paths: string[] } | null = null;
  let hoverRow = -1;
  let hoverCancel = false;
  let hoverOpen = false;

  function isSelectable(entry: FakeEntry): boolean {
    if (entry.kind === 'folder') {
      return options.openDirectory;
    }
    return matchesFilter(entry, options.filter);
  }

  function propertiesText(): string {
    const props = ['openFile'];
    if (options.openDirectory) {
      props.push('openDirectory');
    }
    if (options.multiSelect) {
      props.push('multiSelections');
    }
    return `[${props.map((p) => `'${p}'`).join(', ')}]`;
  }

  function filterLabelText(): string {
    const exts = FILTER_EXTS[options.filter];
    return `filters: ${options.filter}（${exts.join(', ')}）`;
  }

  function snapshot(): DialogSimSnapshot {
    let resultText = '—（等待用户操作）';
    let pathsText = '—';
    if (resolved) {
      if (resolved.canceled) {
        resultText = '{ canceled: true, filePaths: [] }';
        pathsText = '[]';
      } else {
        const items = resolved.paths.map((p) => `'${p}'`).join(', ');
        resultText = `{ canceled: false, filePaths: [${items}] }`;
        pathsText = resolved.paths.length > 0 ? resolved.paths.join(', ') : '[]';
      }
    }
    return {
      propertiesText: propertiesText(),
      promiseText: resolved ? 'fulfilled' : 'pending…（对话框打开中）',
      resultText,
      pathsText,
    };
  }

  function roundRect(rect: Rect, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(rect.x + radius, rect.y);
    ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
    ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
    ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
    ctx.closePath();
  }

  function drawBox(rect: Rect): void {
    ctx.fillStyle = COLORS.boxBg;
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    roundRect(rect, 8);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(): void {
    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.note;
    ctx.textAlign = 'left';
    ctx.fillText('切换控件改变 filters 与 properties，点行选择，再点「打开」或「取消」', LAYOUT.title.x, LAYOUT.title.y);
  }

  function drawPageBox(): void {
    const box = LAYOUT.pageBox;
    drawBox(box);

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.textAlign = 'left';
    ctx.fillText('渲染进程', box.x + 16, box.y + 22);

    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.mono;
    ctx.fillText('await window.dialogs', box.x + 16, box.y + 50);
    ctx.fillText('.pickFiles()', box.x + 16, box.y + 68);

    // 对话框没关闭前，渲染端的 Promise 一直 pending
    ctx.fillStyle = resolved ? COLORS.ok : COLORS.pending;
    ctx.fillText(resolved ? 'Promise: fulfilled' : 'Promise: pending…', box.x + 16, box.y + 98);
  }

  function drawIcon(x: number, y: number, entry: FakeEntry, color: string): void {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    if (entry.kind === 'folder') {
      roundRect({ x: x - 9, y: y - 6, width: 18, height: 12 }, 2);
      ctx.fill();
      ctx.fillRect(x - 9, y - 9, 8, 4);
    } else {
      ctx.strokeRect(x - 5, y - 7, 10, 14);
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 3);
      ctx.lineTo(x - 1, y - 7);
      ctx.stroke();
    }
  }

  function rowRect(index: number): Rect {
    return {
      x: LAYOUT.rows.x,
      y: LAYOUT.rows.top + index * LAYOUT.rows.height,
      width: LAYOUT.rows.width,
      height: LAYOUT.rows.height - 6,
    };
  }

  function drawRows(): void {
    ENTRIES.forEach((entry, index) => {
      const rect = rowRect(index);
      const selectable = isSelectable(entry);
      const isSelected = selected.has(index);
      const hovered = hoverRow === index && selectable;

      if (isSelected) {
        ctx.fillStyle = COLORS.selectedBg;
      } else if (hovered) {
        ctx.fillStyle = COLORS.hoverBg;
      } else {
        ctx.fillStyle = COLORS.boxBg;
      }
      roundRect(rect, 6);
      ctx.fill();
      if (!isSelected) {
        ctx.strokeStyle = COLORS.panelBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const textColor = isSelected
        ? COLORS.selectedText
        : selectable
          ? COLORS.text
          : COLORS.disabled;

      drawIcon(rect.x + 18, rect.y + rect.height / 2, entry, textColor);

      ctx.font = COLORS.row;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.fillText(entry.name, rect.x + 44, rect.y + rect.height / 2 + 5);

      if (entry.kind === 'folder') {
        ctx.font = COLORS.monoSmall;
        ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.82)' : COLORS.disabled;
        ctx.textAlign = 'right';
        ctx.fillText(
          selectable ? '文件夹 · 可选' : '文件夹 · 需 openDirectory',
          rect.x + rect.width - 14,
          rect.y + rect.height / 2 + 4,
        );
        ctx.textAlign = 'left';
      }
    });
  }

  function drawPanel(): void {
    ctx.fillStyle = COLORS.panelBg;
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    roundRect(LAYOUT.panel, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = COLORS.header;
    ctx.textAlign = 'left';
    ctx.fillText('打开', LAYOUT.panel.x + 20, LAYOUT.panel.y + 32);

    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.monoSmall;
    ctx.textAlign = 'right';
    ctx.fillText(filterLabelText(), LAYOUT.panel.x + LAYOUT.panel.width - 20, LAYOUT.panel.y + 30);
    ctx.textAlign = 'left';
  }

  function drawButton(rect: Rect, text: string, style: 'primary' | 'idle', hovered: boolean, enabled: boolean): void {
    if (!enabled) {
      ctx.fillStyle = COLORS.buttonIdle;
    } else if (style === 'primary') {
      ctx.fillStyle = hovered ? COLORS.buttonHover : COLORS.buttonBg;
    } else {
      ctx.fillStyle = hovered ? COLORS.buttonIdleHover : COLORS.buttonIdle;
    }
    roundRect(rect, 8);
    ctx.fill();

    ctx.font = COLORS.button;
    ctx.textAlign = 'center';
    ctx.fillStyle = enabled && style === 'primary' ? COLORS.selectedText : COLORS.text;
    if (!enabled) {
      ctx.fillStyle = COLORS.disabled;
    }
    ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2 + 5);
    ctx.textAlign = 'left';
  }

  function drawButtons(): void {
    drawButton(LAYOUT.cancelButton, '取消', 'idle', hoverCancel, true);
    // macOS 行为：没有选中项时确认按钮不可用
    drawButton(LAYOUT.openButton, '打开', 'primary', hoverOpen, selected.size > 0);
  }

  function drawFooter(): void {
    ctx.fillStyle = COLORS.muted;
    ctx.font = COLORS.label;
    ctx.textAlign = 'left';
    ctx.fillText(
      '置灰 = 被 filters 排除 · 文件夹需勾选 openDirectory · 本图为 macOS 行为模拟，Windows/Linux 差异见正文',
      LAYOUT.footer.x,
      LAYOUT.footer.y,
    );
  }

  function drawFrame(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = 436;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    drawTitle();
    drawPageBox();
    drawPanel();
    drawRows();
    drawButtons();
    drawFooter();

    emit(snapshot());
  }

  function pointInRect(px: number, py: number, rect: Rect): boolean {
    return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function rowAt(px: number, py: number): number {
    for (let index = 0; index < ENTRIES.length; index += 1) {
      if (pointInRect(px, py, rowRect(index))) {
        return index;
      }
    }
    return -1;
  }

  function onMouseDown(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);

    const index = rowAt(x, y);
    if (index >= 0) {
      if (isSelectable(ENTRIES[index])) {
        if (options.multiSelect) {
          if (selected.has(index)) {
            selected.delete(index);
          } else {
            selected.add(index);
          }
        } else {
          selected = new Set([index]);
        }
        // 重新选择视为新一轮操作，Promise 回到 pending
        resolved = null;
        drawFrame();
      }
      return;
    }

    if (pointInRect(x, y, LAYOUT.cancelButton)) {
      // 取消不抛错：resolve 出 canceled: true 与空数组
      resolved = { canceled: true, paths: [] };
      drawFrame();
      return;
    }

    if (pointInRect(x, y, LAYOUT.openButton) && selected.size > 0) {
      resolved = { canceled: false, paths: [...selected].map((i) => entryPath(ENTRIES[i])) };
      drawFrame();
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const index = rowAt(x, y);
    const row = index >= 0 && isSelectable(ENTRIES[index]) ? index : -1;
    const overCancel = pointInRect(x, y, LAYOUT.cancelButton);
    const overOpen = pointInRect(x, y, LAYOUT.openButton) && selected.size > 0;
    const pointer = row >= 0 || overCancel || overOpen;

    if (
      row !== hoverRow ||
      overCancel !== hoverCancel ||
      overOpen !== hoverOpen
    ) {
      hoverRow = row;
      hoverCancel = overCancel;
      hoverOpen = overOpen;
      canvas.style.cursor = pointer ? 'pointer' : 'default';
      drawFrame();
    }
  }

  function onMouseLeave(): void {
    if (hoverRow >= 0 || hoverCancel || hoverOpen) {
      hoverRow = -1;
      hoverCancel = false;
      hoverOpen = false;
      canvas.style.cursor = 'default';
      drawFrame();
    }
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  const resizeObserver = createResizeObserver(canvas, () => drawFrame());

  return {
    update(next) {
      // 切换控件视为新的前置条件：清空选择与已落定的结果
      options = next;
      selected.clear();
      resolved = null;
      hoverRow = -1;
      drawFrame();
    },
    dispose() {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      resizeObserver.disconnect();
    },
  };
}
