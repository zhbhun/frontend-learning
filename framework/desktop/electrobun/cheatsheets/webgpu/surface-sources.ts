/**
 * 演示内容：原生 GPU 表面（WGPUView）的三种创建途径——GpuWindow 独立窗口、
 * webview 内的 <electrobun-wgpu> 标签、主进程手动 new WGPUView——各自的
 * 创建通道、主进程引用方式、尺寸同步驱动与销毁路径。
 * 输入：表面来源（gpu-window / wgpu-tag / manual）。
 * 操作：在 Controls 中切换「表面来源」。
 * 预期结果：创建通道、autoResize、resize 驱动方与销毁动作随来源切换；
 * 三种来源最终都落到主进程里的同一个 WGPUView 对象，渲染提交链路不变。
 * 阅读主线：surfaceFacts() 是唯一的事实表（与 1.18.1 包内 GpuWindow.ts、
 * WGPUView.ts、preload/wgpuTag.ts 与 proc/native.ts 的 wgpuTagInit 核对过），
 * draw() 只负责把事实画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SurfaceSource = 'gpu-window' | 'wgpu-tag' | 'manual';

export interface SurfaceSourcesOptions {
  source: SurfaceSource;
}

export interface SurfaceSourcesSnapshot {
  createChannel: string;
  autoResize: string;
  mainProcessRef: string;
  resizeDriver: string;
  teardown: string;
}

export interface SurfaceSourcesInstance {
  update(options: SurfaceSourcesOptions): void;
  dispose(): void;
}

interface SurfaceFact {
  /** 链路标题里的来源名 */
  label: string;
  /** 第 1 步：WGPUView 怎么被创建 */
  createStep: string;
  createLine: string;
  /** 第 2 步：主进程怎么拿到它 */
  refStep: string;
  refLine: string;
  /** 第 3 步：尺寸由谁驱动 */
  syncStep: string;
  syncLine: string;
  /** 第 4 步：怎么销毁 */
  teardownStep: string;
  teardownLine: string;
  /** 读数用的短字段 */
  autoResize: string;
  createChannel: string;
  teardown: string;
}

// 与 1.18.1 包内实现核对过的事实表：
// - GpuWindow.init() 自动 new WGPUView({ frame: 全窗, autoResize: true })；
// - wgpuTagInit 在主进程 new WGPUView({ autoResize: false })，尺寸由
//   preload/wgpuTag.ts 的 OverlaySyncController 经 wgpuTagResize 驱动；
// - 手动 new WGPUView 的 autoResize 缺省 true，false 时只有 setFrame 会移动表面。
function surfaceFacts(source: SurfaceSource): SurfaceFact {
  if (source === 'wgpu-tag') {
    return {
      label: 'webview 内 <electrobun-wgpu> 标签',
      createStep: 'connectedCallback（延迟一帧等布局）',
      createLine:
        'internal RPC wgpuTagInit → 主进程 new WGPUView（autoResize: false，透明/穿透按属性）',
      refStep: '主进程按 id 找回视图',
      refLine:
        'tag.wgpuViewId（元素 id = electrobun-wgpu-<id>）→ WGPUView.getById(id) → webgpu.createContext(view)',
      syncStep: 'OverlaySyncController 驱动 resize',
      syncLine:
        'ResizeObserver + 轮询：静止 100ms、变化期 10ms 突发 → wgpuTagResize 携带 frame 与 masks',
      teardownStep: '元素离开 DOM',
      teardownLine:
        'disconnectedCallback → wgpuTagRemove → view.remove()；重新插回 DOM 是一次全新初始化',
      autoResize: 'false（同步控制器驱动）',
      createChannel: 'internal RPC wgpuTagInit',
      teardown: 'disconnectedCallback → view.remove()',
    };
  }
  if (source === 'manual') {
    return {
      label: '主进程手动 new WGPUView',
      createStep: '直接构造',
      createLine:
        'new WGPUView({ windowId, frame, autoResize, ... })，windowId 可指向 GpuWindow 或 BrowserWindow',
      refStep: '主进程自持引用',
      refLine: '构造返回值自持；静态方法 getById(id) / getAll() 兜底找回',
      syncStep: 'autoResize 或手动 setFrame',
      syncLine:
        'autoResize 缺省 true（跟随窗口）；设 false 后只有 setFrame(x, y, w, h) 会移动表面',
      teardownStep: '显式移除',
      teardownLine:
        'view.remove()；getNativeHandle() 可先取原生句柄交给外部渲染器',
      autoResize: '缺省 true（可关）',
      createChannel: '主进程直接 new WGPUView',
      teardown: 'view.remove()',
    };
  }
  return {
    label: 'GpuWindow 独立窗口',
    createStep: 'new GpuWindow({...})',
    createLine:
      'ffi.request.createWindow + 自动 new WGPUView({ frame: 全窗, autoResize: true })，窗口即表面',
    refStep: '窗口自带视图引用',
    refLine: 'win.wgpuView（getter）与 win.wgpuViewId；webgpu.createContext(win) 直接接受窗口',
    syncStep: '窗口系统驱动 resize',
    syncLine:
      '原生表面随窗口自动铺满；表面配置宽高仍停留在 configure 时的值，resize 事件里要带 size 重配',
    teardownStep: '窗口关闭事件联动',
    teardownLine:
      'close 事件：窗口从 GpuWindowMap 移除，其名下全部 WGPUView 一并 remove()',
    autoResize: 'true（随窗口铺满）',
    createChannel: 'ffi.request.createWindow + 自动创建',
    teardown: 'close 事件联动 remove()',
  };
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  footer: '#0e9f6e',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

export function createSurfaceSources(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SurfaceSourcesSnapshot) => void,
): SurfaceSourcesInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SurfaceSourcesOptions = { source: 'gpu-window' };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    order: number,
    step: string,
    line: string,
  ) {
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = COLORS.ok;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.ok;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`${order}`, x + 12, y + 21);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(step, x + 28, y + 21);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawWrappedText(line, x + 12, y + 39, width - 24, 15);
  }

  function drawWrappedText(
    text: string,
    startX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
  ) {
    let line = '';
    let y = startY;
    for (const char of text) {
      const candidate = line + char;
      if (drawingContext.measureText(candidate).width > maxWidth) {
        drawingContext.fillText(line, startX, y);
        line = char;
        y += lineHeight;
      } else {
        line = candidate;
      }
    }
    drawingContext.fillText(line, startX, y);
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
    const height = Math.max(510, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const fact = surfaceFacts(current.source);
    const steps: Array<[string, string]> = [
      [fact.createStep, fact.createLine],
      [fact.refStep, fact.refLine],
      [fact.syncStep, fact.syncLine],
      [fact.teardownStep, fact.teardownLine],
    ];

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `表面来源：${fact.label}`,
      24,
      34,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '三种来源最终都是主进程里的一个 WGPUView；切换的只是创建、同步与销毁链路',
      24,
      56,
    );

    const margin = 24;
    const boxWidth = width - margin * 2;
    const stepHeight = 84;
    const gap = Math.max(
      16,
      Math.min(28, (height - 130 - steps.length * stepHeight) / steps.length),
    );
    let y = 74;
    const centerX = width / 2;

    steps.forEach(([step, line], index) => {
      const stepY = y + gap;
      drawArrow(y + 2, stepY, centerX);
      drawBox(margin, stepY, boxWidth, stepHeight, index + 1, step, line);
      y = stepY + stepHeight;
    });

    drawingContext.fillStyle = COLORS.footer;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '渲染提交与来源无关：主进程帧循环 queue.submit() 会自动呈现最近一次 getCurrentTexture() 的表面',
      margin,
      Math.min(height - 12, y + 24),
    );

    emit({
      createChannel: fact.createChannel,
      autoResize: fact.autoResize,
      mainProcessRef:
        current.source === 'gpu-window'
          ? 'win.wgpuView'
          : current.source === 'wgpu-tag'
            ? 'WGPUView.getById(tag.wgpuViewId)'
            : '自持引用 / getById / getAll',
      resizeDriver:
        current.source === 'gpu-window'
          ? '窗口系统（autoResize）+ resize 事件重配表面'
          : current.source === 'wgpu-tag'
            ? '同步控制器（100ms / 10ms 突发）'
            : 'autoResize 或手动 setFrame',
      teardown: fact.teardown,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { source: options.source };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
