/**
 * 演示实现：把过滤后的快捷键分组绘制成多栏速查表。
 * 输入或前置状态：Controls 的「分组过滤」（多选组名，默认全选）。
 * 主要操作：勾选/取消分组，画布立即按所选分组重排。
 * 预期结果：画布只显示所选分组；readout 显示过滤后的分组数与条数；全部取消时画布给出提示。
 * 阅读主线：filterShortcutGroups 产出条目序列，本文件负责分栏布局与 Canvas 2D 绘制。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';
import {
  SHORTCUT_GROUPS,
  filterShortcutGroups,
  type ShortcutGroup,
  type ShortcutItem,
} from './shortcut-groups';

export interface ShortcutTableOptions {
  groups: string[];
}

export interface ShortcutTableSnapshot {
  totalGroups: number;
  visibleGroups: number;
  visibleItems: number;
}

export interface ShortcutTableInstance {
  update(options: ShortcutTableOptions): void;
  dispose(): void;
}

type Entry =
  | { kind: 'header'; text: string; height: number }
  | { kind: 'item'; item: ShortcutItem; height: number };

const PAD = 20;
const LEGEND_HEIGHT = 26;
const READOUT_RESERVE = 72;
const COLUMN_GAP = 26;
const MIN_COLUMN_WIDTH = 215;
const MAX_COLUMNS = 5;
const HEADER_HEIGHT = 26;
const HEADER_MARGIN_TOP = 14;
const ITEM_HEIGHT = 36;

const SHORTCUT_GROUP_COUNT = SHORTCUT_GROUPS.length;

const ACTION_FONT = '600 13px ui-sans-serif, system-ui, sans-serif';
const KEYS_FONT = '11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
const LEGEND_FONT = '12px ui-sans-serif, system-ui, sans-serif';

export function createShortcutTable(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShortcutTableSnapshot) => void,
): ShortcutTableInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ShortcutTableOptions = { groups: [] };

  function buildEntries(groups: ShortcutGroup[]): Entry[] {
    const entries: Entry[] = [];

    groups.forEach((group, groupIndex) => {
      entries.push({
        kind: 'header',
        text: `${group.name}（${group.items.length}）`,
        height: HEADER_HEIGHT + (groupIndex === 0 ? 0 : HEADER_MARGIN_TOP),
      });
      for (const item of group.items) {
        entries.push({ kind: 'item', item, height: ITEM_HEIGHT });
      }
    });

    return entries;
  }

  function fitText(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

    let end = text.length;
    while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
      end -= 1;
    }

    return `${text.slice(0, end)}…`;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const visible = filterShortcutGroups(current.groups);
    const visibleItems = visible.reduce((sum, group) => sum + group.items.length, 0);
    const entries = buildEntries(visible);

    if (entries.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('在 Controls 的「分组过滤」中至少选择一个分组', width / 2, height / 2);
      ctx.textAlign = 'left';
      emit({ totalGroups: SHORTCUT_GROUP_COUNT, visibleGroups: 0, visibleItems: 0 });
      return;
    }

    const availWidth = width - PAD * 2;
    const availHeight = height - PAD - LEGEND_HEIGHT - READOUT_RESERVE;
    const totalHeight = entries.reduce((sum, entry) => sum + entry.height, 0);

    const neededColumns = Math.max(1, Math.ceil(totalHeight / Math.max(140, availHeight)));
    const widthAllows = Math.max(
      1,
      Math.floor((availWidth + COLUMN_GAP) / (MIN_COLUMN_WIDTH + COLUMN_GAP)),
    );
    const columns = Math.min(MAX_COLUMNS, neededColumns, widthAllows);
    const columnWidth = (availWidth - (columns - 1) * COLUMN_GAP) / columns;

    let columnIndex = 0;
    let x = PAD;
    let y = PAD + LEGEND_HEIGHT;
    const placed: Array<{ entry: Entry; x: number; y: number }> = [];
    let hiddenCount = 0;

    for (const entry of entries) {
      const columnBottom = height - PAD - READOUT_RESERVE;
      if (y + entry.height > columnBottom) {
        if (columnIndex + 1 >= columns) {
          hiddenCount = entries
            .slice(placed.length)
            .filter((entry) => entry.kind === 'item').length;
          break;
        }
        columnIndex += 1;
        x += columnWidth + COLUMN_GAP;
        y = PAD + LEGEND_HEIGHT;
      }
      placed.push({ entry, x, y });
      y += entry.height;
    }

    drawLegend(width, {
      visibleGroups: visible.length,
      visibleItems,
      hiddenCount,
    });

    for (const { entry, x: entryX, y: entryY } of placed) {
      if (entry.kind === 'header') {
        drawHeader(entry.text, entryX, entryY, columnWidth);
      } else {
        drawItem(entry.item, entryX, entryY, columnWidth);
      }
    }

    emit({
      totalGroups: SHORTCUT_GROUP_COUNT,
      visibleGroups: visible.length,
      visibleItems,
    });
  }

  function drawLegend(
    width: number,
    counts: { visibleGroups: number; visibleItems: number; hiddenCount: number },
  ) {
    ctx.fillStyle = '#64748b';
    ctx.font = LEGEND_FONT;
    const hiddenNote =
      counts.hiddenCount > 0 ? ` · 窗口过窄，${counts.hiddenCount} 条未显示，可收窄分组` : '';
    const legend = `写法 macOS / Windows·Linux（平台相同只列一次） · 当前 ${counts.visibleGroups} 组 ${counts.visibleItems} 条${hiddenNote}`;
    ctx.fillText(fitText(legend, width - PAD * 2), PAD, PAD + 14);
  }

  function drawHeader(text: string, x: number, y: number, columnWidth: number) {
    ctx.fillStyle = '#4f7cff';
    ctx.fillRect(x, y + 6, 3, 14);
    ctx.fillStyle = '#172033';
    ctx.font = ACTION_FONT;
    ctx.fillText(fitText(text, columnWidth - 10), x + 10, y + 17);
  }

  function drawItem(item: ShortcutItem, x: number, y: number, columnWidth: number) {
    ctx.fillStyle = '#1e293b';
    ctx.font = ACTION_FONT;
    ctx.fillText(fitText(item.action, columnWidth), x, y + 13);

    ctx.fillStyle = '#475569';
    ctx.font = KEYS_FONT;
    const keys = item.mac === item.win ? item.mac : `${item.mac} / ${item.win}`;
    ctx.fillText(fitText(keys, columnWidth), x, y + 29);
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
