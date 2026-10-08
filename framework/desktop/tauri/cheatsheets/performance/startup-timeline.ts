/**
 * 范例介绍:模拟 Tauri 应用的冷启动时间线,回答「首帧前发生了什么、各手段改变哪一段」。
 * 输入:运行模式(生产·资源嵌入 / 开发·devUrl)、启动重活(同步命令·主线程 /
 *   异步命令)、启动感知(不用 / splashscreen 窗口)。
 * 主要操作:三行条带随开关重排——用户看到(无反馈 / splash 窗口 / 主窗口首帧)、
 *   启动阶段(进程创建 → 核心初始化 → WebView 初始化 → 首屏加载 → 前端首帧,
 *   开发模式前置 cargo 编译)、主线程(重活占用 / 空闲 + 后台执行)。
 * 预期结果:生产模式首屏直接来自嵌入二进制,开发模式在时间线最前面多出 cargo
 *   编译、首屏经 devUrl 往返;同步命令把主线程占住、首帧被推迟,异步命令首帧
 *   不受影响;splash 让首帧前的等待变成"有东西看",但不会让首帧更早。
 * 阅读主线:首帧前的每一秒要么来自等编译等 WebView,要么来自主线程上的活——
 *   分清"真实更快"与"感觉更快"。
 * 边界:时长为示意(相对关系有据:Tauri 配置参考 frontendDist 嵌入、官方
 *   calling-rust 文档同步命令在主线程执行),非实测数字。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RunMode = '生产(资源嵌入)' | '开发(devUrl)';
export type HeavyWork = '同步命令(主线程)' | '异步命令';
export type SplashMode = '不用' | 'splashscreen 窗口';

export interface TimelineArgs {
  mode: RunMode;
  heavyWork: HeavyWork;
  splash: SplashMode;
}

export interface TimelineSnapshot {
  /** 读数:当前模式。 */
  mode: string;
  /** 读数:首帧之前用户看到什么。 */
  beforeFirstFrame: string;
  /** 读数:主线程状态。 */
  mainThread: string;
  /** 读数:本组开关对应的要点。 */
  key: string;
}

export interface TimelineInstance {
  update(options: TimelineArgs): void;
  dispose(): void;
}

interface Stage {
  name: string;
  /** 示意时长(相对单位)。 */
  units: number;
  color: string;
}

const COLORS = {
  compile: '#94a3b8',
  spawn: '#7c8db5',
  core: '#4f7cff',
  webview: '#8b5cf6',
  load: '#0e9f8a',
  frame: '#15803d',
  busy: '#dc2626',
  idle: '#e2e8f0',
};

function stages(mode: RunMode, heavyWork: HeavyWork): Stage[] {
  const list: Stage[] = [];
  if (mode === '开发(devUrl)') {
    list.push({ name: 'cargo 编译(dev)', units: 7, color: COLORS.compile });
  }
  list.push({ name: '进程创建', units: 1.5, color: COLORS.spawn });
  list.push({ name: '核心初始化', units: 2, color: COLORS.core });
  list.push({ name: 'WebView 初始化', units: 3.5, color: COLORS.webview });
  if (heavyWork === '同步命令(主线程)') {
    // 同步命令压在主线程上:作为独立段插入,直接推迟首帧。
    list.push({ name: '重活(同步)', units: 4, color: COLORS.busy });
  }
  list.push({
    name: mode === '开发(devUrl)' ? '首屏加载 · devUrl' : '首屏加载 · 嵌入资源',
    units: mode === '开发(devUrl)' ? 3 : 1.5,
    color: COLORS.load,
  });
  list.push({ name: '前端首帧', units: 1.5, color: COLORS.frame });
  return list;
}

// ── 画布配色与字体 ──────────────────────────────────────────
const DIM = '#64748b';
const TEXT = '#172033';
const KEY = '#475569';
const TRACK = '#eef2f7';
const BOX_BORDER = '#dbe3f0';

const SANS = 'ui-sans-serif, system-ui, sans-serif';

export function createTimeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimelineSnapshot) => void,
): TimelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: TimelineArgs = {
    mode: '生产(资源嵌入)',
    heavyWork: '同步命令(主线程)',
    splash: '不用',
  };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const list = stages(current.mode, current.heavyWork);
    const total = list.reduce((sum, stage) => sum + stage.units, 0);

    const x0 = 24;
    const barW = width - x0 - 24;
    const unitsToPx = barW / total;

    // 首帧位置:最后一个段(前端首帧)的起点。
    let acc = 0;
    for (let i = 0; i < list.length - 1; i += 1) {
      acc += list[i].units;
    }
    const firstFrameX = x0 + acc * unitsToPx;

    // splash 窗口最早出现在「进程创建」完成之后(dev 模式还要等编译结束)。
    let preWindowUnits = 0;
    for (const stage of list) {
      if (stage.name === '核心初始化') break;
      preWindowUnits += stage.units;
    }
    const splashStartX = x0 + preWindowUnits * unitsToPx;

    // ── 第 1 行:用户看到 ──────────────────────────────────
    const rowUserY = 44;
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('用户看到', x0, rowUserY - 6);

    const hasSplash = current.splash === 'splashscreen 窗口';
    const preW = firstFrameX - x0;
    ctx.fillStyle = TRACK;
    roundRect(ctx, x0, rowUserY, preW, 20, 4);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('无反馈', x0 + 10, rowUserY + 14);

    if (hasSplash) {
      // splash 段盖在「无反馈」之上:从进程创建完成画到首帧。
      const splashW = firstFrameX - splashStartX;
      ctx.fillStyle = '#dbeafe';
      roundRect(ctx, splashStartX + 2, rowUserY, splashW - 4, 20, 4);
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.fillText('splashscreen 窗口(即时反馈)', splashStartX + 12, rowUserY + 14);
    }

    const frameW = (width - 24) - firstFrameX;
    ctx.fillStyle = '#dcfce7';
    roundRect(ctx, firstFrameX + 2, rowUserY, frameW - 2, 20, 4);
    ctx.fill();
    ctx.strokeStyle = COLORS.frame;
    ctx.stroke();
    ctx.fillStyle = COLORS.frame;
    ctx.fillText('主窗口 · 首帧', firstFrameX + 12, rowUserY + 14);

    // ── 第 2 行:启动阶段 ──────────────────────────────────
    const rowStageY = 96;
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('启动阶段', x0, rowStageY - 6);

    let sx = x0;
    for (const stage of list) {
      const w = stage.units * unitsToPx;
      ctx.fillStyle = stage.color;
      roundRect(ctx, sx, rowStageY, Math.max(2, w - 2), 24, 4);
      ctx.fill();
      sx += w;
    }

    // 首帧竖线。
    ctx.strokeStyle = COLORS.frame;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(firstFrameX, rowUserY + 22);
    ctx.lineTo(firstFrameX, rowStageY + 44);
    ctx.stroke();
    ctx.setLineDash([]);

    // 阶段图例(名称 + 相对时长)。
    let lx = x0;
    let lyy = rowStageY + 62;
    for (const stage of list) {
      const label = `${stage.name}(≈${stage.units})`;
      const labelW = ctx.measureText(label).width + 26;
      if (lx + labelW > width - 24) {
        lx = x0;
        lyy += 18;
      }
      ctx.fillStyle = stage.color;
      roundRect(ctx, lx, lyy - 8, 10, 10, 2);
      ctx.fill();
      ctx.fillStyle = KEY;
      ctx.font = `11px ${SANS}`;
      ctx.fillText(label, lx + 15, lyy);
      lx += labelW + 12;
    }

    // ── 第 3 行:主线程 ────────────────────────────────────
    const rowMainY = lyy + 22;
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('主线程', x0, rowMainY - 6);

    if (current.heavyWork === '同步命令(主线程)') {
      // 重活段在启动条上的起止位置。
      let startUnits = 0;
      for (const stage of list) {
        if (stage.name === '重活(同步)') break;
        startUnits += stage.units;
      }
      const busyX = x0 + startUnits * unitsToPx;
      const busyW = 4 * unitsToPx;
      ctx.fillStyle = '#fee2e2';
      roundRect(ctx, x0, rowMainY, barW, 20, 4);
      ctx.fill();
      ctx.strokeStyle = BOX_BORDER;
      ctx.stroke();
      ctx.fillStyle = COLORS.busy;
      roundRect(ctx, busyX, rowMainY, busyW, 20, 4);
      ctx.fill();
      ctx.fillStyle = COLORS.busy;
      ctx.fillText('被重活占用 → 首帧与界面响应被推迟', busyX + busyW + 10, rowMainY + 14);
    } else {
      ctx.fillStyle = '#dcfce7';
      roundRect(ctx, x0, rowMainY, barW, 20, 4);
      ctx.fill();
      ctx.strokeStyle = BOX_BORDER;
      ctx.stroke();
      ctx.fillStyle = COLORS.frame;
      ctx.fillText('空闲 —— 重活在 async runtime 上执行(虚线)', x0 + 10, rowMainY + 14);
      ctx.strokeStyle = COLORS.frame;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(firstFrameX, rowMainY + 10);
      ctx.lineTo(width - 60, rowMainY + 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 底部要点与免责声明。
    const keyText =
      current.mode === '生产(资源嵌入)'
        ? '嵌入资源:前端产物在编译期进二进制,首屏不经网络。'
        : 'devUrl:冷启动含 dev 编译与开发服务器往返,与发布产物不可比。';
    ctx.fillStyle = TEXT;
    ctx.font = `12px ${SANS}`;
    ctx.fillText(keyText, x0, rowMainY + 52);

    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('时长为示意、非实测;相对关系有据:frontendDist 嵌入、同步命令默认在主线程执行(Tauri 官方文档)。', x0, height - 16);

    emit({
      mode: current.mode,
      beforeFirstFrame: hasSplash
        ? 'splashscreen 窗口(即时反馈)'
        : '无反馈,直到主窗口首帧',
      mainThread:
        current.heavyWork === '同步命令(主线程)'
          ? '被重活占用,首帧被推迟'
          : '空闲;重活在后台,数据就绪再更新',
      key: keyText,
    });
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.closePath();
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
