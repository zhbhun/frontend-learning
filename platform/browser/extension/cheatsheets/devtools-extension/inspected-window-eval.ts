/**
 * 范例介绍：inspectedWindow.eval 的执行位置与返回形态演算。
 * 演示内容：eval 默认在被检查页面的主框架执行，frameURL 可切换到 URL 匹配的 iframe；
 *   useContentScriptContext 让表达式跑在本扩展 content script 已注入的上下文；返回
 *   值必须是可 JSON 化的对象，DOM 节点等不可序列化值时以异常结束。
 * 输入：要计算的表达式、执行框架、是否使用 content script 上下文、content script
 *   是否已注入、页面上是否选中了元素。
 * 操作：在 Controls 中调整五项输入。
 * 预期结果：左栏画出被检查页面与 iframe；中栏给出完整的 eval 调用；右栏显示 JSON
 *   结果或异常（含 code），与表达式求值位置一致。
 * 阅读主线：左栏是「在哪执行」，中栏是「怎么调用」，右栏是「得到什么」，三者同源。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 参与演算的表达式。 */
export type Expression = 'images' | 'href' | 'selected' | 'body';

/** 执行框架：主框架或 iframe。 */
export type EvalFrame = 'top' | 'iframe';

export interface InspectedWindowEvalOptions {
  expression: Expression;
  frame: EvalFrame;
  useContentScriptContext: boolean;
  contentScriptInjected: boolean;
  selectedElement: boolean;
}

export interface InspectedWindowEvalSnapshot {
  frameLabel: string;
  contextLabel: string;
  resultLabel: string;
  exceptionLabel: string;
}

export interface InspectedWindowEvalInstance {
  update(options: InspectedWindowEvalOptions): void;
  dispose(): void;
}

/** 画布逻辑坐标系：布局写在 840x420 内，按舞台尺寸整体缩放。 */
const DESIGN_WIDTH = 840;
const DESIGN_HEIGHT = 420;

const PAGE_BOX = { x: 24, y: 36, width: 356, height: 348 };
const CALL_BOX = { x: 396, y: 36, width: 168, height: 348 };
const RESULT_BOX = { x: 580, y: 36, width: 236, height: 348 };

const COLORS = {
  ink: '#172033',
  sub: '#5b6b81',
  muted: '#7c8aa0',
  code: '#33415c',
  blue: '#4f7cff',
  blueSoft: '#eef3ff',
  green: '#15803d',
  greenSoft: '#ecfdf3',
  red: '#b91c1c',
  redSoft: '#fef2f2',
  gray: '#64748b',
  graySoft: '#f1f5f9',
  yellow: '#fde68a',
  boxBorder: '#cbd5e1',
  stage: '#f8fafc',
  white: '#ffffff',
  line: '#e2e8f0',
};

const FONT_CODE = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 10.5px ui-sans-serif, system-ui, sans-serif';
const FONT_SUB = '10px ui-sans-serif, system-ui, sans-serif';
const FONT_URL = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

const EXPRESSION_TEXT: Record<Expression, string> = {
  images: 'document.images.length',
  href: 'location.href',
  selected: '$0.tagName',
  body: 'document.body',
};

const FRAME_URL = 'https://frame.example.net/';

interface Evaluation {
  ok: boolean;
  /** ok 时是可 JSON 化的值文本 */
  value: string;
  /** 异常时的说明 */
  message: string;
}

/** 纯函数推导：表达式 + 执行位置 + 上下文 → 结果或异常。 */
export function evaluateEval(options: InspectedWindowEvalOptions): Evaluation {
  // 1. content script 上下文不可用时：isError + code E_NOTFOUND
  if (options.useContentScriptContext && !options.contentScriptInjected) {
    return {
      ok: false,
      value: '',
      message: 'E_NOTFOUND：content script 未注入，不能进入其上下文',
    };
  }

  // 2. 返回值不可 JSON 化时抛异常
  if (options.expression === 'body') {
    return {
      ok: false,
      value: '',
      message: '表达式必须返回可 JSON 化的对象（DOM 节点不行）',
    };
  }

  // 3. 未选中元素时 $0 未定义
  if (options.expression === 'selected' && !options.selectedElement) {
    return {
      ok: false,
      value: '',
      message: 'ReferenceError: $0 is not defined（未选中元素）',
    };
  }

  const inIframe = options.frame === 'iframe';
  switch (options.expression) {
    case 'images':
      return { ok: true, value: inIframe ? '1' : '3', message: '' };
    case 'href':
      return {
        ok: true,
        value: inIframe ? `"${FRAME_URL}"` : '"https://example.com/shop"',
        message: '',
      };
    case 'selected':
      return { ok: true, value: '"H2"', message: '' };
    default:
      return { ok: true, value: '', message: '' };
  }
}

function buildSnapshot(
  options: InspectedWindowEvalOptions,
): InspectedWindowEvalSnapshot {
  const evaluation = evaluateEval(options);
  return {
    frameLabel:
      options.frame === 'iframe'
        ? `iframe（frameURL: ${FRAME_URL}）`
        : 'top（主框架，默认）',
    contextLabel: options.useContentScriptContext
      ? 'content script 上下文'
      : '页面上下文（默认）',
    resultLabel: evaluation.ok
      ? `result = ${evaluation.value}`
      : `异常：${evaluation.message}`,
    exceptionLabel: evaluation.ok ? 'false' : 'true',
  };
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
  ctx.arcTo(x + width, y + height, x, y, radius);
  ctx.arcTo(x + width, y, x, y, radius);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  title: string,
) {
  pathBox(ctx, box.x, box.y, box.width, box.height);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.boxBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_TITLE;
  ctx.fillText(title, box.x + 16, box.y + 28);
}

function drawInspectedPage(
  ctx: CanvasRenderingContext2D,
  options: InspectedWindowEvalOptions,
) {
  const { x, y, width, height } = PAGE_BOX;
  drawFrame(ctx, PAGE_BOX, '被检查的页面（模拟）');

  // 地址栏
  const barY = y + 40;
  pathBox(ctx, x + 12, barY, width - 24, 24, 6);
  ctx.fillStyle = COLORS.graySoft;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.code;
  ctx.font = FONT_URL;
  ctx.fillText('https://example.com/shop', x + 24, barY + 16);

  // head 示意
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('<head>', x + 16, barY + 40);
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(x + 78, barY + 32, width - 110, 8);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('app.js', x + 130, barY + 40);

  // 图片区
  const imgY = barY + 62;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('document.images', x + 16, imgY);
  for (let index = 0; index < 3; index += 1) {
    const boxX = x + 22 + index * 62;
    pathBox(ctx, boxX, imgY + 8, 52, 40, 5);
    ctx.fillStyle = COLORS.graySoft;
    ctx.fill();
    ctx.strokeStyle = COLORS.boxBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'center';
    ctx.fillText('img', boxX + 26, imgY + 32);
    ctx.textAlign = 'left';
  }

  // 选中元素（$0）
  const selY = imgY + 66;
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText(
    options.selectedElement ? '$0 = 选中的元素' : '$0 = 未定义（未选中）',
    x + 16,
    selY,
  );
  pathBox(ctx, x + 16, selY + 8, 180, 26, 5);
  ctx.fillStyle = options.selectedElement ? COLORS.yellow : COLORS.graySoft;
  ctx.fill();
  ctx.strokeStyle = options.selectedElement ? '#d97706' : COLORS.line;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONT_LABEL;
  ctx.fillText(
    options.selectedElement ? '<h2>春季新品</h2>' : '（未选中任何元素）',
    x + 24,
    selY + 25,
  );

  // iframe
  const frameX = x + 212;
  const frameY = selY + 6;
  const frameW = width - 224;
  const frameH = 64;
  pathBox(ctx, frameX, frameY, frameW, frameH, 5);
  ctx.fillStyle =
    options.frame === 'iframe' ? COLORS.blueSoft : COLORS.white;
  ctx.fill();
  ctx.strokeStyle = options.frame === 'iframe' ? COLORS.blue : COLORS.boxBorder;
  ctx.lineWidth = options.frame === 'iframe' ? 1.6 : 1;
  ctx.stroke();
  ctx.fillStyle = options.frame === 'iframe' ? COLORS.blue : COLORS.muted;
  ctx.font = FONT_LABEL;
  ctx.fillText('iframe', frameX + 8, frameY + 16);
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_URL;
  ctx.fillText(FRAME_URL, frameX + 8, frameY + 30);
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(frameX + 8, frameY + 38, frameW - 16, 5);
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('内含 1 张 img', frameX + 8, frameY + 54);

  // 底部说明
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  const activeFrame = options.frame === 'iframe' ? 'iframe' : '主框架';
  ctx.fillText(
    `当前执行位置：${activeFrame}${options.frame === 'iframe' ? '（frameURL 匹配）' : '（默认）'}`,
    x + 16,
    y + height - 16,
  );
}

function drawCall(
  ctx: CanvasRenderingContext2D,
  options: InspectedWindowEvalOptions,
) {
  const { x, y, width, height } = CALL_BOX;
  drawFrame(ctx, CALL_BOX, 'eval 调用');

  const lines: Array<{ text: string; color: string }> = [
    { text: 'chrome.devtools', color: COLORS.blue },
    { text: '  .inspectedWindow', color: COLORS.blue },
    { text: '  .eval(', color: COLORS.blue },
    { text: `  "${EXPRESSION_TEXT[options.expression]}",`, color: COLORS.code },
  ];
  const optionLines: string[] = [];
  if (options.frame === 'iframe') {
    optionLines.push(`frameURL: "${FRAME_URL}"`);
  }
  if (options.useContentScriptContext) {
    optionLines.push('useContentScriptContext: true');
  }
  if (optionLines.length > 0) {
    lines.push({ text: '  {', color: COLORS.code });
    optionLines.forEach((line, index) => {
      lines.push({
        text: `    ${line}${index === optionLines.length - 1 ? '' : ','}`,
        color: COLORS.code,
      });
    });
    lines.push({ text: '  }', color: COLORS.code });
  }
  lines.push({ text: ')', color: COLORS.blue });

  let lineY = y + 52;
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = FONT_CODE;
    // 调用代码较长（如 frameURL 取值），按框宽换行，续行缩进对齐参数区
    const wrapped = wrapToWidth(ctx, line.text, width - 24);
    wrapped.forEach((text, index) => {
      ctx.fillText(index === 0 ? text : `  ${text}`, x + 12, lineY);
      lineY += 15;
    });
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONT_SUB;
  ctx.fillText('回调参数 (result, isException)', x + 12, lineY + 10);
  lineY += 24;
  ctx.fillStyle = COLORS.muted;
  for (const line of wrapToWidth(
    ctx,
    '必须在 DevTools 页面、面板或侧栏内调用',
    width - 24,
  )) {
    ctx.fillText(line, x + 12, lineY);
    lineY += 14;
  }
}

function drawResult(
  ctx: CanvasRenderingContext2D,
  options: InspectedWindowEvalOptions,
) {
  const { x, y, width, height } = RESULT_BOX;
  const evaluation = evaluateEval(options);
  drawFrame(ctx, RESULT_BOX, '结果');

  const bodyY = y + 44;
  const bodyH = height - 60;

  pathBox(ctx, x + 12, bodyY, width - 24, bodyH, 6);
  ctx.fillStyle = evaluation.ok ? COLORS.greenSoft : COLORS.redSoft;
  ctx.fill();
  ctx.strokeStyle = evaluation.ok ? '#a7f3d0' : '#fecaca';
  ctx.lineWidth = 1;
  ctx.stroke();

  let lineY = bodyY + 24;
  ctx.textAlign = 'left';
  ctx.font = FONT_LABEL;
  ctx.fillStyle = evaluation.ok ? COLORS.green : COLORS.red;
  ctx.fillText(
    `isException: ${evaluation.ok ? 'false' : 'true'}`,
    x + 24,
    lineY,
  );
  lineY += 22;

  ctx.font = FONT_CODE;
  if (evaluation.ok) {
    ctx.fillStyle = COLORS.code;
    ctx.fillText('{', x + 24, lineY);
    lineY += 16;
    ctx.fillText('  "result":', x + 24, lineY);
    lineY += 16;
    ctx.fillText(`    ${evaluation.value}`, x + 32, lineY);
    lineY += 16;
    ctx.fillText('}', x + 24, lineY);
  } else {
    ctx.fillStyle = COLORS.red;
    for (const line of wrapToWidth(
      ctx,
      evaluation.message,
      width - 56,
    )) {
      ctx.fillText(line, x + 24, lineY);
      lineY += 15;
    }
    lineY += 8;
    ctx.fillStyle = COLORS.muted;
    ctx.font = FONT_SUB;
    ctx.fillText('result 为 undefined', x + 24, lineY);
  }
}

export function createInspectedWindowEvalExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InspectedWindowEvalSnapshot) => void,
): InspectedWindowEvalInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: InspectedWindowEvalOptions = {
    expression: 'images',
    frame: 'top',
    useContentScriptContext: false,
    contentScriptInjected: true,
    selectedElement: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const ctx = drawingContext;
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

    drawInspectedPage(ctx, current);
    drawCall(ctx, current);
    drawResult(ctx, current);

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
