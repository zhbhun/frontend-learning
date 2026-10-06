/**
 * 范例：depth-estimation 管线的最小闭环——Depth Anything V2 Small 对单张图
 * 做单目深度估计，输出 predicted_depth（插值回原图尺寸的 float32 张量）与
 * depth（min–max 归一化到 0–255 的单通道灰度 RawImage），画布右侧逐像素渲染。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB，本页所有实例共享一次），再下载
 *   depth-anything-v2-small（浏览器 wasm 默认 q8，约 27 MB；Node 默认 fp32 约
 *   99 MB）；画布滚入视口后才开始加载，避免与页面上方实例同时下载。
 * - 输入：Controls 的「示例图片」与「明暗反转」开关。
 * - 操作：等待「状态」变为 就绪；切换图片重新推理；打开「明暗反转」对照灰度
 *   只编码相对远近。
 * - 预期结果：右侧灰度图为相对深度图（无米制尺度）；读数给出 predicted_depth
 *   形状与 depth 的尺寸、通道数。
 * - 阅读主线：load（滚入视口触发加载）→ estimate（推理）→
 *   paintDepth（depth.data → 灰度 ImageData）→ draw。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { pipeline, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：Depth Anything V2 Small（单目深度估计），浏览器 wasm 默认下载
// q8（约 27 MB）；Node 等非 wasm 环境默认 fp32（约 99 MB），服务端用记得显式给 dtype
const MODEL_ID = 'onnx-community/depth-anything-v2-small';

export type DepthStatus = 'loading' | 'running' | 'ready' | 'error';

export interface DepthOptions {
  imageUrl: string;
  /** 反转灰度（255 - v），用于对照「灰度只编码相对远近」 */
  invertDepth: boolean;
}

export interface DepthSnapshot {
  status: DepthStatus;
  message: string;
  progress: number;
  /** predicted_depth 的形状（float32，原图尺寸） */
  dimsText: string | null;
  /** depth 的尺寸与通道数 */
  depthText: string | null;
  /** 推理用时 */
  timing: string | null;
  loadSeconds: string | null;
}

export interface DepthInstance {
  update(options: DepthOptions): void;
  dispose(): void;
}

/** depth-estimation 管线的最小输出形态（单条输入返回单对象） */
interface DepthOutputLike {
  predicted_depth: { dims: number[]; type?: string };
  depth: {
    width: number;
    height: number;
    channels: number;
    /** 0–255 灰度（min–max 归一化） */
    data: Uint8Array;
  };
}

/** RawImage 的最小使用面 */
interface RawImageLike {
  width: number;
  height: number;
  channels: number;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

type DepthPipeFn = (image: RawImageLike) => Promise<DepthOutputLike>;

export function createDepthMapRender(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DepthSnapshot) => void,
): DepthInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: DepthOptions = { imageUrl: '', invertDepth: false };
  let status: DepthStatus = 'loading';
  let message = '滚动到本实例后开始加载模型…';
  let progress = 0;
  let lastPercent = -1;

  type ModuleLike = {
    RawImage: { fromURL(url: string): Promise<RawImageLike> };
    pipeline: (
      task: string,
      modelId: string,
      options?: Record<string, unknown>,
    ) => Promise<DepthPipeFn>;
  };
  let tf: ModuleLike | null = null;
  let depthPipe: DepthPipeFn | null = null;

  // 推理结果缓存：切换「明暗反转」只重绘，不重新推理
  let image: RawImageLike | null = null;
  let imageCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let depth: DepthOutputLike['depth'] | null = null;

  let dimsText: string | null = null;
  let depthText: string | null = null;
  let timing: string | null = null;
  let loadSeconds: string | null = null;

  let loading = false;
  let disposed = false;
  let runToken = 0;

  function snapshot(): DepthSnapshot {
    return {
      status,
      message,
      progress,
      dimsText,
      depthText,
      timing,
      loadSeconds,
    };
  }

  /** depth.data（0–255 单通道）→ RGBA 灰度离屏画布；反转时取 255 - v */
  function paintDepth(): HTMLCanvasElement | null {
    if (!depth) {
      return null;
    }
    const { width, height, data } = depth;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; ++i) {
      const v = current.invertDepth ? 255 - data[i] : data[i];
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    offscreen
      .getContext('2d')
      ?.putImageData(new ImageData(rgba, width, height), 0, 0);
    return offscreen;
  }

  function draw() {
    // 每次 repaint 都同步一次 readout（canvasStory 内部按 100ms 节流）
    emit(snapshot());

    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    if (status === 'loading' || status === 'error') {
      const contentWidth = width - 96;
      if (status === 'loading') {
        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(48, 88, contentWidth, 16);
        drawingContext.fillStyle = '#4f7cff';
        drawingContext.fillRect(
          48,
          88,
          (contentWidth * Math.min(100, progress)) / 100,
          16,
        );
      }
      drawingContext.fillStyle = status === 'error' ? '#b91c1c' : '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 132 + index * 20);
      });
      return;
    }

    if (!image || !depth) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 110);
      return;
    }

    // 左右两块面板：原图 / 深度灰度图；底部留给 readout 面板
    const panelY = 56;
    const panelH = height - panelY - 118;
    const panelW = (width - 96 - 20) / 2;
    const left = { x: 48, y: panelY, w: panelW, h: panelH };
    const right = { x: 48 + panelW + 20, y: panelY, w: panelW, h: panelH };

    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(left.x - 1, left.y - 1, left.w + 2, left.h + 2);
    drawingContext.fillRect(right.x - 1, right.y - 1, right.w + 2, right.h + 2);

    if (!imageCanvas) {
      imageCanvas = image.toCanvas();
    }
    drawContain(imageCanvas as CanvasImageSource, image.width, image.height, left);
    drawContain(
      paintDepth() as CanvasImageSource,
      depth.width,
      depth.height,
      right,
    );

    // 右面板右下角：灰度标尺（明暗反转时同步翻转）
    drawScale(right);
  }

  /** contain 缩放绘制 */
  function drawContain(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    box: { x: number; y: number; w: number; h: number },
  ): void {
    const scale = Math.min(box.w / sourceWidth, box.h / sourceHeight);
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    drawingContext.drawImage(
      source,
      box.x + (box.w - drawW) / 2,
      box.y + (box.h - drawH) / 2,
      drawW,
      drawH,
    );
  }

  /** 灰度标尺：渐变条 + 两端数值，说明 depth 是 min–max 归一化的 0–255 */
  function drawScale(box: { x: number; y: number; w: number; h: number }): void {
    const boxW = Math.min(box.w - 16, 190);
    const boxH = 34;
    const x = box.x + box.w - boxW - 8;
    const y = box.y + box.h - boxH - 8;

    drawingContext.fillStyle = 'rgba(255, 255, 255, 0.88)';
    drawingContext.fillRect(x, y, boxW, boxH);
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.strokeRect(x, y, boxW, boxH);

    const gradient = drawingContext.createLinearGradient(x + 8, 0, x + boxW - 8, 0);
    const low = current.invertDepth ? '#ffffff' : '#000000';
    const high = current.invertDepth ? '#000000' : '#ffffff';
    gradient.addColorStop(0, low);
    gradient.addColorStop(1, high);
    drawingContext.fillStyle = gradient;
    drawingContext.fillRect(x + 8, y + 8, boxW - 16, 10);
    drawingContext.strokeStyle = '#94a3b8';
    drawingContext.strokeRect(x + 8, y + 8, boxW - 16, 10);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('0', x + 8, y + 30);
    drawingContext.textAlign = 'right';
    drawingContext.fillText('255 · min–max 归一化', x + boxW - 8, y + 30);
    drawingContext.textAlign = 'left';
  }

  /** 核心链路：读图 → 管线推理（processor → model → 插值归一化后处理） */
  async function estimate(): Promise<void> {
    if (!tf || !depthPipe || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '读取图片并估计深度…';
    draw();
    try {
      // ① 读图：URL → RawImage（管线同样接受 URL 字符串）
      const raw = await tf.RawImage.fromURL(current.imageUrl);

      // ② 推理：predicted_depth 插值回原图尺寸（float32），
      //    depth 同一预测 min–max 归一化到 0–255 的单通道 RawImage
      const startedAt = performance.now();
      const output = await depthPipe(raw);
      const elapsed = performance.now() - startedAt;
      if (disposed || runId !== runToken) {
        return;
      }

      image = raw;
      imageCanvas = null;
      depth = output.depth;
      dimsText = `[${output.predicted_depth.dims.join(', ')}] · float32`;
      depthText = `${output.depth.width}×${output.depth.height} · ${output.depth.channels} 通道`;
      timing = `${elapsed.toFixed(0)} ms`;
      status = 'ready';
      message = '就绪：切换图片或打开「明暗反转」对照相对深度';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `推理失败：${detail}。常见原因：图片 URL 不可访问或跨域受限；切换「示例图片」即可重试。`;
      draw();
    }
  }

  async function load(): Promise<void> {
    if (depthPipe || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = (await import(/* @vite-ignore */ TRANSFORMERS_CDN)) as ModuleLike;

      const loaded = await mod.pipeline('depth-estimation', MODEL_ID, {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (disposed) {
            return;
          }
          // 事件流：initiate → download → progress（单文件）→ done；
          // v4 另有聚合所有文件的 progress_total
          if (info.status === 'progress' || info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== lastPercent) {
              lastPercent = percent;
              progress = percent;
              message = `正在下载模型（wasm 默认 q8 约 27 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      });
      if (disposed) {
        return;
      }
      tf = mod;
      depthPipe = loaded;
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；换图只重新推理，不重新加载`;
      status = 'ready';
      draw();
      void estimate();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后切换「示例图片」即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw(); // 先画一帧加载提示，避免画布空白

  // 长驻下载延迟到画布滚入视口：避免与本页上方实例同时下载
  let visibility: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === 'undefined') {
    void load();
  } else {
    visibility = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visibility?.disconnect();
          void load();
        }
      },
      { rootMargin: '200px 0px' },
    );
    visibility.observe(canvas);
  }

  return {
    update(options) {
      const urlChanged = options.imageUrl !== current.imageUrl;
      const invertChanged = options.invertDepth !== current.invertDepth;
      current = options;
      if (disposed) {
        return;
      }
      if (depthPipe && urlChanged) {
        // 换图只触发一次推理，不重新加载模型
        void estimate();
      } else if (invertChanged && depth) {
        // 反转只改灰度映射：重绘即可
        draw();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      visibility?.disconnect();
      resizeObserver.disconnect();
      depthPipe = null;
      image = null;
      imageCanvas = null;
      depth = null;
    },
  };
}
