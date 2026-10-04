/**
 * 范例介绍：协议地图——同一个自动化任务在 CDP、Puppeteer、Playwright、
 * chrome-devtools-mcp 四层入口里各叫什么。
 * 输入或前置状态：Controls 选择自动化任务（截图 / PDF / 性能追踪 / 网络拦截 /
 * 设备模拟 / 输入自动化）；映射数据核对自 CDP 协议查看器与各工具官方文档。
 * 主要操作：切换任务，Canvas 按四层重画映射卡。
 * 预期结果：每层显示该任务对应的域.方法 / API / 工具名；chrome-devtools-mcp
 * 行按覆盖度着色（绿=已覆盖、黄=部分覆盖、红=未覆盖），readout 给出判断。
 * 阅读主线：CDP 是公共协议通道，工具名只是不同高度的封装；MCP 未覆盖的任务
 * 要落到 Puppeteer / Playwright。本演示是静态查询器，不建立任何真实连接；
 * 手工跑真实 CDP 会话见正文「最小 CDP 会话」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TaskId =
  | 'screenshot'
  | 'pdf'
  | 'trace'
  | 'intercept'
  | 'emulate'
  | 'input';

export type McpCoverage = 'full' | 'partial' | 'none';

export interface TaskMapping {
  task: string;
  goal: string;
  cdp: string;
  puppeteer: string;
  playwright: string;
  mcp: string;
  coverage: McpCoverage;
  verdict: string;
}

export interface ProtocolMapOptions {
  task: TaskId;
}

export interface ProtocolMapSnapshot {
  taskLabel: string;
  mcpStatus: string;
  verdict: string;
}

export interface ProtocolMapInstance {
  update(options: ProtocolMapOptions): void;
  dispose(): void;
}

export const COVERAGE_TEXT: Record<McpCoverage, string> = {
  full: '已覆盖',
  partial: '部分覆盖',
  none: '未覆盖',
};

/* 覆盖度核对自 chrome-devtools-mcp 的 Tool Reference（docs/tool-reference.md）。 */
export const TASK_MAPPINGS: Record<TaskId, TaskMapping> = {
  screenshot: {
    task: '截图',
    goal: '把页面像素存成图片',
    cdp: 'Page.captureScreenshot',
    puppeteer: 'page.screenshot()',
    playwright: 'page.screenshot()',
    mcp: 'take_screenshot',
    coverage: 'full',
    verdict: '四层全通：一条 CDP 命令，各家都直接封装',
  },
  pdf: {
    task: 'PDF',
    goal: '把页面按打印样式导出 PDF',
    cdp: 'Page.printToPDF',
    puppeteer: 'page.pdf()',
    playwright: 'page.pdf()（仅 Chromium）',
    mcp: '工具集中没有 PDF 工具',
    coverage: 'none',
    verdict: 'MCP 不覆盖：要 PDF 走 Puppeteer / Playwright 或直发 CDP 命令',
  },
  trace: {
    task: '性能追踪',
    goal: '录一段轨迹再分析瓶颈',
    cdp: 'Tracing.start / Tracing.end\ndataCollected 事件 → tracingComplete',
    puppeteer: 'page.tracing.start() / .stop()（导出 Chrome trace）',
    playwright: 'context.tracing.start() / .stop()\n（自有 trace 格式，配 Trace Viewer）',
    mcp: 'performance_start_trace\nperformance_stop_trace / performance_analyze_insight',
    coverage: 'full',
    verdict: 'MCP 直接给分析结论；Playwright 的 trace 是自有格式',
  },
  intercept: {
    task: '网络拦截',
    goal: '改写、伪造或阻断请求',
    cdp: 'Fetch.enable → Fetch.requestPaused\nfulfillRequest / failRequest / continueRequest',
    puppeteer: 'page.setRequestInterception(true)\nrequest.respond() / abort() / continue()',
    playwright: 'page.route() 拦截\nroute.fulfill() / abort() / continue()',
    mcp: 'list_network_requests / get_network_request\n（只读，不能改写请求）',
    coverage: 'none',
    verdict: 'MCP 只看不改：改写请求要落到 Puppeteer / Playwright',
  },
  emulate: {
    task: '设备模拟',
    goal: '模拟视口、UA、触摸与网络条件',
    cdp: 'Emulation.setDeviceMetricsOverride / setUserAgentOverride\nsetTouchEmulationEnabled',
    puppeteer: 'page.setViewport() / page.setUserAgent()\npage.emulate(devices[...])',
    playwright: 'browser.newContext({ ...devices[...] })\npage.setViewportSize()',
    mcp: 'emulate（CPU 节流 / 网络条件）+ resize_page',
    coverage: 'partial',
    verdict: 'MCP 只到节流与视口：UA、触摸走 Puppeteer / Playwright',
  },
  input: {
    task: '输入自动化',
    goal: '模拟点击、键盘与表单输入',
    cdp: 'Input.dispatchMouseEvent / dispatchKeyEvent',
    puppeteer: 'page.mouse / page.keyboard\npage.click() / page.type()',
    playwright: 'locator.click() / page.keyboard\npage.mouse',
    mcp: 'click / fill / press_key / hover …',
    coverage: 'full',
    verdict: '输入是 MCP 的主战场：Agent 靠这组工具操作页面',
  },
};

const COVERAGE_COLOR: Record<McpCoverage, { fg: string; bg: string }> = {
  full: { fg: '#166534', bg: 'rgba(34, 197, 94, 0.16)' },
  partial: { fg: '#92400e', bg: 'rgba(245, 158, 11, 0.18)' },
  none: { fg: '#be123c', bg: 'rgba(244, 63, 94, 0.14)' },
};

interface Layer {
  key: 'cdp' | 'puppeteer' | 'playwright' | 'mcp';
  label: string;
}

const LAYERS: Layer[] = [
  { key: 'cdp', label: 'CDP 域与方法' },
  { key: 'puppeteer', label: 'Puppeteer' },
  { key: 'playwright', label: 'Playwright' },
  { key: 'mcp', label: 'chrome-devtools-mcp' },
];

const FONT_TITLE = '600 16px ui-sans-serif, system-ui, sans-serif';
const FONT_GOAL = '12px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '600 11px ui-sans-serif, system-ui, sans-serif';
const FONT_VALUE = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
const VALUE_LINE_HEIGHT = 17;

export function createProtocolMap(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProtocolMapSnapshot) => void,
): ProtocolMapInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ProtocolMapOptions = { task: 'screenshot' };

  /* 数据里已按 \n 分好行；超长行按字符折行兜底——CJK 与代码标识符混排，按词切不可靠。 */
  function wrapText(text: string, maxWidth: number): string[] {
    return text.split('\n').flatMap((segment) => {
      if (drawingContext.measureText(segment).width <= maxWidth) {
        return [segment];
      }
      const lines: string[] = [];
      let line = '';
      for (const char of segment) {
        if (line && drawingContext.measureText(line + char).width > maxWidth) {
          lines.push(line);
          line = char;
        } else {
          line += char;
        }
      }
      if (line) {
        lines.push(line);
      }
      return lines;
    });
  }

  /* 覆盖度胶囊：右对齐；仅当与首行值不重叠、画布够宽时才绘制，否则由 readout 承担。 */
  function drawCoveragePill(
    mapping: TaskMapping,
    firstLineEnd: number,
    rowTop: number,
    width: number,
    pad: number,
  ) {
    const coverage = COVERAGE_COLOR[mapping.coverage];
    drawingContext.font = FONT_LABEL;
    const text = COVERAGE_TEXT[mapping.coverage];
    const pillWidth = drawingContext.measureText(text).width + 16;
    const x = width - pad - pillWidth;
    if (x < firstLineEnd + 12) {
      return;
    }
    drawingContext.fillStyle = coverage.bg;
    drawingContext.beginPath();
    if (typeof drawingContext.roundRect === 'function') {
      drawingContext.roundRect(x, rowTop + 2, pillWidth, 18, 9);
    } else {
      drawingContext.rect(x, rowTop + 2, pillWidth, 18);
    }
    drawingContext.fill();
    drawingContext.fillStyle = coverage.fg;
    drawingContext.fillText(text, x + 8, rowTop + 15);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const mapping = TASK_MAPPINGS[current.task];
    const pad = 18;
    const labelColumn = 150;
    const valueWidth = width - pad * 2 - labelColumn;

    drawingContext.font = FONT_VALUE;
    const rows = LAYERS.map((layer) => ({
      ...layer,
      lines: wrapText(mapping[layer.key], valueWidth),
    }));

    const headerHeight = 66;
    const rowHeight = (lineCount: number) => 26 + lineCount * VALUE_LINE_HEIGHT + 10;
    /* 底部留白避开左下角的 readout 覆盖层。 */
    const bottomReserve = 64;
    const naturalHeight =
      headerHeight +
      rows.reduce((sum, row) => sum + rowHeight(row.lines.length), 0) +
      bottomReserve;
    /* 行高随任务变化，总高超出画布时整体等比缩小，保证六个任务都可读。 */
    const scale = Math.min(1, height / naturalHeight);

    drawingContext.save();
    drawingContext.translate((width - width * scale) / 2, 0);
    drawingContext.scale(scale, scale);

    // 头部：任务名 + 一句话目标
    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText(mapping.task, pad, 32);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = FONT_GOAL;
    drawingContext.fillText(mapping.goal, pad, 52);
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.moveTo(pad, headerHeight - 8);
    drawingContext.lineTo(width - pad, headerHeight - 8);
    drawingContext.stroke();

    let y = headerHeight;
    rows.forEach((row, index) => {
      const rowTop = y;
      const isMcpRow = row.key === 'mcp';

      // chrome-devtools-mcp 行的标签直接按覆盖度着色：绿=已覆盖、黄=部分、红=未覆盖
      drawingContext.fillStyle = isMcpRow
        ? COVERAGE_COLOR[mapping.coverage].fg
        : '#64748b';
      drawingContext.font = FONT_LABEL;
      drawingContext.fillText(row.label, pad, rowTop + 16);

      drawingContext.fillStyle = '#1e293b';
      drawingContext.font = FONT_VALUE;
      row.lines.forEach((line, lineIndex) => {
        drawingContext.fillText(
          line,
          pad + labelColumn,
          rowTop + 16 + lineIndex * VALUE_LINE_HEIGHT,
        );
      });

      if (isMcpRow && valueWidth >= 240) {
        const firstLineEnd = pad + labelColumn + drawingContext.measureText(row.lines[0]).width;
        drawCoveragePill(mapping, firstLineEnd, rowTop, width, pad);
      }

      y += rowHeight(row.lines.length);
      if (index < rows.length - 1) {
        drawingContext.strokeStyle = '#e2e8f0';
        drawingContext.beginPath();
        drawingContext.moveTo(pad, y - 5);
        drawingContext.lineTo(width - pad, y - 5);
        drawingContext.stroke();
      }
    });

    drawingContext.restore();

    emit({
      taskLabel: mapping.task,
      mcpStatus: COVERAGE_TEXT[mapping.coverage],
      verdict: mapping.verdict,
    });
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
