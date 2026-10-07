/**
 * 范例介绍：模拟无边框窗口自定义标题栏的拖拽区域语义。
 *
 * 输入与前置状态：标题栏整条声明 `app-region: drag`；控件「按钮 no-drag」
 * 决定两个窗口控制按钮是否用 `app-region: no-drag` 从拖拽区排除。
 * 主要操作：在模拟标题栏上按下并移动（拖动窗口），或点击「设置」「关闭」按钮。
 * 预期结果：拖拽区内的点击被吞掉（按钮无反应、无悬停），拖动照常生效；
 * 声明 no-drag 后按钮恢复指针事件。这与真实 Electron 窗口中的行为一致。
 * 阅读主线：先拖动标题栏看窗口移动，再关闭 no-drag 看点击被谁吞掉。
 *
 * 实现说明：浏览器不认识 app-region，本模拟用 pointer-events 的命中判定
 * 复现同一条规则——被拖拽区覆盖的元素不参与命中检测。
 */

export interface DragRegionOptions {
  noDragOnButtons: boolean;
}

export interface DragRegionSnapshot {
  noDrag: boolean;
  lastEvent: string;
}

export interface DragRegionInstance {
  update(options: DragRegionOptions): void;
  dispose(): void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 模拟窗口与标题栏的逻辑尺寸
const WINDOW_WIDTH = 520;
const WINDOW_HEIGHT = 300;
const TITLEBAR_HEIGHT = 44;
const BUTTON_WIDTH = 64;
const BUTTON_HEIGHT = 30;
const BUTTON_GAP = 10;
const BUTTON_MARGIN = 12;

const INITIAL_EVENT = '试试拖动标题栏，或点击右侧按钮';

function buttonRects(winX: number, winY: number): Rect[] {
  // 从右往左排：关闭在最右，设置在它左边
  const close: Rect = {
    x: winX + WINDOW_WIDTH - BUTTON_MARGIN - BUTTON_WIDTH,
    y: winY + (TITLEBAR_HEIGHT - BUTTON_HEIGHT) / 2,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
  };
  const settings: Rect = {
    x: close.x - BUTTON_GAP - BUTTON_WIDTH,
    y: close.y,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
  };
  return [settings, close];
}

function pointInRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(rect.x + radius, rect.y);
  ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
  ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
  ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, radius);
  ctx.closePath();
}

export function createDragRegionSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DragRegionSnapshot) => void,
): DragRegionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let noDrag = true;
  let lastEvent = INITIAL_EVENT;
  let winX = 0;
  let winY = 0;
  let centered = false;
  let dragging: { offsetX: number; offsetY: number; moved: boolean } | null = null;
  let hoverButtonIndex: number | null = null;
  let pressedButtonIndex: number | null = null;

  function titlebarRect(): Rect {
    return { x: winX, y: winY, width: WINDOW_WIDTH, height: TITLEBAR_HEIGHT };
  }

  function hitButton(px: number, py: number): number | null {
    if (!noDrag) {
      return null; // 未声明 no-drag：按钮属于拖拽区，不参与命中
    }
    const rects = buttonRects(winX, winY);
    for (let i = 0; i < rects.length; i += 1) {
      if (pointInRect(px, py, rects[i])) {
        return i;
      }
    }
    return null;
  }

  function draw(): void {
    const size = { width: canvas.clientWidth || 640, height: canvas.clientHeight || 340 };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * pixelRatio);
    canvas.height = Math.round(size.height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    if (!centered) {
      winX = Math.round((size.width - WINDOW_WIDTH) / 2);
      // 略向上偏，避开左下角读数区域
      winY = Math.max(8, Math.round((size.height - WINDOW_HEIGHT) / 2) - 10);
      centered = true;
    }

    // 桌面背景：淡网格，衬托窗口移动
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < size.width; gx += 28) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, size.height);
      ctx.stroke();
    }
    for (let gy = 0; gy < size.height; gy += 28) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(size.width, gy + 0.5);
      ctx.stroke();
    }

    // 窗口主体
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, { x: winX, y: winY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    roundRect(ctx, { x: winX, y: winY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }, 10);
    ctx.stroke();

    // 标题栏：整条都是拖拽区
    roundRect(ctx, { x: winX, y: winY, width: WINDOW_WIDTH, height: TITLEBAR_HEIGHT }, 10);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#dde5f0';
    ctx.fillRect(winX, winY, WINDOW_WIDTH, TITLEBAR_HEIGHT);
    ctx.restore();

    // 拖拽区标注（虚线下边 + 左侧说明）
    ctx.fillStyle = '#5b6b83';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('app-region: drag', winX + 14, winY + TITLEBAR_HEIGHT - 10);
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#172033';
    ctx.fillText('无边框窗口', winX + 14, winY + 16);

    // 窗口控制按钮
    const rects = buttonRects(winX, winY);
    const labels = ['设置', '关闭'];
    rects.forEach((rect, index) => {
      const enabled = noDrag;
      const hovered = enabled && hoverButtonIndex === index;
      const pressed = enabled && pressedButtonIndex === index;

      roundRect(ctx, rect, 6);
      if (!enabled) {
        // 被拖拽区覆盖：半透明虚线，表达“收不到鼠标事件”
        ctx.fillStyle = 'rgba(221, 229, 240, 0.55)';
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#94a3b8';
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = pressed ? '#c7d3e4' : hovered ? '#eef2f8' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#8fa0b8';
        ctx.stroke();
      }

      ctx.fillStyle = enabled ? '#172033' : '#8494ab';
      ctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[index], rect.x + rect.width / 2, rect.y + rect.height / 2 + 1);
    });

    if (!noDrag) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a25b5b';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('按钮被拖拽区覆盖：收不到任何鼠标事件', winX + WINDOW_WIDTH / 2, winY + TITLEBAR_HEIGHT + 14);
    }
  }

  function snapshot(): DragRegionSnapshot {
    return { noDrag, lastEvent };
  }

  function refresh(): void {
    emit(snapshot());
    draw();
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function updateCursor(px: number, py: number): void {
    if (dragging) {
      canvas.style.cursor = 'grabbing';
      return;
    }
    canvas.style.cursor = hitButton(px, py) !== null ? 'pointer' : 'default';
  }

  function onMouseDown(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    const buttonIndex = hitButton(x, y);
    if (buttonIndex !== null) {
      pressedButtonIndex = buttonIndex;
      draw();
      return;
    }
    if (pointInRect(x, y, titlebarRect())) {
      dragging = { offsetX: x - winX, offsetY: y - winY, moved: false };
      lastEvent = '按住拖拽区拖动：窗口跟随移动';
      updateCursor(x, y);
      refresh();
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    if (dragging) {
      winX = x - dragging.offsetX;
      winY = y - dragging.offsetY;
      dragging.moved = true;
      draw();
      return;
    }
    const buttonIndex = hitButton(x, y);
    if (buttonIndex !== hoverButtonIndex) {
      hoverButtonIndex = buttonIndex;
      updateCursor(x, y);
      draw();
    } else {
      updateCursor(x, y);
    }
  }

  function onMouseUp(event: MouseEvent): void {
    const { x, y } = canvasPoint(event);
    if (dragging) {
      const moved = dragging.moved;
      dragging = null;
      lastEvent = moved ? '拖动结束：窗口已移动' : '点击落在拖拽区：只触发拖动，click 被吞掉';
      updateCursor(x, y);
      refresh();
      return;
    }
    if (pressedButtonIndex !== null) {
      const buttonIndex = pressedButtonIndex;
      pressedButtonIndex = null;
      const labels = ['设置', '关闭'];
      if (hitButton(x, y) === buttonIndex) {
        lastEvent = `「${labels[buttonIndex]}」按钮收到 click：no-drag 区恢复了指针事件`;
      }
      refresh();
      return;
    }
    if (pointInRect(x, y, titlebarRect())) {
      lastEvent = '点击落在拖拽区：只触发拖动，click 被吞掉';
      refresh();
    }
  }

  function onMouseLeave(): void {
    if (hoverButtonIndex !== null) {
      hoverButtonIndex = null;
    }
    pressedButtonIndex = null;
    dragging = null;
    updateCursor(-1, -1);
    draw();
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);

  return {
    update(options) {
      noDrag = options.noDragOnButtons;
      lastEvent = INITIAL_EVENT;
      hoverButtonIndex = null;
      pressedButtonIndex = null;
      refresh();
    },
    dispose() {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
