/**
 * 演示内容：多显示器在「全局屏幕坐标」里的布局与窗口定位算式——主屏左上角为
 * 原点 (0,0)、y 向下、逻辑像素；副屏排布在主屏右侧 / 下方 / 上方（上方与更高的
 * 并排副屏都会出现负 y）；bounds 与 workArea 的差（主屏让开菜单栏 24 与 Dock 80，
 * 副屏让开任务栏 40）；把 640×400 窗口居中到目标显示器 workArea 的 frame 计算；
 * getCursorScreenPoint 的 bounds 命中判定。
 * 输入：layout（副屏在主屏右侧 / 下方 / 上方）、target（窗口目标：主屏 workArea /
 * 副屏 workArea / 跟随光标所在屏）。光标 = 鼠标在示意画布上的位置，按同一比例
 * 映射回全局坐标，模拟 getCursorScreenPoint 的返回。
 * 操作：切换 layout / target；把鼠标移进画布观察光标读数与命中判定。
 * 预期结果：读数显示光标全局坐标、命中显示器、窗口目标 frame；layout 切到
 * above 时副屏 bounds.y 为 -1080、切到 right 时为 -90；target 为 follow-cursor
 * 时窗口 frame 跟随光标所在屏变化。真实显示器枚举与窗口定位以课程目录的
 * screen-observer.ts 桌面范例为准。
 * 阅读主线：placeInWorkArea / hitDisplay 两个函数就是正文的两条定位算式，
 * draw() 只负责呈现；几何数值是示意（主屏 1440×900·scale 2、副屏 1920×1080·scale 1）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScreenLayout = 'right' | 'below' | 'above';

export type PlacementTarget =
  | 'primary-workarea'
  | 'secondary-workarea'
  | 'follow-cursor';

export interface MultiScreenPositioningOptions {
  layout: ScreenLayout;
  target: PlacementTarget;
}

export interface MultiScreenPositioningSnapshot {
  cursor: string;
  hitDisplay: string;
  windowFrame: string;
}

export interface MultiScreenPositioningInstance {
  update(options: MultiScreenPositioningOptions): void;
  dispose(): void;
}

// 示意几何（逻辑像素）：主屏带菜单栏与 Dock，副屏带任务栏
const PRIMARY = {
  id: 1,
  label: '主屏',
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  menuBar: 24,
  dock: 80,
  scaleFactor: 2,
};

const SECONDARY_BASE = {
  id: 2,
  label: '副屏',
  width: 1920,
  height: 1080,
  taskbar: 40,
  scaleFactor: 1,
};

// 副屏左上角的全局坐标：right 为「并排但更高、纵向居中对齐」→ y 为负
const LAYOUT_OFFSETS: Record<ScreenLayout, { x: number; y: number }> = {
  right: { x: 1440, y: -90 },
  below: { x: 240, y: 900 },
  above: { x: 240, y: -1080 },
};

const LAYOUT_LABELS: Record<ScreenLayout, string> = {
  right: '副屏在主屏右侧（并排、更高）',
  below: '副屏在主屏下方',
  above: '副屏在主屏上方',
};

const TARGET_LABELS: Record<PlacementTarget, string> = {
  'primary-workarea': '主屏 workArea 居中',
  'secondary-workarea': '副屏 workArea 居中',
  'follow-cursor': '跟随光标所在屏',
};

const WINDOW_WIDTH = 640;
const WINDOW_HEIGHT = 400;

const BAR_HEIGHT = 34;
const MARGIN = 80; // 全局坐标平面四周留白（逻辑像素）

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  barBg: '#e8edf5',
  barBorder: '#cbd5e1',
  primaryFill: '#eef2f9',
  secondaryFill: '#f2f0ea',
  displayBorder: '#94a3b8',
  hitBorder: '#4f7cff',
  workAreaDash: '#4f7cff',
  accent: '#4f7cff',
  windowFill: 'rgba(79, 124, 255, 0.18)',
  windowBorder: '#3053d3',
  cursor: '#b91c1c',
};

interface DisplayShape {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  insetNote: string;
}

function buildDisplays(layout: ScreenLayout): DisplayShape[] {
  const offset = LAYOUT_OFFSETS[layout];
  const secondary: DisplayShape = {
    id: SECONDARY_BASE.id,
    label: SECONDARY_BASE.label,
    x: offset.x,
    y: offset.y,
    width: SECONDARY_BASE.width,
    height: SECONDARY_BASE.height,
    workArea: {
      x: offset.x,
      y: offset.y,
      width: SECONDARY_BASE.width,
      height: SECONDARY_BASE.height - SECONDARY_BASE.taskbar,
    },
    scaleFactor: SECONDARY_BASE.scaleFactor,
    insetNote: `workArea ${SECONDARY_BASE.width}x${SECONDARY_BASE.height - SECONDARY_BASE.taskbar}（让开任务栏 ${SECONDARY_BASE.taskbar}）`,
  };
  const primary: DisplayShape = {
    id: PRIMARY.id,
    label: PRIMARY.label,
    x: PRIMARY.x,
    y: PRIMARY.y,
    width: PRIMARY.width,
    height: PRIMARY.height,
    workArea: {
      x: PRIMARY.x,
      y: PRIMARY.y + PRIMARY.menuBar,
      width: PRIMARY.width,
      height: PRIMARY.height - PRIMARY.menuBar - PRIMARY.dock,
    },
    scaleFactor: PRIMARY.scaleFactor,
    insetNote: `workArea ${PRIMARY.width}x${PRIMARY.height - PRIMARY.menuBar - PRIMARY.dock}（让开菜单栏 ${PRIMARY.menuBar} 与 Dock ${PRIMARY.dock}）`,
  };
  return [primary, secondary];
}

// 正文定位算式一：窗口左上角 = 目标显示器 workArea 中央
function placeInWorkArea(display: DisplayShape): { x: number; y: number } {
  return {
    x: Math.round(
      display.workArea.x + (display.workArea.width - WINDOW_WIDTH) / 2,
    ),
    y: Math.round(
      display.workArea.y + (display.workArea.height - WINDOW_HEIGHT) / 2,
    ),
  };
}

// 正文定位算式二：光标所在屏 = bounds 命中测试，未命中回退主屏
function hitDisplay(
  point: { x: number; y: number } | null,
  displays: DisplayShape[],
): DisplayShape {
  if (point === null) {
    return displays[0];
  }
  return (
    displays.find(
      (d) =>
        point.x >= d.x &&
        point.x < d.x + d.width &&
        point.y >= d.y &&
        point.y < d.y + d.height,
    ) ?? displays[0]
  );
}

export function createMultiScreenPositioningSchematic(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MultiScreenPositioningSnapshot) => void,
): MultiScreenPositioningInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let layout: ScreenLayout = 'right';
  let target: PlacementTarget = 'secondary-workarea';
  let cursor: { x: number; y: number } | null = null;

  // draw() 时重算的全局 → 画布变换
  let toScreen: ((gx: number, gy: number) => [number, number]) | null = null;
  let toGlobal: ((sx: number, sy: number) => { x: number; y: number }) | null =
    null;

  function drawOrigin(
    origin: [number, number],
    axisLength: number,
  ) {
    const [ox, oy] = origin;
    ctx.strokeStyle = COLORS.heading;
    ctx.fillStyle = COLORS.heading;
    ctx.lineWidth = 1.5;

    // x+ 向右
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + axisLength, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + axisLength, oy);
    ctx.lineTo(ox + axisLength - 7, oy - 3.5);
    ctx.lineTo(ox + axisLength - 7, oy + 3.5);
    ctx.closePath();
    ctx.fill();

    // y+ 向下
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy + axisLength);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy + axisLength);
    ctx.lineTo(ox - 3.5, oy + axisLength - 7);
    ctx.lineTo(ox + 3.5, oy + axisLength - 7);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.heading;
    ctx.fillText('全局原点 (0,0) 主屏左上 · x+ 向右 · y+ 向下', ox + 8, oy + 14);
  }

  function drawDisplay(display: DisplayShape, isHit: boolean) {
    const [dx, dy] = toScreen!(display.x, display.y);
    const w = display.width * scale_;
    const h = display.height * scale_;

    ctx.fillStyle =
      display.id === PRIMARY.id ? COLORS.primaryFill : COLORS.secondaryFill;
    ctx.beginPath();
    ctx.rect(dx, dy, w, h);
    ctx.fill();
    ctx.strokeStyle = isHit ? COLORS.hitBorder : COLORS.displayBorder;
    ctx.lineWidth = isHit ? 2.5 : 1.5;
    ctx.stroke();

    // workArea：虚线内框
    const [wx, wy] = toScreen!(
      display.workArea.x,
      display.workArea.y,
    );
    ctx.strokeStyle = COLORS.workAreaDash;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(
      wx,
      wy,
      display.workArea.width * scale_,
      display.workArea.height * scale_,
    );
    ctx.setLineDash([]);

    // 显示器标签：两行，第一行身份、第二行 workArea 差异
    ctx.fillStyle = COLORS.heading;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `id=${display.id} ${display.label} · ${display.width}x${display.height} · scaleFactor ${display.scaleFactor}`,
      dx + 10,
      dy + 18,
    );
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(display.insetNote, dx + 10, dy + 34);

    // 副屏额外标注 bounds 左上角的全局坐标（正负是教学点）
    if (display.id !== PRIMARY.id) {
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(
        `bounds(${display.x}, ${display.y})`,
        dx + 10,
        dy + 50,
      );
    }
  }

  function drawWindow(frame: { x: number; y: number }) {
    const [wx, wy] = toScreen!(frame.x, frame.y);
    const w = WINDOW_WIDTH * scale_;
    const h = WINDOW_HEIGHT * scale_;

    ctx.fillStyle = COLORS.windowFill;
    ctx.fillRect(wx, wy, w, h);
    ctx.strokeStyle = COLORS.windowBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wx, wy, w, h);

    ctx.fillStyle = COLORS.windowBorder;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('窗口', wx + w / 2, wy + h / 2 - 6);
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `frame(${frame.x}, ${frame.y}, ${WINDOW_WIDTH}, ${WINDOW_HEIGHT})`,
      wx + w / 2,
      wy + h / 2 + 10,
    );
    ctx.textAlign = 'left';
  }

  function drawCursor() {
    if (cursor === null) {
      return;
    }
    const size = readCanvasSize(canvas);
    const [cx, cy] = toScreen!(cursor.x, cursor.y);

    ctx.strokeStyle = COLORS.cursor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(size.width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, Math.max(BAR_HEIGHT, size.height));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.cursor;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `光标 (${Math.round(cursor.x)}, ${Math.round(cursor.y)})`,
      Math.min(cx + 8, size.width - 120),
      Math.max(cy - 8, BAR_HEIGHT + 14),
    );
  }

  let scale_ = 1;

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const displays = buildDisplays(layout);

    // 全局坐标范围（两屏 bounds 的并集 + 留白）
    const minX = Math.min(...displays.map((d) => d.x)) - MARGIN;
    const maxX = Math.max(...displays.map((d) => d.x + d.width)) + MARGIN;
    const minY = Math.min(...displays.map((d) => d.y)) - MARGIN;
    const maxY = Math.max(...displays.map((d) => d.y + d.height)) + MARGIN;

    const stageX = 12;
    const stageY = BAR_HEIGHT + 10;
    const stageW = width - stageX * 2;
    const stageH = height - stageY - 12;
    scale_ = Math.min(stageW / (maxX - minX), stageH / (maxY - minY));
    const offsetX =
      stageX + (stageW - (maxX - minX) * scale_) / 2 - minX * scale_;
    const offsetY =
      stageY + (stageH - (maxY - minY) * scale_) / 2 - minY * scale_;

    toScreen = (gx: number, gy: number) => [
      offsetX + gx * scale_,
      offsetY + gy * scale_,
    ];
    toGlobal = (sx: number, sy: number) => ({
      x: (sx - offsetX) / scale_,
      y: (sy - offsetY) / scale_,
    });

    // 顶栏：当前布局与定位策略（对应 Controls 的两个输入）
    ctx.fillStyle = COLORS.barBg;
    ctx.fillRect(0, 0, width, BAR_HEIGHT);
    ctx.strokeStyle = COLORS.barBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BAR_HEIGHT + 0.5);
    ctx.lineTo(width, BAR_HEIGHT + 0.5);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `布局：${LAYOUT_LABELS[layout]}　·　目标：${TARGET_LABELS[target]}`,
      16,
      BAR_HEIGHT / 2 + 4.5,
    );

    // 定位算式：目标屏 → workArea 居中
    const hit = hitDisplay(cursor, displays);
    const targetDisplay =
      target === 'primary-workarea'
        ? displays[0]
        : target === 'secondary-workarea'
          ? displays[1]
          : hit;
    const frame = placeInWorkArea(targetDisplay);

    for (const display of displays) {
      drawDisplay(display, display.id === hit.id);
    }
    drawOrigin(toScreen(0, 0), 34);
    drawWindow(frame);
    drawCursor();

    // 图例
    ctx.fillStyle = COLORS.faint;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '实线框 = bounds · 蓝色虚线框 = workArea · 移动鼠标模拟 getCursorScreenPoint',
      stageX,
      height - 14,
    );

    emit({
      cursor:
        cursor === null
          ? '—（移入画布）'
          : `(${Math.round(cursor.x)}, ${Math.round(cursor.y)})`,
      hitDisplay:
        cursor !== null && hit.id === displays[0].id && !containsPoint(displays[0], cursor)
          ? '未命中 → 回退 id=1 主屏'
          : `id=${hit.id} ${hit.label}`,
      windowFrame: `(${frame.x}, ${frame.y}, ${WINDOW_WIDTH}, ${WINDOW_HEIGHT})`,
    });
  }

  function containsPoint(display: DisplayShape, point: { x: number; y: number }) {
    return (
      point.x >= display.x &&
      point.x < display.x + display.width &&
      point.y >= display.y &&
      point.y < display.y + display.height
    );
  }

  function onMouseMove(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    cursor = toGlobal
      ? toGlobal(event.clientX - rect.left, event.clientY - rect.top)
      : null;
    draw();
  }

  function onMouseLeave() {
    cursor = null;
    draw();
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    update(options) {
      layout = options.layout;
      target = options.target;
      cursor = null;
      draw();
    },
    dispose() {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      resizeObserver.disconnect();
    },
  };
}
