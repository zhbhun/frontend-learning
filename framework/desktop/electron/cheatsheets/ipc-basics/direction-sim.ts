/**
 * 范例介绍：方向选择器沙盘——四个通信方向各用哪对 API、消息怎么流、有没有回音。
 * 输入：direction = 'invoke' | 'send' | 'push' | 'between'。
 * 操作：切换 Controls 里的「通信方向」，对照读数中的发起端 / 接收端 / 通道 / 回音方式，
 *       观察消息点的走向与是否出现回程。
 * 预期：invoke/handle 的请求到达主进程后，结果沿原路返回（Promise resolve）；
 *       send/on 只有去程，渲染端发完即忘；
 *       webContents.send 从主进程出发，只到达被点名的窗口，由 ipcRenderer.on 接住；
 *       渲染进程之间没有直接 API，消息必须经主进程中转。
 * 阅读主线：方向由「谁发起、要不要回音」决定，选定方向就选定了 API 配对；
 *           真实 Electron 无法在浏览器里运行，这是对消息流向与 API 配对的模拟。
 */
import { createRenderLoop, readCanvasSize } from '../../assets/canvas-runtime.js';

export type DirectionKind = 'invoke' | 'send' | 'push' | 'between';

export interface DirectionOptions {
  direction: DirectionKind;
}

export interface DirectionSnapshot {
  directionLabel: string;
  senderLabel: string;
  receiverLabel: string;
  channelLabel: string;
  replyLabel: string;
}

export interface DirectionInstance {
  update(options: DirectionOptions): void;
  dispose(): void;
}

type AnchorName = 'page' | 'preload' | 'listener' | 'main' | 'winA' | 'winB';
type RowName = 'top' | 'bottom' | 'center';
type SegmentKind = 'request' | 'return';
type LogKind = 'info' | 'ok';

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

interface BoxSpec {
  id: AnchorName;
  label: string;
  row: RowName;
}

interface PanelSpec {
  title: string;
  boxes: BoxSpec[];
}

interface ChannelSpec {
  gap: number;
  row: RowName;
}

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
  panels: PanelSpec[];
  channels: ChannelSpec[];
  segments: Segment[];
  logs: LogItem[];
  snapshot: DirectionSnapshot;
}

/* 四个方向的时间线：秒为单位；logs 的 at 是该行日志出现的时刻。 */
const PLANS: Record<DirectionKind, Plan> = {
  invoke: {
    duration: 4.6,
    busy: { start: 1.9, end: 2.9 },
    panels: [
      {
        title: '渲染进程',
        boxes: [
          { id: 'page', label: '页面', row: 'top' },
          { id: 'preload', label: '预加载脚本', row: 'bottom' },
        ],
      },
      { title: '主进程', boxes: [{ id: 'main', label: 'ipcMain.handle', row: 'bottom' }] },
    ],
    channels: [{ gap: 0, row: 'bottom' }],
    segments: [
      { from: 'page', to: 'preload', start: 0.1, end: 0.9, kind: 'request' },
      { from: 'preload', to: 'main', start: 1.1, end: 1.9, kind: 'request' },
      { from: 'main', to: 'preload', start: 2.9, end: 3.5, kind: 'return' },
      { from: 'preload', to: 'page', start: 3.7, end: 4.3, kind: 'return' },
    ],
    logs: [
      { at: 0, kind: 'info', text: '页面 await window.api.pickFile() —— 经暴露面发起' },
      { at: 0.9, kind: 'info', text: "预加载脚本 ipcRenderer.invoke('dialog:open-file')" },
      { at: 1.9, kind: 'info', text: '主进程 ipcMain.handle 接住，执行系统能力' },
      { at: 2.9, kind: 'info', text: '主进程 handler 返回值交给返回链路' },
      { at: 3.5, kind: 'info', text: '预加载脚本 结果沿原路递回' },
      { at: 4.3, kind: 'ok', text: '页面 await 拿到结果；handler 抛错则 Promise reject' },
    ],
    snapshot: {
      directionLabel: '渲染 → 主 · 请求响应',
      senderLabel: 'ipcRenderer.invoke',
      receiverLabel: 'ipcMain.handle',
      channelLabel: "'dialog:open-file'",
      replyLabel: 'Promise resolve 返回结果',
    },
  },
  send: {
    duration: 3.6,
    busy: { start: 1.9, end: 2.5 },
    panels: [
      {
        title: '渲染进程',
        boxes: [
          { id: 'page', label: '页面', row: 'top' },
          { id: 'preload', label: '预加载脚本', row: 'bottom' },
        ],
      },
      { title: '主进程', boxes: [{ id: 'main', label: 'ipcMain.on', row: 'bottom' }] },
    ],
    channels: [{ gap: 0, row: 'bottom' }],
    segments: [
      { from: 'page', to: 'preload', start: 0.1, end: 0.9, kind: 'request' },
      { from: 'preload', to: 'main', start: 1.1, end: 1.9, kind: 'request' },
    ],
    logs: [
      { at: 0, kind: 'info', text: '页面 window.notes.save(text) —— 经暴露面发起' },
      { at: 0.9, kind: 'info', text: "预加载脚本 ipcRenderer.send('note:save', text)" },
      { at: 1.9, kind: 'info', text: '主进程 ipcMain.on 收到，自行处理' },
      { at: 2.7, kind: 'info', text: '渲染端不等结果：send 发完即忘，没有回程' },
      { at: 3.3, kind: 'ok', text: '需要结果时应改用 invoke / handle' },
    ],
    snapshot: {
      directionLabel: '渲染 → 主 · 单向',
      senderLabel: 'ipcRenderer.send',
      receiverLabel: 'ipcMain.on',
      channelLabel: "'note:save'",
      replyLabel: '无：发完即忘',
    },
  },
  push: {
    duration: 3.6,
    panels: [
      {
        title: '渲染进程',
        boxes: [
          { id: 'listener', label: 'ipcRenderer.on', row: 'top' },
          { id: 'page', label: '页面', row: 'bottom' },
        ],
      },
      { title: '主进程', boxes: [{ id: 'main', label: 'webContents.send', row: 'top' }] },
    ],
    channels: [{ gap: 0, row: 'top' }],
    segments: [
      { from: 'main', to: 'listener', start: 0.1, end: 0.9, kind: 'request' },
      { from: 'listener', to: 'page', start: 1.1, end: 1.9, kind: 'request' },
    ],
    logs: [
      { at: 0, kind: 'info', text: '主进程 事件发生：用户点了应用菜单' },
      { at: 0.9, kind: 'info', text: "主进程 win.webContents.send('counter:change', 3)" },
      { at: 1.9, kind: 'info', text: '渲染端 ipcRenderer.on 收到：只达被点名的窗口' },
      { at: 2.6, kind: 'info', text: '预加载脚本 回调把值递进页面，不暴露 event' },
      { at: 3.3, kind: 'ok', text: '没有推送版 invoke：需要回应就反向再发一条通道' },
    ],
    snapshot: {
      directionLabel: '主 → 渲染 · 推送',
      senderLabel: 'webContents.send',
      receiverLabel: 'ipcRenderer.on',
      channelLabel: "'counter:change'",
      replyLabel: '无：需要回应时反向发新消息',
    },
  },
  between: {
    duration: 3.4,
    busy: { start: 0.9, end: 1.4 },
    panels: [
      { title: '窗口 A（渲染进程）', boxes: [{ id: 'winA', label: 'ipcRenderer.send', row: 'center' }] },
      { title: '主进程', boxes: [{ id: 'main', label: '转发', row: 'center' }] },
      { title: '窗口 B（渲染进程）', boxes: [{ id: 'winB', label: 'ipcRenderer.on', row: 'center' }] },
    ],
    channels: [
      { gap: 0, row: 'center' },
      { gap: 1, row: 'center' },
    ],
    segments: [
      { from: 'winA', to: 'main', start: 0.1, end: 0.9, kind: 'request' },
      { from: 'main', to: 'winB', start: 1.4, end: 2.2, kind: 'request' },
    ],
    logs: [
      { at: 0, kind: 'info', text: "窗口 A ipcRenderer.send('task:created', task)" },
      { at: 0.9, kind: 'info', text: '主进程 ipcMain.on 收到：渲染进程间没有直接 API' },
      { at: 1.4, kind: 'info', text: "主进程 winB.webContents.send('task:new', task) 转发" },
      { at: 2.2, kind: 'info', text: '窗口 B ipcRenderer.on 收到' },
      { at: 3.0, kind: 'ok', text: '高频或大数据量时改用 MessagePort 直连（下一课）' },
    ],
    snapshot: {
      directionLabel: '渲染 ↔ 渲染 · 主进程中转',
      senderLabel: 'ipcRenderer.send → webContents.send',
      receiverLabel: 'ipcRenderer.on',
      channelLabel: "'task:created' / 'task:new'",
      replyLabel: '主进程编排，或 MessagePort 直连',
    },
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
  return: '#15803d',
  ok: '#15803d',
  info: '#475569',
};

export function createDirectionSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DirectionSnapshot) => void,
): DirectionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: DirectionOptions = { direction: 'invoke' };
  let elapsed = 0;
  let settled = false;

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const plan = PLANS[options.direction];
    const margin = 20;
    const innerWidth = width - margin * 2;
    const between = options.direction === 'between';
    const gap = between
      ? Math.max(40, innerWidth * 0.08)
      : Math.max(52, Math.min(innerWidth * 0.13, 110));
    const logLineHeight = 16;
    const logRows = 5;
    const logHeight = logLineHeight * logRows + 4;
    const panelY = 46;
    const panelHeight = Math.max(120, height - panelY - logHeight - 14);

    // 面板布局：主-渲染方向两块面板；渲染进程间为 窗口 A | 主进程 | 窗口 B 三块。
    const rects: Rect[] = [];
    if (!between) {
      const rendererWidth = Math.round(Math.min(innerWidth * 0.46, 380));
      const mainWidth = Math.max(130, innerWidth - gap - rendererWidth);
      rects.push({ x: margin, y: panelY, w: rendererWidth, h: panelHeight });
      rects.push({ x: margin + rendererWidth + gap, y: panelY, w: mainWidth, h: panelHeight });
    } else {
      const firstWidth = Math.floor((innerWidth - gap * 2) / 3);
      for (let index = 0; index < 3; index += 1) {
        const panelWidth = index === 2 ? innerWidth - (firstWidth + gap) * 2 : firstWidth;
        rects.push({ x: margin + index * (firstWidth + gap), y: panelY, w: panelWidth, h: panelHeight });
      }
    }

    const boxHeight = Math.max(34, Math.min(48, panelHeight * 0.22));
    const boxRects = new Map<AnchorName, Rect>();
    const boxLabels = new Map<AnchorName, string>();
    plan.panels.forEach((panel, panelIndex) => {
      const panelRect = rects[panelIndex];
      panel.boxes.forEach((box) => {
        const boxWidth = panelRect.w - 28;
        const y =
          box.row === 'top'
            ? panelRect.y + 44
            : box.row === 'bottom'
              ? panelRect.y + panelRect.h - 44
              : panelRect.y + panelRect.h / 2;
        boxRects.set(box.id, { x: panelRect.x + 14, y: y - boxHeight / 2, w: boxWidth, h: boxHeight });
        boxLabels.set(box.id, box.label);
      });
    });

    function rowY(row: RowName) {
      const panelRect = rects[0];
      if (row === 'top') {
        return panelRect.y + 44;
      }
      if (row === 'bottom') {
        return panelRect.y + panelRect.h - 44;
      }
      return panelRect.y + panelRect.h / 2;
    }

    plan.panels.forEach((panel, panelIndex) => drawPanel(rects[panelIndex], panel.title));

    // 面板间隙画通道虚线，标签固定为「IPC 通道」，具体通道名看读数与日志。
    plan.channels.forEach((channel) => {
      const left = rects[channel.gap];
      const right = rects[channel.gap + 1];
      const y = rowY(channel.row);
      ctx.save();
      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(left.x + left.w, y);
      ctx.lineTo(right.x, y);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.lineLabel;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('IPC 通道', (left.x + left.w + right.x) / 2, y - 9);
    });

    for (const [id, rect] of boxRects) {
      drawBox(rect, boxLabels.get(id) ?? '');
    }

    // 主进程忙：处理请求期间给主进程框加呼吸描边
    const mainRect = boxRects.get('main');
    if (mainRect && plan.busy && elapsed >= plan.busy.start && elapsed <= plan.busy.end) {
      const pulse = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 10));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = COLORS.request;
      ctx.lineWidth = 3;
      roundRectPath(mainRect, 8);
      ctx.stroke();
      ctx.restore();
    }

    // 正在行进的消息点
    for (const segment of plan.segments) {
      if (elapsed < segment.start || elapsed > segment.end) {
        continue;
      }
      const from = boxRects.get(segment.from);
      const to = boxRects.get(segment.to);
      if (!from || !to) {
        continue;
      }
      const progress = ease((elapsed - segment.start) / (segment.end - segment.start));
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      drawDot(x, y, segment.kind === 'return' ? COLORS.return : COLORS.request);
    }

    // 底部日志条：按时间线逐条出现
    const visible = plan.logs.filter((entry) => entry.at <= elapsed).slice(-logRows);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    let logY = height - logHeight + 16;
    for (const entry of visible) {
      ctx.fillStyle = entry.kind === 'ok' ? COLORS.ok : COLORS.info;
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
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(label, rect.w - 12), rect.x + rect.w / 2, rect.y + rect.h / 2);
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

  const loop = createRenderLoop(canvas, (delta) => {
    if (settled) {
      return;
    }
    elapsed = Math.min(elapsed + delta, PLANS[options.direction].duration);
    draw();
    emit(PLANS[options.direction].snapshot);
    if (elapsed >= PLANS[options.direction].duration) {
      settled = true;
    }
  });

  const resizeObserver = createResizeObserver(canvas, () => {
    settled = false;
  });

  return {
    update(next: DirectionOptions) {
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
