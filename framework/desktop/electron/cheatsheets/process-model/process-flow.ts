/**
 * 范例介绍：在进程沙盘里演示渲染端请求系统能力的两条路径。
 * 输入：request = 'direct'（页面直接 require）或 'bridge'（经 preload 桥走 IPC）。
 * 操作：切换 Controls 里的「渲染端请求」，观察消息能否离开渲染进程、流经哪些环节。
 * 预期：direct 在渲染进程边界被拒（ReferenceError，消息不出进程）；
 *       bridge 依次流经 页面 → 预加载脚本 → IPC 通道 → 主进程，结果沿原路返回页面。
 * 阅读主线：职责边界即权限边界——没有权限的调用出不了渲染进程；
 *           有权限的请求必须绕道主进程执行，再沿同一条链路原路返回。
 */
import { createRenderLoop, readCanvasSize } from '../../assets/canvas-runtime.js';

export type RequestKind = 'direct' | 'bridge';

export interface FlowOptions {
  request: RequestKind;
}

export interface FlowSnapshot {
  requestLabel: string;
  resultLabel: string;
  routeLabel: string;
}

export interface FlowInstance {
  update(options: FlowOptions): void;
  dispose(): void;
}

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type AnchorName = 'page' | 'preload' | 'main' | 'blocked';
type SegmentKind = 'request' | 'return' | 'denied';
type LogKind = 'info' | 'ok' | 'error';

interface Segment {
  from: AnchorName;
  to: AnchorName;
  start: number;
  end: number;
  kind: SegmentKind;
}

interface LogItem {
  at: number;
  kind: LogKind;
  text: string;
}

interface Plan {
  duration: number;
  busy?: { start: number; end: number };
  segments: Segment[];
  logs: LogItem[];
}

/* 两条路径的时间线：秒为单位；logs 的 at 是该行日志出现的时刻。 */
const PLANS: Record<RequestKind, Plan> = {
  bridge: {
    duration: 4.6,
    busy: { start: 1.9, end: 2.9 },
    segments: [
      { from: 'page', to: 'preload', start: 0.1, end: 0.9, kind: 'request' },
      { from: 'preload', to: 'main', start: 1.1, end: 1.9, kind: 'request' },
      { from: 'main', to: 'preload', start: 2.9, end: 3.5, kind: 'return' },
      { from: 'preload', to: 'page', start: 3.7, end: 4.3, kind: 'return' },
    ],
    logs: [
      { at: 0, kind: 'info', text: '页面 调用 window.electronAPI.readFile()' },
      { at: 0.9, kind: 'info', text: '预加载脚本 转发：ipcRenderer.invoke("read-file")' },
      { at: 1.9, kind: 'info', text: '主进程 ipcMain.handle 接到请求，执行 fs.readFile' },
      { at: 2.9, kind: 'info', text: '主进程 读到内容，交给返回链路' },
      { at: 3.5, kind: 'info', text: '预加载脚本 结果经桥递回页面' },
      { at: 4.3, kind: 'ok', text: '页面 收到文本，Promise resolve' },
    ],
  },
  direct: {
    duration: 1.8,
    segments: [{ from: 'page', to: 'blocked', start: 0.1, end: 0.8, kind: 'denied' }],
    logs: [
      { at: 0, kind: 'info', text: '页面 直接调用 require("node:fs")' },
      { at: 0.8, kind: 'error', text: '✗ ReferenceError: require is not defined' },
      { at: 1.1, kind: 'info', text: '消息止步渲染进程，IPC 通道未被触达' },
    ],
  },
};

const COLORS = {
  panelBorder: '#cbd5e1',
  panelTitle: '#475569',
  boxFill: '#e2e8f0',
  boxText: '#172033',
  line: '#94a3b8',
  lineLabel: '#64748b',
  request: '#4f7cff',
  ok: '#15803d',
  error: '#b91c1c',
  info: '#475569',
};

export function createProcessFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FlowSnapshot) => void,
): FlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: FlowOptions = { request: 'bridge' };
  let elapsed = 0;
  let settled = false;

  function plan(): Plan {
    return PLANS[options.request];
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 布局：左侧渲染进程面板（含页面与预加载两个框），右侧主进程面板，中间 IPC 通道。
    const margin = 20;
    const innerWidth = width - margin * 2;
    const gap = Math.max(52, Math.min(innerWidth * 0.13, 110));
    const rendererWidth = Math.round(Math.min(innerWidth * 0.46, 380));
    const mainWidth = Math.max(130, innerWidth - gap - rendererWidth);

    const logLineHeight = 17;
    const logRows = 5;
    const logHeight = logLineHeight * logRows + 4;
    const panelY = 54;
    const panelHeight = Math.max(112, height - panelY - logHeight - 14);

    const rendererPanel: Rect = { x: margin, y: panelY, w: rendererWidth, h: panelHeight };
    const mainPanel: Rect = {
      x: margin + rendererWidth + gap,
      y: panelY,
      w: mainWidth,
      h: panelHeight,
    };

    const boxHeight = Math.max(36, Math.min(52, panelHeight * 0.24));
    const pageBox: Rect = {
      x: rendererPanel.x + 16,
      y: rendererPanel.y + 32,
      w: rendererWidth - 32,
      h: boxHeight,
    };
    const preloadBox: Rect = {
      x: pageBox.x,
      y: rendererPanel.y + panelHeight - boxHeight - 16,
      w: pageBox.w,
      h: boxHeight,
    };
    const mainBox: Rect = { x: mainPanel.x + 16, y: preloadBox.y, w: mainWidth - 32, h: boxHeight };

    const anchors: Record<AnchorName, Point> = {
      page: { x: pageBox.x + pageBox.w / 2, y: pageBox.y + boxHeight / 2 },
      preload: { x: preloadBox.x + preloadBox.w / 2, y: preloadBox.y + boxHeight / 2 },
      main: { x: mainBox.x, y: mainBox.y + boxHeight / 2 },
      blocked: { x: rendererPanel.x + rendererWidth - 6, y: pageBox.y + boxHeight / 2 },
    };

    drawPanel(rendererPanel, '渲染进程（Chromium · 默认无 Node）');
    drawPanel(mainPanel, '主进程（Node.js · 完整权限）');
    drawBox(pageBox, '页面');
    drawBox(preloadBox, '预加载脚本 · 受限 Node');
    drawBox(mainBox, '系统能力 fs · 窗口 · 菜单');

    // 页面 → 预加载脚本：contextBridge 暴露的接口
    drawArrow(
      { x: anchors.page.x, y: pageBox.y + boxHeight },
      { x: anchors.page.x, y: preloadBox.y },
      'contextBridge',
      pageBox,
    );

    // 预加载脚本 ↔ 主进程：IPC 通道
    const channelY = anchors.preload.y;
    const channelFrom = rendererPanel.x + rendererWidth;
    const channelTo = mainPanel.x;
    ctx.save();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(channelFrom, channelY);
    ctx.lineTo(channelTo, channelY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.lineLabel;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('IPC 通道', (channelFrom + channelTo) / 2, channelY - 9);

    // 主进程忙：处理请求期间给系统能力框加呼吸描边
    const current = plan();
    if (current.busy && elapsed >= current.busy.start && elapsed <= current.busy.end) {
      const pulse = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 10));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = COLORS.request;
      ctx.lineWidth = 3;
      roundRectPath(mainBox, 8);
      ctx.stroke();
      ctx.restore();
    }

    // 正在行进的消息点
    for (const segment of current.segments) {
      if (elapsed < segment.start || elapsed > segment.end) {
        continue;
      }
      const progress = ease((elapsed - segment.start) / (segment.end - segment.start));
      const from = anchors[segment.from];
      const to = anchors[segment.to];
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      drawDot(x, y, segment.kind === 'return' ? COLORS.ok : segment.kind === 'denied' ? COLORS.error : COLORS.request);
    }

    // 被拒后的定格标记：渲染进程边界上的红叉
    const denied = current.segments.find((segment) => segment.kind === 'denied');
    if (denied && elapsed >= denied.end) {
      drawDeniedBadge(anchors.blocked);
    }

    // 底部日志条：按时间线逐条出现
    const visible = current.logs.filter((entry) => entry.at <= elapsed).slice(-logRows);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    let logY = height - logHeight + 16;
    for (const entry of visible) {
      ctx.fillStyle =
        entry.kind === 'error' ? COLORS.error : entry.kind === 'ok' ? COLORS.ok : COLORS.info;
      ctx.fillText(truncate(entry.text, width - margin * 2), margin, logY);
      logY += logLineHeight;
    }
  }

  function drawPanel(rect: Rect, title: string) {
    ctx.fillStyle = '#ffffff';
    roundRectPath(rect, 10);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.panelTitle;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(truncate(title, rect.w - 24), rect.x + 12, rect.y + 20);
  }

  function drawBox(rect: Rect, label: string) {
    ctx.fillStyle = COLORS.boxFill;
    roundRectPath(rect, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.boxText;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(label, rect.w - 16), rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  function drawArrow(from: Point, to: Point, label: string, bounds: Rect) {
    ctx.save();
    ctx.strokeStyle = COLORS.line;
    ctx.fillStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 4, to.y - 7);
    ctx.lineTo(to.x + 4, to.y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = COLORS.lineLabel;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const labelWidth = ctx.measureText(label).width;
    let labelX = from.x + 8;
    if (labelX + labelWidth > bounds.x + bounds.w) {
      labelX = from.x - 8 - labelWidth;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX, (from.y + to.y) / 2);
  }

  function drawDot(x: number, y: number, color: string) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  function drawDeniedBadge(point: Point) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.error;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x - 4, point.y - 4);
    ctx.lineTo(point.x + 4, point.y + 4);
    ctx.moveTo(point.x + 4, point.y - 4);
    ctx.lineTo(point.x - 4, point.y + 4);
    ctx.stroke();
    ctx.restore();
  }

  function roundRectPath(rect: Rect, radius: number) {
    const { x, y, w, h } = rect;
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function truncate(text: string, maxWidth: number) {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let clipped = text;
    while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}…`;
  }

  function ease(t: number) {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }

  function snapshotFor(): FlowSnapshot {
    const running = elapsed < plan().duration;
    if (options.request === 'direct') {
      return {
        requestLabel: '直接 require（渲染端）',
        resultLabel: running ? '调用中…' : 'ReferenceError：被拒',
        routeLabel: '止步于渲染进程，IPC 未触达',
      };
    }
    return {
      requestLabel: '经 preload 桥 → 主进程',
      resultLabel: running ? '请求进行中…' : '成功：文本原路返回页面',
      routeLabel: '页面 → 预加载脚本 → IPC → 主进程 → 原路返回',
    };
  }

  const loop = createRenderLoop(canvas, (delta) => {
    if (settled) {
      return;
    }
    elapsed = Math.min(elapsed + delta, plan().duration);
    draw();
    emit(snapshotFor());
    if (elapsed >= plan().duration) {
      settled = true;
    }
  });

  const resizeObserver = createResizeObserver(canvas, () => {
    settled = false;
  });

  return {
    update(next: FlowOptions) {
      options = { ...next };
      elapsed = 0;
      settled = false;
    },
    dispose() {
      resizeObserver.disconnect();
      loop.dispose();
    },
  };
}
