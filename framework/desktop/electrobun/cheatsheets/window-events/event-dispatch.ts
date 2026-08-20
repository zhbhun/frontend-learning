/**
 * 演示内容：一次窗口事件从原生回调进入 Bun 后，沿「全局通道 + 窗口级通道」
 * 双通道分发的顺序；close 事件顺序反转且末尾追加内置清理与退出判定。
 * 输入：事件名（close / resize / focus）、窗口 id、是否用 win.on 订阅窗口级、
 * 是否用 Electrobun.events.on 订阅全局。
 * 操作：在 Controls 中切换事件名、改窗口 id、开关两个订阅。
 * 预期结果：分发序列随输入联动——close 为 窗口级 → 全局 → 内置清理，
 * 其余事件为 全局 → 窗口级；未订阅的通道保留在序列中但标记跳过；
 * 通道名后缀随窗口 id 变化。
 * 阅读主线：dispatchSteps() 是唯一的判定逻辑，draw() 只负责把序列画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type DispatchEventName = 'close' | 'resize' | 'focus';

export interface EventDispatchOptions {
  eventName: DispatchEventName;
  winId: number;
  perWindow: boolean;
  globalSub: boolean;
}

export interface EventDispatchSnapshot {
  order: string;
  channels: string;
  payload: string;
  closeNote: string;
}

export interface EventDispatchInstance {
  update(options: EventDispatchOptions): void;
  dispose(): void;
}

interface DispatchStep {
  /** 步骤标题，例如「窗口级通道 "close-1"」 */
  title: string;
  /** 订阅方式提示，例如 win.on('close', ...) */
  subscribe: string;
  /** 执行内容或跳过说明 */
  line: string;
  /** active 为 false 时该通道画成跳过 */
  active: boolean;
  /** 内置步骤（非用户订阅）用另一种语气标注 */
  builtin: boolean;
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  builtin: '#7c5cbf',
  skipped: '#94a3b8',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

// 各事件的 event.data 载荷形态，与 1.18.1 包内 windowEvents.ts 一致
function payloadOf(eventName: DispatchEventName, winId: number): string {
  if (eventName === 'resize') {
    return `{ id: ${winId}, x: 200, y: 120, width: 800, height: 600 }`;
  }
  return `{ id: ${winId} }`;
}

// 双通道分发的唯一判定：close 先窗口级后全局，其余先全局后窗口级；
// close 在两种用户通道之后还有内置清理与退出判定
function dispatchSteps(options: EventDispatchOptions): DispatchStep[] {
  const { eventName, winId, perWindow, globalSub } = options;
  const globalChannel = `"${eventName}"`;
  const windowChannel = `"${eventName}-${winId}"`;

  const globalStep: DispatchStep = {
    title: `全局通道 ${globalChannel}`,
    subscribe: `Electrobun.events.on('${eventName}', ...)`,
    line: globalSub ? 'handler(event) 执行，读 event.data.id 区分窗口' : '未订阅，跳过',
    active: globalSub,
    builtin: false,
  };
  const windowStep: DispatchStep = {
    title: `窗口级通道 ${windowChannel}`,
    subscribe: `win.on('${eventName}', ...)`,
    line: perWindow ? 'handler(event) 执行' : '未订阅，跳过',
    active: perWindow,
    builtin: false,
  };
  const builtinStep: DispatchStep = {
    title: '内置全局 close 处理',
    subscribe: '框架注册，无需用户订阅',
    line: '清理窗口表与关联视图 → exitOnLastWindowClosed（默认 true）退出',
    active: true,
    builtin: true,
  };

  if (eventName === 'close') {
    return [windowStep, globalStep, builtinStep];
  }
  return [globalStep, windowStep];
}

export function createEventDispatch(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventDispatchSnapshot) => void,
): EventDispatchInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EventDispatchOptions = {
    eventName: 'resize',
    winId: 1,
    perWindow: true,
    globalSub: true,
  };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    step: DispatchStep,
    order: number,
  ) {
    const skipped = !step.active;
    const borderColor = skipped
      ? COLORS.skipped
      : step.builtin
        ? COLORS.builtin
        : COLORS.ok;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
    drawingContext.lineWidth = skipped ? 1 : 1.5;
    drawingContext.setLineDash(skipped ? [4, 3] : []);
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.setLineDash([]);

    // 左侧执行序号：内置步骤用紫色圆点区分用户订阅
    drawingContext.fillStyle = borderColor;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`${order}`, x + 12, y + 21);
    drawingContext.fillStyle = step.builtin ? COLORS.builtin : COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(step.title, x + 28, y + 21);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(step.subscribe, x + 12, y + 39);

    drawingContext.fillStyle = skipped ? COLORS.skipped : COLORS.heading;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(step.line, x + 12, y + 57);
  }

  function drawArrow(fromY: number, toY: number, centerX: number) {
    drawingContext.strokeStyle = COLORS.arrow;
    drawingContext.fillStyle = COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.moveTo(centerX, fromY);
    drawingContext.lineTo(centerX, toY - 6);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(centerX, toY);
    drawingContext.lineTo(centerX - 4.5, toY - 9);
    drawingContext.lineTo(centerX + 4.5, toY - 9);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const steps = dispatchSteps(current);
    const isClose = current.eventName === 'close';

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `分发序列：win.on("${current.eventName}") 与 Electrobun.events.on("${current.eventName}")`,
      24,
      34,
    );
    drawingContext.fillStyle = isClose ? COLORS.builtin : COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      isClose
        ? 'close 特例：窗口级先于全局，内置清理与退出判定最后执行'
        : '除 close 外：全局先于窗口级',
      24,
      56,
    );

    // 顶部：原生回调产生的事件对象
    const margin = 24;
    const boxWidth = width - margin * 2;
    const top = 74;
    const nativeHeight = 56;
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(margin, top, boxWidth, nativeHeight, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('原生窗口回调 → ElectrobunEvent', margin + 12, top + 21);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `{ name: "${current.eventName}", data: ${payloadOf(current.eventName, current.winId)} }`,
      margin + 12,
      top + 40,
    );

    // 分发步骤：按判定序列纵向排列，序号即执行顺序
    const stepHeight = 66;
    const gap = Math.max(22, Math.min(34, (height - top - nativeHeight - 96) / steps.length - stepHeight));
    let y = top + nativeHeight;
    const centerX = width / 2;

    steps.forEach((step, index) => {
      const stepY = y + gap;
      drawArrow(y + 2, stepY, centerX);
      drawBox(margin, stepY, boxWidth, stepHeight, step, index + 1);
      y = stepY + stepHeight;
    });

    emit({
      order: isClose ? '窗口级 → 全局 → 内置清理' : '全局 → 窗口级',
      channels: `"${current.eventName}" 与 "${current.eventName}-${current.winId}"`,
      payload: payloadOf(current.eventName, current.winId),
      closeNote: isClose ? '内置清理与退出判定最后执行' : '—',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        eventName: options.eventName,
        winId: Math.max(0, Math.round(options.winId)),
        perWindow: options.perWindow,
        globalSub: options.globalSub,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
