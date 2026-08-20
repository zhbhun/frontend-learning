/**
 * 演示内容：webview 标签创建的子 webview（OOPIF）发生一次事件后，
 * 经原生 webviewEventHandler 沿两条通道分发——宿主页面的 tag.on() 与
 * 主进程的 Electrobun.events；两条通道里 detail 的形态不同。
 * 输入：事件名（did-navigate / host-message / new-window-open）、子 webview id、
 * 宿主是否已订阅、主进程是否已订阅、是否 sandbox。
 * 操作：在 Controls 中切换事件名、订阅开关与 sandbox。
 * 预期结果：detail 形态随事件切换（did-navigate 是字符串，
 * host-message / new-window-open 是对象）；未订阅的通道保留在序列中但标记跳过；
 * sandbox 只断 RPC，两条事件通道不受影响。
 * 阅读主线：routingSteps() 是唯一的判定逻辑，draw() 只负责把序列画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RoutingEventName =
  | 'did-navigate'
  | 'host-message'
  | 'new-window-open';

export interface EventRoutingOptions {
  eventName: RoutingEventName;
  childId: number;
  hostOn: boolean;
  bunOn: boolean;
  sandbox: boolean;
}

export interface EventRoutingSnapshot {
  hostDetail: string;
  bunDetail: string;
  channels: string;
  sandboxNote: string;
}

export interface EventRoutingInstance {
  update(options: EventRoutingOptions): void;
  dispose(): void;
}

interface RoutingStep {
  /** 步骤标题 */
  title: string;
  /** 订阅或转发方式提示 */
  subscribe: string;
  /** 执行内容或跳过说明 */
  line: string;
  /** active 为 false 时该通道画成跳过 */
  active: boolean;
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  accent: '#0e9f6e',
  skipped: '#94a3b8',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

// 子 webview 里事件的来源与原始 detail，与 1.18.1 包内实现核对过：
// did-navigate 一族由原生层上报 URL 字符串；
// host-message 的 detail 是 preload 里 __electrobunSendToHost 的消息 JSON 字符串；
// new-window-open 的 detail 是 { url, isCmdClick, ... } JSON 字符串
interface EventFact {
  origin: string;
  hostDetail: string;
  bunDetail: string;
}

function factOf(eventName: RoutingEventName): EventFact {
  if (eventName === 'host-message') {
    return {
      origin: 'preload 调 __electrobunSendToHost({ from: "child" })',
      hostDetail: '{ from: "child" }（对象）',
      bunDetail: '{ from: "child" }（对象）',
    };
  }
  if (eventName === 'new-window-open') {
    return {
      origin: '点击 target="_blank" 链接 / window.open()',
      hostDetail: '{ url, isCmdClick, ... }（对象）',
      bunDetail: '{ url, isCmdClick, ... }（对象）',
    };
  }
  return {
    origin: '页面导航完成，detail = "https://electrobun.dev/docs"',
    hostDetail: '"https://electrobun.dev/docs"（字符串）',
    bunDetail: '"https://electrobun.dev/docs"（字符串）',
  };
}

// 双通道分发的唯一判定：先经原生转发（detail 形态在这里确定），
// 再分宿主页面与主进程两条通道；sandbox 不影响这两条通道
function routingSteps(options: EventRoutingOptions): RoutingStep[] {
  const { eventName, childId, hostOn, bunOn } = options;
  const fact = factOf(eventName);
  const objectDetail =
    eventName === 'host-message' || eventName === 'new-window-open';

  return [
    {
      title: `子 webview（独立进程）发生 "${eventName}"`,
      subscribe: '事件桥 emitWebviewEvent → 原生层',
      line: fact.origin,
      active: true,
    },
    {
      title: '原生 webviewEventHandler 转发',
      subscribe: 'hostWebviewId 命中，注入 JS 到宿主 + 发 ElectrobunEvent',
      line: objectDetail
        ? 'host-message / new-window-open：detail 以对象字面量注入宿主'
        : '其余事件：detail 经 JSON.stringify，宿主收到字符串',
      active: true,
    },
    {
      title: `宿主页面 · tag.on("${eventName}", ...)`,
      subscribe: `document.querySelector('#electrobun-webview-${childId}').emit(...)`,
      line: hostOn
        ? `handler(event)，event.detail = ${fact.hostDetail}`
        : '未订阅，跳过（事件不落地）',
      active: hostOn,
    },
    {
      title: '主进程 · Electrobun.events.on(...)',
      subscribe: `"${eventName}"（全局）与 "${eventName}-${childId}"（视图级）`,
      line: bunOn
        ? `handler(event)，event.data.detail = ${fact.bunDetail}`
        : '未订阅，跳过',
      active: bunOn,
    },
  ];
}

export function createEventRouting(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventRoutingSnapshot) => void,
): EventRoutingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EventRoutingOptions = {
    eventName: 'did-navigate',
    childId: 3,
    hostOn: true,
    bunOn: true,
    sandbox: false,
  };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    step: RoutingStep,
    order: number,
  ) {
    const skipped = !step.active;
    const borderColor = skipped ? COLORS.skipped : COLORS.ok;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
    drawingContext.lineWidth = skipped ? 1 : 1.5;
    drawingContext.setLineDash(skipped ? [4, 3] : []);
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.setLineDash([]);

    // 左侧序号即转发顺序
    drawingContext.fillStyle = borderColor;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`${order}`, x + 12, y + 21);
    drawingContext.fillStyle = COLORS.muted;
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
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const steps = routingSteps(current);
    const fact = factOf(current.eventName);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `一次 "${current.eventName}" 事件的回流路径`,
      24,
      34,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '宿主页面与主进程各有一条通道；未订阅的通道保留位置并标记跳过',
      24,
      56,
    );

    const margin = 24;
    const boxWidth = width - margin * 2;
    const stepHeight = 66;
    const gap = Math.max(
      20,
      Math.min(32, (height - 96 - (steps.length * stepHeight)) / steps.length),
    );
    let y = 74;
    const centerX = width / 2;

    steps.forEach((step, index) => {
      const stepY = y + gap;
      drawArrow(y + 2, stepY, centerX);
      drawBox(margin, stepY, boxWidth, stepHeight, step, index + 1);
      y = stepY + stepHeight;
    });

    // 底部结论行：sandbox 影响的是 RPC，不是这两条事件通道
    drawingContext.fillStyle = current.sandbox ? COLORS.accent : COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      current.sandbox
        ? 'sandbox = true：子 webview 的 RPC 被断开，但两条事件通道不受影响'
        : 'sandbox = false：子 webview 还可经 Electroview 建 RPC（见 RPC 课）',
      margin,
      Math.min(height - 12, y + 24),
    );

    emit({
      hostDetail: fact.hostDetail,
      bunDetail: fact.bunDetail,
      channels: `"${current.eventName}" 与 "${current.eventName}-${current.childId}"`,
      sandboxNote: current.sandbox
        ? 'RPC 断开，事件通道不受影响'
        : 'RPC 可用（另见 RPC 课）',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        eventName: options.eventName,
        childId: Math.max(1, Math.round(options.childId)),
        hostOn: options.hostOn,
        bunOn: options.bunOn,
        sandbox: options.sandbox,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
