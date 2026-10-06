/**
 * 范例：pipeline('background-removal') 的抠图输出与图层合成——
 * 左侧展示原图，右侧把抠图（RGBA 的 RawImage）叠到可选底衬上，
 * 棋盘格直观显示透明区域；读数给出输出尺寸、推理用时与软边界像素占比。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB），再下载背景移除模型
 *   Xenova/modnet（任务默认模型；仓库 config.json 固定 dtype: fp32，
 *   约 25.9 MB，仅首次，之后走浏览器缓存）。
 * - 输入：Controls 的「示例图片」（三张官方文档数据集人像图，可跨域访问）
 *   与「合成底衬」（棋盘格 / 纯色）。
 * - 操作：等待「状态」变为 就绪；切换图片观察抠图结果；更换底衬观察透明区域。
 * - 预期结果：右侧抠图的背景变透明（底衬透出），前景不变；输出 RawImage 为
 *   RGBA 4 通道、尺寸与原图一致；「软边界像素」大于 0 证明 mask 不是二值，
 *   而是 0–255 的软值直接写进 alpha（v4.3.0 源码：mask ×255 后逐像素 putAlpha）。
 * - 阅读主线：ensureRemover（按需加载管线）→ run（读图 → 抠图 → 统计软边界）
 *   → render（左原图；右底衬 + drawImage 合成）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用本手册确立的官方 CDN 动态导入；
// npm 项目请改用：import { pipeline, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// background-removal 的任务默认模型（v4.3.0 源码 pipelines/index.js）：
// ModNet 是人像 matting 模型。仓库 config.json 固定 transformers.js_config.dtype
// 为 fp32，因此 WASM 默认也下载 onnx/model.onnx（约 25.9 MB），不是 q8（约 6.6 MB）。
const REMOVER_MODEL_ID = 'Xenova/modnet';
const REMOVER_MODEL_SIZE_LABEL = 'Xenova/modnet · fp32 约 25.9 MB';

/** 「合成底衬」选项：checker 棋盘格（图像软件表示透明的通用底衬）与纯色 */
export const COMPOSITE_BACKGROUNDS: Record<
  string,
  { label: string; kind: 'checker' | 'solid'; color?: string }
> = {
  checker: { label: '棋盘格', kind: 'checker' },
  white: { label: '白色', kind: 'solid', color: '#ffffff' },
  black: { label: '黑色', kind: 'solid', color: '#1e293b' },
  blue: { label: '蓝色', kind: 'solid', color: '#4f7cff' },
  green: { label: '绿幕', kind: 'solid', color: '#22c55e' },
};

export type CutoutStatus = 'loading' | 'running' | 'ready' | 'error';

export interface CutoutOptions {
  imageUrl: string;
  /** 合成底衬 key：COMPOSITE_BACKGROUNDS 的键 */
  background: string;
}

export interface CutoutSnapshot {
  status: CutoutStatus;
  message: string;
  /** 抠图输出尺寸与通道数："360×450 · 4 通道" */
  outputSize: string | null;
  /** 单张推理用时（含预处理与后处理） */
  inferTime: string | null;
  /** 软边界像素占比：0 < alpha < 255 的像素 / 总像素 */
  softEdge: string | null;
  loadSeconds: string | null;
}

export interface CutoutInstance {
  update(options: CutoutOptions): void;
  dispose(): void;
}

/** RawImage 的最小使用面：尺寸、通道、像素缓冲与画布导出 */
interface RawImageLike {
  width: number;
  height: number;
  channels: number;
  data: Uint8ClampedArray;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

/** background-removal 管线调用：单图输入返回单个 RawImage（RGBA） */
type RemoverPipe = (
  image: RawImageLike,
) => Promise<RawImageLike | RawImageLike[]>;

type TransformersModule = {
  RawImage: { fromURL(url: string): Promise<RawImageLike> };
  pipeline(
    task: 'background-removal',
    modelId: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
};

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function createCutoutInstance(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CutoutSnapshot) => void,
): CutoutInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CutoutOptions = { imageUrl: '', background: 'checker' };
  let status: CutoutStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let progress = 0;
  let lastPercent = -1;

  let imageSize: { width: number; height: number } | null = null;
  // 原图画布（含背景）：左列只消费，不重复转换
  let imageCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  // 抠图画布（RGBA）：右列合成用
  let cutoutCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let outputSize: string | null = null;
  let inferTime: string | null = null;
  let softEdge: string | null = null;

  let library: TransformersModule | null = null;
  let remover: RemoverPipe | null = null;
  let removerPromise: Promise<void> | null = null;

  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  function snapshot(): CutoutSnapshot {
    return {
      status,
      message,
      outputSize,
      inferTime,
      softEdge,
      loadSeconds,
    };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function draw() {
    render();
    emit(snapshot());
  }

  function reportProgress(label: string, percent: number): void {
    const rounded = Math.round(percent);
    if (rounded === lastPercent) {
      return;
    }
    lastPercent = rounded;
    progress = rounded;
    message = `${label}：${rounded}%`;
    draw();
  }

  /** 按需加载管线（只加载一次，换图 / 换底衬不重新加载）；失败清掉缓存可重试 */
  function ensureRemover(): Promise<void> {
    if (remover) {
      return Promise.resolve();
    }
    if (!removerPromise) {
      const startedAt = performance.now();
      removerPromise = (async () => {
        // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
        const mod = (await import(
          /* @vite-ignore */ TRANSFORMERS_CDN
        )) as TransformersModule;
        library = mod;

        remover = (await mod.pipeline(
          'background-removal',
          REMOVER_MODEL_ID,
          {
            progress_callback: (info: { status: string; progress?: number }) => {
              if (disposed) {
                return;
              }
              // 事件流：initiate → download → progress（单文件）→ done
              if (info.status === 'progress' || info.status === 'progress_total') {
                reportProgress(
                  `正在下载背景移除模型 ${REMOVER_MODEL_ID}（fp32 约 25.9 MB，仅首次）`,
                  info.progress ?? 0,
                );
              }
            },
          },
        )) as RemoverPipe;

        loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      })();
      removerPromise.catch(() => {
        // 加载失败清掉缓存的 Promise，切换任意控件后可重试
        removerPromise = null;
      });
    }
    return removerPromise;
  }

  /** 统计软边界像素：0 < alpha < 255 的像素占比（mask 为软值的直接证据） */
  function computeSoftEdge(cutout: RawImageLike): string {
    const total = cutout.width * cutout.height;
    if (cutout.channels !== 4 || total === 0) {
      return `通道数 ${cutout.channels}`;
    }
    let soft = 0;
    const { data } = cutout;
    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i] as number;
      if (alpha > 0 && alpha < 255) {
        soft++;
      }
    }
    const percent = (soft / total) * 100;
    return percent > 0
      ? `${percent.toFixed(1)}%（0<alpha<255）`
      : '0%（边界为硬边）';
  }

  /** 核心链路：读图 → 抠图（mask 写进 alpha）→ 统计输出 */
  async function run(): Promise<void> {
    if (disposed) {
      return;
    }
    const runId = ++runToken;
    const ready = Boolean(remover);
    status = ready ? 'running' : 'loading';
    if (ready) {
      message = '读取图片，抠图推理中…';
    }
    draw();
    try {
      await ensureRemover();
      if (disposed || runId !== runToken) {
        return;
      }

      // ① 读图：URL → RawImage；管线直接接受 RawImage，避免重复下载
      status = 'running';
      message = '读取图片，抠图推理中…（短边 512 输入，WASM 需数秒）';
      draw();
      const image = await library!.RawImage.fromURL(current.imageUrl);
      if (disposed || runId !== runToken) {
        return;
      }
      imageSize = { width: image.width, height: image.height };
      imageCanvas = image.toCanvas();

      // ② 抠图：单图输入返回单个 RawImage（RGBA）；mask 已写进 alpha
      const startedAt = performance.now();
      const output = await remover!(image);
      if (disposed || runId !== runToken) {
        return;
      }
      inferTime = formatDuration(performance.now() - startedAt);
      const cutout = (Array.isArray(output) ? output[0] : output) as RawImageLike;

      outputSize = `${cutout.width}×${cutout.height} · ${cutout.channels} 通道`;
      softEdge = computeSoftEdge(cutout);
      cutoutCanvas = cutout.toCanvas();

      status = 'ready';
      message = '就绪：切换图片或更换「合成底衬」观察透明区域';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `加载或推理失败：${detail}。常见原因：网络受限或图片 URL 不可访问；切换任意控件即可重试。`;
      draw();
    }
  }

  function render(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    // 加载 / 出错：整幅进度条 + 文字消息（与兄弟课同一状态机模式）
    if (status === 'loading' || status === 'error') {
      const contentWidth = width - 96;
      if (status === 'loading') {
        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(48, 120, contentWidth, 16);
        drawingContext.fillStyle = '#4f7cff';
        drawingContext.fillRect(
          48,
          120,
          (contentWidth * Math.min(100, progress)) / 100,
          16,
        );
      }
      drawingContext.fillStyle = status === 'error' ? '#b91c1c' : '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 164 + index * 20);
      });
      return;
    }

    drawLeftPanel();
    drawRightPanel();
  }

  /** 左列：原图（含背景），与右侧抠图对照 */
  function drawLeftPanel(): void {
    const rect = {
      x: 48,
      y: 84,
      w: width / 2 - 32 - 48,
      h: height - 56 - 84,
    };

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      imageSize ? `原图 ${imageSize.width}×${imageSize.height}（宽×高）` : '原图',
      rect.x,
      66,
    );

    if (!imageSize || !imageCanvas) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, rect.w).forEach((line, index) => {
        drawingContext.fillText(line, rect.x, 128 + index * 20);
      });
      return;
    }

    const fit = fitInto(imageSize.width, imageSize.height, rect);
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(fit.x - 1, fit.y - 1, fit.w + 2, fit.h + 2);
    drawingContext.drawImage(
      imageCanvas as CanvasImageSource,
      fit.x,
      fit.y,
      fit.w,
      fit.h,
    );
  }

  /** 右列：抠图叠到底衬上——先画底衬，再 drawImage 抠图，透明区域由底衬显形 */
  function drawRightPanel(): void {
    const panelLeft = width / 2 + 32;
    const panelWidth = width - panelLeft - 48;
    const rect = {
      x: panelLeft,
      y: 84,
      w: panelWidth,
      h: height - 56 - 84,
    };

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(REMOVER_MODEL_SIZE_LABEL, panelLeft, 66);

    if (!cutoutCanvas || !imageSize) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, panelWidth).forEach((line, index) => {
        drawingContext.fillText(line, panelLeft, 128 + index * 20);
      });
      return;
    }

    const fit = fitInto(imageSize.width, imageSize.height, rect);
    const background =
      COMPOSITE_BACKGROUNDS[current.background] ??
      COMPOSITE_BACKGROUNDS['checker']!;

    // ① 底衬：棋盘格逐格绘制，纯色直接填充；范围就是抠图的显示区域
    if (background.kind === 'checker') {
      drawCheckerboard(fit.x, fit.y, fit.w, fit.h);
    } else {
      drawingContext.fillStyle = background.color!;
      drawingContext.fillRect(fit.x, fit.y, fit.w, fit.h);
    }

    // ② 抠图叠加：canvas 默认 source-over 合成，alpha < 255 的像素与底衬混合
    drawingContext.drawImage(
      cutoutCanvas as CanvasImageSource,
      fit.x,
      fit.y,
      fit.w,
      fit.h,
    );
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.lineWidth = 1;
    drawingContext.strokeRect(fit.x - 0.5, fit.y - 0.5, fit.w + 1, fit.h + 1);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `输出 ${outputSize}（RGBA）· mask 写进 alpha`,
      panelLeft,
      height - 34,
    );
  }

  /** 棋盘格：灰白相间的小方格，透明度为 0 的区域完全露出方格 */
  function drawCheckerboard(x: number, y: number, w: number, h: number): void {
    const cell = 12;
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(x, y, w, h);
    drawingContext.clip();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillRect(x, y, w, h);
    drawingContext.fillStyle = '#c9d2e3';
    for (let row = 0; row * cell < h; row++) {
      for (let col = 0; col * cell < w; col++) {
        if ((row + col) % 2 === 0) {
          drawingContext.fillRect(x + col * cell, y + row * cell, cell, cell);
        }
      }
    }
    drawingContext.restore();
  }

  /** 等比缩放并居中放进目标矩形 */
  function fitInto(
    imageWidth: number,
    imageHeight: number,
    rect: { x: number; y: number; w: number; h: number },
  ): { x: number; y: number; w: number; h: number } {
    const scale = Math.min(rect.w / imageWidth, rect.h / imageHeight);
    const drawW = imageWidth * scale;
    const drawH = imageHeight * scale;
    return {
      x: rect.x + (rect.w - drawW) / 2,
      y: rect.y + (rect.h - drawH) / 2,
      w: drawW,
      h: drawH,
    };
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
  draw(); // 先画一帧加载状态，避免首个下载事件到来前画布空白
  void run();

  return {
    update(options) {
      const urlChanged = options.imageUrl !== current.imageUrl;
      current = options;
      if (disposed) {
        return;
      }
      if (urlChanged) {
        // 换图重新推理，模型保持已加载
        void run();
      } else {
        // 仅底衬变化：直接重绘合成结果，无需重新推理
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      remover = null;
      library = null;
      removerPromise = null;
      imageCanvas = null;
      cutoutCanvas = null;
    },
  };
}
