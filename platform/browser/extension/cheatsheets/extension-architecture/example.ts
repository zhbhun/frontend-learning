/**
 * 范例介绍：manifest 装配演算。
 * 演示内容：manifest.json 的三个关键声明（background.service_worker、
 *   action.default_popup、content_scripts）如何决定扩展由哪些运行上下文组成。
 * 输入：三个声明的勾选状态，对应 manifest 字段的有无。
 * 操作：在 Controls 中勾选或取消字段。
 * 预期结果：左侧 manifest 文本同步增删；右侧对应上下文框在实线（已装配）与
 *   虚线（未声明）之间切换；上下文之间按可用性出现消息通道；左下读数汇总。
 * 阅读主线：manifest 文本、右侧上下文框与读数描述的是同一个装配结果。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface AssemblyOptions {
  serviceWorker: boolean;
  popup: boolean;
  contentScript: boolean;
}

export interface AssemblySnapshot {
  extensionContexts: string[];
  pageContext: string | null;
  channels: string[];
}

export interface AssemblyInstance {
  update(options: AssemblyOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x440 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 440;

const MANIFEST_BOX = { x: 24, y: 36, width: 292, height: 292 };
const CONTEXT_BOX = { x: 460, width: 250, height: 58 };

const COLORS = {
  ink: '#172033',
  sub: '#5b6b81',
  muted: '#7c8aa0',
  code: '#33415c',
  blue: '#4f7cff',
  assemble: '#8ba3d8',
  channel: '#64748b',
  inactive: '#9aa7b8',
  inactiveSub: '#b3bfcd',
  inactiveBorder: '#c3cedd',
  domFill: '#eef2f7',
  domBorder: '#94a3b8',
  domTitle: '#3f4c5e',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
  legend: '#475569',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_MANIFEST = '600 12px ui-sans-serif, system-ui, sans-serif';
const FONT_HEADING = '600 11px ui-sans-serif, system-ui, sans-serif';

interface ContextBoxSpec {
  key: keyof AssemblyOptions;
  title: string;
  sub: string;
  y: number;
}

const CONTEXT_BOXES: ContextBoxSpec[] = [
  {
    key: 'serviceWorker',
    title: 'Service worker',
    sub: '扩展环境 · 无 DOM · 按需启停',
    y: 36,
  },
  {
    key: 'popup',
    title: 'Popup 等 UI 页面',
    sub: '扩展环境 · 有 DOM · 打开创建，关闭销毁',
    y: 124,
  },
  {
    key: 'contentScript',
    title: 'Content script',
    sub: '网页隔离世界 · 与页面共享 DOM',
    y: 212,
  },
];

const DOM_BOX = {
  title: '页面 DOM',
  sub: '网页环境 · 属于网页，不属于扩展',
  y: 300,
};

export function createAssemblyExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AssemblySnapshot) => void,
): AssemblyInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: AssemblyOptions = {
    serviceWorker: true,
    popup: true,
    contentScript: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const ctx = drawingContext;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.fillStyle = COLORS.stage;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const offsetX = (width - DESIGN_WIDTH * scale) / 2;
    const offsetY = (height - DESIGN_HEIGHT * scale) / 2;
    ctx.setTransform(
      pixelRatio * scale,
      0,
      0,
      pixelRatio * scale,
      pixelRatio * offsetX,
      pixelRatio * offsetY,
    );

    drawManifest(ctx, current);
    drawContexts(ctx, current);
    drawAssemblyArrows(ctx, current);
    drawChannels(ctx, current);
    drawLegend(ctx);

    emit(buildSnapshot(current));
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

function buildSnapshot(options: AssemblyOptions): AssemblySnapshot {
  const extensionContexts: string[] = [];
  if (options.serviceWorker) {
    extensionContexts.push('Service worker');
  }
  if (options.popup) {
    extensionContexts.push('Popup（UI 页面）');
  }

  const channels: string[] = [];
  if (options.serviceWorker && options.popup) {
    channels.push('popup ⇄ worker');
  }
  const extensionSide = options.serviceWorker
    ? 'worker'
    : options.popup
      ? 'popup'
      : null;
  if (extensionSide && options.contentScript) {
    channels.push(`${extensionSide} ⇄ content script`);
  }

  return {
    extensionContexts,
    pageContext: options.contentScript ? 'Content script（隔离世界）' : null,
    channels,
  };
}

function manifestLines(options: AssemblyOptions): string[] {
  const lines = [
    '{',
    '  "manifest_version": 3,',
    '  "name": "…",',
    '  "version": "1.0",',
  ];
  if (options.serviceWorker) {
    lines.push('  "background": {', '    "service_worker": "sw.js"', '  },');
  }
  if (options.popup) {
    lines.push('  "action": {', '    "default_popup": "popup.html"', '  },');
  }
  if (options.contentScript) {
    lines.push(
      '  "content_scripts": [{',
      '    "matches": ["<all_urls>"],',
      '    "js": ["content.js"]',
      '  }]',
    );
  }
  lines.push('}');
  return lines;
}

function pathBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 8,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  { heads = 1, color = COLORS.channel }: { heads?: number; color?: string } = {},
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  const headAt = (point: number[], from: number[]) => {
    const angle = Math.atan2(point[1] - from[1], point[0] - from[0]);
    const length = 9;
    const spread = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(point[0], point[1]);
    ctx.lineTo(
      point[0] - length * Math.cos(angle - spread),
      point[1] - length * Math.sin(angle - spread),
    );
    ctx.lineTo(
      point[0] - length * Math.cos(angle + spread),
      point[1] - length * Math.sin(angle + spread),
    );
    ctx.closePath();
    ctx.fill();
  };

  if (heads >= 1) {
    headAt(points[points.length - 1], points[points.length - 2]);
  }
  if (heads >= 2) {
    headAt(points[0], points[1]);
  }
}

function drawManifest(ctx: CanvasRenderingContext2D, options: AssemblyOptions) {
  const { x, y, width, height } = MANIFEST_BOX;
  pathBox(ctx, x, y, width, height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_MANIFEST;
  ctx.fillText('manifest.json', x + 14, y + 26);

  ctx.font = FONT_CODE;
  ctx.fillStyle = COLORS.code;
  let lineY = y + 50;
  for (const line of manifestLines(options)) {
    ctx.fillText(line, x + 14, lineY);
    lineY += 13.5;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('manifest_version、name、version 必填', x + 14, y + height - 14);
}

function drawContexts(ctx: CanvasRenderingContext2D, options: AssemblyOptions) {
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_HEADING;
  ctx.fillText('运行上下文', CONTEXT_BOX.x, CONTEXT_BOXES[0].y - 12);

  for (const box of CONTEXT_BOXES) {
    const active = options[box.key];
    pathBox(ctx, CONTEXT_BOX.x, box.y, CONTEXT_BOX.width, CONTEXT_BOX.height);
    ctx.fillStyle = active ? COLORS.white : 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.setLineDash(active ? [] : [4, 4]);
    ctx.strokeStyle = active ? COLORS.blue : COLORS.inactiveBorder;
    ctx.lineWidth = active ? 1.6 : 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = active ? COLORS.ink : COLORS.inactive;
    ctx.font = FONT_TITLE;
    ctx.fillText(box.title, CONTEXT_BOX.x + 16, box.y + 25);
    ctx.fillStyle = active ? COLORS.sub : COLORS.inactiveSub;
    ctx.font = FONT_SUB;
    ctx.fillText(box.sub, CONTEXT_BOX.x + 16, box.y + 43);

    if (!active) {
      ctx.fillStyle = COLORS.inactive;
      ctx.font = FONT_SUB;
      ctx.textAlign = 'right';
      ctx.fillText(
        '未声明',
        CONTEXT_BOX.x + CONTEXT_BOX.width - 12,
        box.y + 25,
      );
      ctx.textAlign = 'left';
    }
  }

  pathBox(ctx, CONTEXT_BOX.x, DOM_BOX.y, CONTEXT_BOX.width, CONTEXT_BOX.height);
  ctx.fillStyle = COLORS.domFill;
  ctx.fill();
  ctx.strokeStyle = COLORS.domBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = COLORS.domTitle;
  ctx.font = FONT_TITLE;
  ctx.fillText(DOM_BOX.title, CONTEXT_BOX.x + 16, DOM_BOX.y + 25);
  ctx.fillStyle = COLORS.sub;
  ctx.font = FONT_SUB;
  ctx.fillText(DOM_BOX.sub, CONTEXT_BOX.x + 16, DOM_BOX.y + 43);
}

function drawAssemblyArrows(
  ctx: CanvasRenderingContext2D,
  options: AssemblyOptions,
) {
  for (const box of CONTEXT_BOXES) {
    if (!options[box.key]) {
      continue;
    }
    drawPolyline(
      ctx,
      [
        [MANIFEST_BOX.x + MANIFEST_BOX.width, box.y + 29],
        [CONTEXT_BOX.x - 8, box.y + 29],
      ],
      { heads: 1, color: COLORS.assemble },
    );
  }
}

function drawChannels(
  ctx: CanvasRenderingContext2D,
  options: AssemblyOptions,
) {
  ctx.textAlign = 'left';
  if (options.serviceWorker && options.popup) {
    drawPolyline(ctx, [
      [710, 153],
      [732, 153],
      [732, 65],
      [710, 65],
    ]);
    ctx.fillStyle = COLORS.channel;
    ctx.font = FONT_LABEL;
    ctx.fillText('runtime 消息', 740, 113);
  }

  const extensionCy = options.serviceWorker ? 65 : options.popup ? 153 : null;
  if (extensionCy !== null && options.contentScript) {
    drawPolyline(ctx, [
      [710, extensionCy],
      [758, extensionCy],
      [758, 241],
      [710, 241],
    ]);
    ctx.fillStyle = COLORS.channel;
    ctx.font = FONT_LABEL;
    ctx.fillText('tabs 消息', 766, 209);
  }

  if (options.contentScript) {
    drawPolyline(ctx, [
      [585, 272],
      [585, 296],
    ]);
    ctx.fillStyle = COLORS.channel;
    ctx.font = FONT_LABEL;
    ctx.fillText('读写 DOM', 600, 289);
  }
}

function drawLegend(ctx: CanvasRenderingContext2D) {
  const rows = [
    { y: 388, dashed: false, color: COLORS.assemble, text: '已装配：manifest 中声明后存在' },
    { y: 408, dashed: true, color: COLORS.inactiveBorder, text: '未在 manifest 中声明' },
    { y: 428, dashed: false, color: COLORS.channel, text: '上下文之间的消息通道（双向）' },
  ];

  ctx.font = FONT_SUB;
  ctx.textAlign = 'left';
  for (const row of rows) {
    ctx.setLineDash(row.dashed ? [4, 4] : []);
    ctx.strokeStyle = row.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(460, row.y - 4);
    ctx.lineTo(496, row.y - 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.legend;
    ctx.fillText(row.text, 504, row.y);
  }
}
