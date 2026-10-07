/**
 * 范例介绍：模拟上下文隔离下，预加载脚本的两种暴露方式分别能否到达页面主世界。
 * 输入：暴露方式（contextBridge / 直接挂 window）与上下文隔离开关。
 * 操作：切换两个控件，观察右侧主世界各读数与桥的状态。
 * 预期：contextBridge 暴露的 API 任何隔离状态下都可见；直接挂 window 只在
 *       隔离关闭时可见；process 在页面主世界永远不可见。
 * 阅读主线：桥是隔离世界进入页面主世界的唯一正规通道。
 * 这是行为模型模拟，不等于运行 Electron；真实项目的验证步骤见正文「快速上手」。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ExposureMethod = 'contextBridge' | 'window';

export interface BridgeSimOptions {
  exposure: ExposureMethod;
  isolation: boolean;
}

export interface BridgeSimSnapshot {
  exposure: ExposureMethod;
  isolation: boolean;
  versionsVisible: boolean;
  tokenVisible: boolean;
}

export interface BridgeSimInstance {
  update(options: BridgeSimOptions): void;
  dispose(): void;
}

const COLORS = {
  text: '#172033',
  muted: '#64748b',
  panelBg: '#f8fafc',
  panelBorder: '#cbd5e1',
  ok: '#15803d',
  blocked: '#dc2626',
  warn: '#b45309',
  bridge: '#4f7cff',
  mono: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
  monoSmall: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  header: '600 14px ui-sans-serif, system-ui, sans-serif',
  note: '13px ui-sans-serif, system-ui, sans-serif',
};

// 面板与行的固定布局：左右两个世界，中间 64px 的桥区
const LAYOUT = {
  top: 96,
  height: 250,
  isoPanel: { x: 48, width: 280 },
  mainPanel: { x: 392, width: 280 },
  gapCenter: 360,
  rows: { versions: 190, token: 240, process: 290 },
};

export function createBridgeSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BridgeSimSnapshot) => void,
): BridgeSimInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: BridgeSimOptions = { exposure: 'contextBridge', isolation: true };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = 400;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    // 可见性判断与正文一致：桥是通道，隔离关闭时两个世界直接连通
    const versionsVisible =
      current.exposure === 'contextBridge' || !current.isolation;
    const tokenVisible = !current.isolation;

    drawTitle();
    drawPanel(LAYOUT.isoPanel.x, '隔离世界 · 预加载脚本');
    drawPanel(LAYOUT.mainPanel.x, '主世界 · 页面');
    drawIsoWorld();
    drawMainWorld(versionsVisible, tokenVisible);
    drawBridge();
    drawFooter(versionsVisible, tokenVisible);

    emit({
      exposure: current.exposure,
      isolation: current.isolation,
      versionsVisible,
      tokenVisible,
    });
  }

  function drawTitle() {
    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.note;
    drawingContext.textAlign = 'left';
    drawingContext.fillText(
      '切换「暴露方式」与「上下文隔离」，观察右侧主世界的读数',
      LAYOUT.isoPanel.x,
      56,
    );
  }

  function drawPanel(x: number, title: string) {
    drawingContext.fillStyle = COLORS.panelBg;
    drawingContext.strokeStyle = COLORS.panelBorder;
    drawingContext.lineWidth = 1;
    roundRect(x, LAYOUT.top, LAYOUT.mainPanel.width, LAYOUT.height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.text;
    drawingContext.font = COLORS.header;
    drawingContext.textAlign = 'left';
    drawingContext.fillText(title, x + 16, LAYOUT.top + 34);
  }

  function drawIsoWorld() {
    const x = LAYOUT.isoPanel.x + 16;

    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.text;
    drawingContext.fillText('versions = {…}', x, LAYOUT.rows.versions);
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      current.exposure === 'contextBridge'
        ? 'contextBridge.exposeInMainWorld 暴露'
        : '直接挂 window（旧行为）',
      x,
      LAYOUT.rows.versions + 18,
    );

    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.text;
    drawingContext.fillText('window.debugToken = {…}', x, LAYOUT.rows.token);
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText('调试用直接赋值', x, LAYOUT.rows.token + 18);

    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.text;
    drawingContext.fillText('process', x, LAYOUT.rows.process);
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText('Node 子集只存在于本侧', x, LAYOUT.rows.process + 18);
  }

  function drawMainWorld(versionsVisible: boolean, tokenVisible: boolean) {
    const x = LAYOUT.mainPanel.x + 16;

    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = versionsVisible ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(
      `window.versions: ${versionsVisible ? "'object'" : "'undefined'"}`,
      x,
      LAYOUT.rows.versions,
    );
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      versionsVisible ? '页面可以调用' : '赋值留在隔离世界，页面看不到',
      x,
      LAYOUT.rows.versions + 18,
    );

    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = tokenVisible ? COLORS.ok : COLORS.blocked;
    drawingContext.fillText(
      `window.debugToken: ${tokenVisible ? "'object'" : "'undefined'"}`,
      x,
      LAYOUT.rows.token,
    );
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      tokenVisible ? '同一世界：页面可改写' : '直接赋值过不了隔离边界',
      x,
      LAYOUT.rows.token + 18,
    );

    // 页面主世界默认没有 Node：与隔离开关无关，始终不可见
    drawingContext.font = COLORS.mono;
    drawingContext.fillStyle = COLORS.blocked;
    drawingContext.fillText('process: undefined', x, LAYOUT.rows.process);
    drawingContext.font = COLORS.monoSmall;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText('页面永远没有 Node（与隔离无关）', x, LAYOUT.rows.process + 18);
  }

  function drawBridge() {
    const cx = LAYOUT.gapCenter;
    drawingContext.textAlign = 'center';

    if (current.isolation) {
      // 隔离边界：虚线分出两个世界
      drawingContext.setLineDash([4, 4]);
      drawingContext.strokeStyle = COLORS.panelBorder;
      drawingContext.lineWidth = 1;
      drawingContext.beginPath();
      drawingContext.moveTo(cx, LAYOUT.top + 10);
      drawingContext.lineTo(cx, LAYOUT.top + LAYOUT.height - 10);
      drawingContext.stroke();
      drawingContext.setLineDash([]);

      drawingContext.font = COLORS.monoSmall;
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText('隔离开启', cx, LAYOUT.top - 14);

      // versions：contextBridge 是唯一过桥通道
      if (current.exposure === 'contextBridge') {
        drawingContext.fillStyle = COLORS.bridge;
        roundRect(cx - 30, LAYOUT.rows.versions - 12, 60, 24, 5);
        drawingContext.fill();
        drawingContext.fillStyle = '#ffffff';
        drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText('桥', cx, LAYOUT.rows.versions + 4);
      } else {
        drawCross(cx, LAYOUT.rows.versions);
      }

      // debugToken：直接赋值在隔离下必然被挡住
      drawCross(cx, LAYOUT.rows.token);
    } else {
      drawingContext.font = COLORS.monoSmall;
      drawingContext.fillStyle = COLORS.warn;
      drawingContext.fillText('隔离已关闭', cx, LAYOUT.top - 14);

      // 两个世界连通：两个值都以普通箭头方式可见
      drawArrow(cx - 30, LAYOUT.rows.versions, cx + 30, LAYOUT.rows.versions);
      drawArrow(cx - 30, LAYOUT.rows.token, cx + 30, LAYOUT.rows.token);
    }

    drawingContext.textAlign = 'left';
  }

  function drawCross(cx: number, y: number) {
    drawingContext.strokeStyle = COLORS.blocked;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(cx - 7, y - 7);
    drawingContext.lineTo(cx + 7, y + 7);
    drawingContext.moveTo(cx + 7, y - 7);
    drawingContext.lineTo(cx - 7, y + 7);
    drawingContext.stroke();
  }

  function drawArrow(x1: number, y1: number, x2: number, y2: number) {
    drawingContext.strokeStyle = COLORS.ok;
    drawingContext.fillStyle = COLORS.ok;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2 - 6, y2);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(x2, y2);
    drawingContext.lineTo(x2 - 8, y2 - 4);
    drawingContext.lineTo(x2 - 8, y2 + 4);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function drawFooter(versionsVisible: boolean, tokenVisible: boolean) {
    const x = LAYOUT.isoPanel.x;
    const y = LAYOUT.top + LAYOUT.height + 26;
    drawingContext.textAlign = 'left';
    drawingContext.font = COLORS.note;

    if (versionsVisible && tokenVisible && !current.isolation) {
      drawingContext.fillStyle = COLORS.warn;
      drawingContext.fillText(
        '两个世界已连通：页面可改写预加载暴露的对象——现代 Electron 默认隔离（取舍见「安全清单」课）',
        x,
        y,
      );
    } else {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.fillText(
        '本图为行为模型模拟；真实项目验证见正文「快速上手」',
        x,
        y,
      );
    }
  }

  function roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
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
