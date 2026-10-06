/**
 * 范例：SAM 提示分割的组件化三步——SamProcessor 编码点提示 →
 * AutoModelForMaskGeneration（SamModel）前向 → processor.post_process_masks
 * 还原原图尺寸的 bool mask；画布点击选点，展示三个候选 mask 的 iou 分数与最佳者。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB，本页所有实例共享一次），再下载
 *   SlimSAM-77 的两个 q8 会话（约 13.8 MB）；画布滚入视口后才开始加载，
 *   避免与页面上方实例同时下载。
 * - 输入：Controls 的「示例图片」+ 画布点击（原图像素坐标的提示点）。
 * - 操作：等待就绪后点击左图中的目标；每次点击运行一次「提示编码 → mask 解码」。
 * - 预期结果：右侧出现 iou 最高候选的半透明叠加，读数给出原图坐标、三个 iou
 *   分数与选中序号；点击物体边缘或背景时分数整体下降。
 * - 阅读主线：load（滚入视口触发加载）→ prepareImage（读图 + 缓存图像嵌入）→
 *   runPrompt（processor → model → post_process_masks → argmax iou）→ draw。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { AutoProcessor, AutoModelForMaskGeneration, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：SlimSAM-77（SAM 的蒸馏版，与 SamModel 同架构同用法），
// q8 两个会话合计约 13.8 MB；官方示例用的 sam-vit-base q8 约 106 MB，浏览器示例换 SlimSAM
const MODEL_ID = 'Xenova/slimsam-77-uniform';

export type PromptStatus = 'loading' | 'running' | 'ready' | 'error';

export interface PromptOptions {
  imageUrl: string;
}

export interface PromptSnapshot {
  status: PromptStatus;
  message: string;
  progress: number;
  /** 最近一次点击的原图坐标 */
  clickPoint: string | null;
  /** 三个候选 mask 的 iou 分数（降序展示前保留原始顺序） */
  iouScores: string | null;
  /** 选中的候选序号（iou 最高） */
  selectedMask: string | null;
  loadSeconds: string | null;
}

export interface PromptInstance {
  update(options: PromptOptions): void;
  dispose(): void;
}

/** RawImage 的最小使用面 */
interface RawImageLike {
  width: number;
  height: number;
  channels: number;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

/** SamProcessor 调用输出：预处理结果 + 尺寸记录（[height, width] 元组）+ 缩放后的提示 */
interface ProcessorOutputLike {
  pixel_values: unknown;
  original_sizes: Array<[number, number]>;
  reshaped_input_sizes: Array<[number, number]>;
  input_points?: unknown;
  input_labels?: unknown;
}

type SamProcessorLike = {
  (
    image: RawImageLike,
    options?: Record<string, unknown>,
  ): Promise<ProcessorOutputLike>;
  /** 把 [batch, 3, 256, 256] 的候选上采样回原图尺寸并二值化，返回每图一个 bool 张量 */
  post_process_masks(
    masks: unknown,
    originalSizes: unknown,
    reshapedSizes: unknown,
    options?: Record<string, unknown>,
  ): Promise<Array<{ dims: number[]; data: Uint8Array }>>;
};

type SamModelLike = {
  (inputs: Record<string, unknown>): Promise<{
    iou_scores: { dims: number[]; data: Float32Array };
    pred_masks: unknown;
  }>;
  /** 图像嵌入只依赖图片；返回的两个键可直接传回 model(...) 跳过视觉编码器 */
  get_image_embeddings(inputs: {
    pixel_values: unknown;
  }): Promise<{
    image_embeddings: unknown;
    image_positional_embeddings: unknown;
  }>;
};

interface PromptResult {
  /** 三个候选的 iou 分数（float32） */
  scores: number[];
  /** iou 最高的候选下标 */
  best: number;
  /** 最佳候选的 bool 数据（0/1），width × height 等长 */
  maskData: Uint8Array;
  width: number;
  height: number;
}

export function createSamPromptMask(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PromptSnapshot) => void,
): PromptInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PromptOptions = { imageUrl: '' };
  let status: PromptStatus = 'loading';
  let message = '滚动到本实例后开始加载模型…';
  let progress = 0;
  let lastPercent = -1;

  type ModuleLike = {
    RawImage: { fromURL(url: string): Promise<RawImageLike> };
    AutoProcessor: { from_pretrained(id: string): Promise<SamProcessorLike> };
    AutoModelForMaskGeneration: {
      from_pretrained(
        id: string,
        options?: Record<string, unknown>,
      ): Promise<SamModelLike>;
    };
  };
  let tf: ModuleLike | null = null;
  let processor: SamProcessorLike | null = null;
  let model: SamModelLike | null = null;

  // 当前图片与其图像嵌入缓存（换点不换图时跳过视觉编码器）
  let currentImage: RawImageLike | null = null;
  let imageCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let embeddings: Awaited<
    ReturnType<SamModelLike['get_image_embeddings']>
  > | null = null;

  let clickPoint: { x: number; y: number } | null = null;
  let lastResult: PromptResult | null = null;

  let loadSeconds: string | null = null;
  let loading = false;
  let running = false;
  let disposed = false;
  let runToken = 0;

  // 左面板中图片的 contain-fit 区域（逻辑坐标），点击坐标按它映射回原图
  let imageRect: { x: number; y: number; w: number; h: number } | null = null;

  function snapshot(): PromptSnapshot {
    return {
      status,
      message,
      progress,
      clickPoint: clickPoint ? `(${clickPoint.x}, ${clickPoint.y})` : null,
      iouScores: lastResult
        ? lastResult.scores.map((value) => value.toFixed(3)).join(' / ')
        : null,
      selectedMask: lastResult ? `#${lastResult.best + 1}（iou 最高）` : null,
      loadSeconds,
    };
  }

  /** 把最佳候选 mask 渲染成半透明蓝色叠层（与原图同尺寸） */
  function paintMask(): HTMLCanvasElement | null {
    if (!lastResult) {
      return null;
    }
    const { width, height, maskData } = lastResult;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < maskData.length; ++i) {
      if (maskData[i] === 1) {
        rgba[i * 4] = 79;
        rgba[i * 4 + 1] = 124;
        rgba[i * 4 + 2] = 255;
        rgba[i * 4 + 3] = 150;
      }
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

    if (!currentImage) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 110);
      return;
    }

    // 左右两块面板：原图（点击选点）/ 最佳 mask 叠加；底部留给 readout 面板
    const panelY = 56;
    const panelH = height - panelY - 118;
    const panelW = (width - 96 - 20) / 2;
    const left = { x: 48, y: panelY, w: panelW, h: panelH };
    const right = { x: 48 + panelW + 20, y: panelY, w: panelW, h: panelH };

    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(left.x - 1, left.y - 1, left.w + 2, left.h + 2);
    drawingContext.fillRect(right.x - 1, right.y - 1, right.w + 2, right.h + 2);

    if (!imageCanvas) {
      imageCanvas = currentImage.toCanvas();
    }

    // 左面板：原图 + 点击位置十字标记
    imageRect = drawContain(
      imageCanvas as CanvasImageSource,
      currentImage.width,
      currentImage.height,
      left,
    );
    if (clickPoint && imageRect) {
      const px =
        imageRect.x + (clickPoint.x / currentImage.width) * imageRect.w;
      const py =
        imageRect.y + (clickPoint.y / currentImage.height) * imageRect.h;
      drawingContext.strokeStyle = '#ffffff';
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.arc(px, py, 9, 0, Math.PI * 2);
      drawingContext.stroke();
      drawingContext.strokeStyle = '#4f7cff';
      drawingContext.beginPath();
      drawingContext.moveTo(px - 14, py);
      drawingContext.lineTo(px + 14, py);
      drawingContext.moveTo(px, py - 14);
      drawingContext.lineTo(px, py + 14);
      drawingContext.stroke();
      drawingContext.lineWidth = 1;
    }

    // 右面板：原图 + 最佳候选 mask 半透明叠加
    drawContain(
      imageCanvas as CanvasImageSource,
      currentImage.width,
      currentImage.height,
      right,
      paintMask() as CanvasImageSource | null,
    );

    // 右面板右下角：三个候选的 iou 分数条
    if (lastResult) {
      drawIouBars(right);
    } else {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('点击左图选择提示点', right.x + 14, right.y + 24);
    }
  }

  /** contain 缩放绘制，返回实际绘制区域（供点击坐标换算）；带 overlay 时同框叠加 */
  function drawContain(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    box: { x: number; y: number; w: number; h: number },
    overlay?: CanvasImageSource | null,
  ): { x: number; y: number; w: number; h: number } {
    const scale = Math.min(box.w / sourceWidth, box.h / sourceHeight);
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    const x = box.x + (box.w - drawW) / 2;
    const y = box.y + (box.h - drawH) / 2;
    drawingContext.drawImage(source, x, y, drawW, drawH);
    if (overlay) {
      drawingContext.drawImage(overlay, x, y, drawW, drawH);
    }
    return { x, y, w: drawW, h: drawH };
  }

  /** iou 分数条画在右面板内右下角：mask #n + 分数条 + 数值 */
  function drawIouBars(box: { x: number; y: number; w: number; h: number }): void {
    if (!lastResult) {
      return;
    }
    const rowH = 17;
    const boxW = Math.min(box.w - 16, 190);
    const boxH = lastResult.scores.length * rowH + 14;
    const x = box.x + box.w - boxW - 8;
    const y = box.y + box.h - boxH - 8;

    drawingContext.fillStyle = 'rgba(255, 255, 255, 0.88)';
    drawingContext.fillRect(x, y, boxW, boxH);
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.strokeRect(x, y, boxW, boxH);

    lastResult.scores.forEach((value, index) => {
      const rowY = y + 13 + index * rowH;
      const isBest = index === lastResult.best;
      drawingContext.fillStyle = isBest ? '#15803d' : '#475569';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(`#${index + 1}`, x + 8, rowY);
      const barX = x + 30;
      const barW = boxW - 78;
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(barX, rowY - 8, barW, 9);
      drawingContext.fillStyle = isBest ? '#15803d' : '#4f7cff';
      drawingContext.fillRect(barX, rowY - 8, barW * value, 9);
      drawingContext.fillStyle = '#334155';
      drawingContext.fillText(value.toFixed(3), barX + barW + 6, rowY);
    });
  }

  /** 画布点击 → 原图像素坐标 → 运行一次提示解码 */
  function handleClick(event: MouseEvent): void {
    if (disposed || running || !currentImage || !imageRect || !processor || !model) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (
      localX < imageRect.x ||
      localY < imageRect.y ||
      localX > imageRect.x + imageRect.w ||
      localY > imageRect.y + imageRect.h
    ) {
      return;
    }
    const x = Math.round(((localX - imageRect.x) / imageRect.w) * currentImage.width);
    const y = Math.round(((localY - imageRect.y) / imageRect.h) * currentImage.height);
    void runPrompt(x, y);
  }

  /** 核心链路：提示编码 → 前向（复用缓存的图像嵌入）→ 还原 → argmax iou */
  async function runPrompt(x: number, y: number): Promise<void> {
    if (!processor || !model || !embeddings || !currentImage || disposed || running) {
      return;
    }
    running = true;
    const runId = ++runToken;
    status = 'running';
    message = '解码 mask 中…';
    draw();
    try {
      // ① 提示编码：点坐标用原图像素坐标（形状 [batch, point_batch, num_points, 2]），
      //    processor 内部缩放到模型输入坐标系并补 input_labels
      const inputs = await processor(currentImage, { input_points: [[[x, y]]] });

      // ② 前向：图像嵌入来自缓存 → 跳过视觉编码器，只跑提示编码器 + mask 解码器
      const outputs = await model({
        image_embeddings: embeddings.image_embeddings,
        image_positional_embeddings: embeddings.image_positional_embeddings,
        input_points: inputs.input_points,
        input_labels: inputs.input_labels,
      });

      // ③ 还原：上采样回原图尺寸并二值化（mask_threshold 默认 0）→ bool 张量 [1, 3, H, W]
      const masks = await processor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes,
      );
      if (disposed || runId !== runToken) {
        return;
      }

      // ④ 选择：每个提示给 3 个候选 mask，各带 iou 估计，取最高者展示
      const scores = Array.from(outputs.iou_scores.data) as number[];
      const best = scores.indexOf(Math.max(...scores));
      const dims = masks[0].dims; // [1, 3, H, W]
      const plane = dims[2] * dims[3];
      lastResult = {
        scores,
        best,
        maskData: (masks[0].data as Uint8Array).slice(
          best * plane,
          (best + 1) * plane,
        ),
        width: dims[3],
        height: dims[2],
      };
      clickPoint = { x, y };
      status = 'ready';
      message = '就绪：继续点击其他目标，或切换图片';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `推理失败：${detail}。常见原因：点击过快或图片尚未就绪；稍候再点击即可重试。`;
      draw();
    } finally {
      running = false;
    }
  }

  /** 读图并预计算图像嵌入（只依赖图片，换点不换图时无需重算） */
  async function prepareImage(url: string): Promise<void> {
    if (!tf || !processor || !model || disposed || running) {
      return;
    }
    running = true;
    const runId = ++runToken;
    status = 'running';
    message = '读取图片并计算图像嵌入…';
    draw();
    try {
      const raw = await tf.RawImage.fromURL(url);

      // 无提示调用 processor：只拿 pixel_values（preprocessor_config：
      // 最长边 1024 resize + pad 到 1024×1024）
      const inputs = await processor(raw);
      const cached = await model.get_image_embeddings({
        pixel_values: inputs.pixel_values,
      });
      if (disposed || runId !== runToken) {
        return;
      }
      currentImage = raw;
      imageCanvas = null;
      embeddings = cached;
      clickPoint = null;
      lastResult = null;
      status = 'ready';
      message = '就绪：点击左图中的目标生成该点的 mask';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `准备失败：${detail}。常见原因：图片 URL 不可访问或跨域受限；切换「示例图片」即可重试。`;
      draw();
    } finally {
      running = false;
    }
  }

  async function load(): Promise<void> {
    if (processor || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = (await import(/* @vite-ignore */ TRANSFORMERS_CDN)) as ModuleLike;

      // processor 只下载 preprocessor_config.json；进度主要来自两个 q8 会话
      const loadedProcessor = await mod.AutoProcessor.from_pretrained(MODEL_ID);
      const loadedModel = await mod.AutoModelForMaskGeneration.from_pretrained(
        MODEL_ID,
        {
          progress_callback: (info: { status: string; progress?: number }) => {
            if (disposed) {
              return;
            }
            // 事件流：initiate → download → progress（单文件）→ done；
            // progress_total 聚合所有文件（这里共两个 q8 会话）
            if (info.status === 'progress' || info.status === 'progress_total') {
              const percent = Math.round(info.progress ?? 0);
              if (percent !== lastPercent) {
                lastPercent = percent;
                progress = percent;
                message = `正在下载 SlimSAM（q8 约 13.8 MB，仅首次）：${percent}%`;
                draw();
              }
            }
          },
        },
      );
      if (disposed) {
        return;
      }
      tf = mod;
      processor = loadedProcessor;
      model = loadedModel;
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；点击左图开始提示分割`;
      status = 'ready';
      draw();
      void prepareImage(current.imageUrl);
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
  canvas.addEventListener('click', handleClick);
  draw(); // 先画一帧加载提示，避免画布空白

  // 长驻下载延迟到画布滚入视口：避免与本页上方分割实例同时下载
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
      current = options;
      if (disposed) {
        return;
      }
      draw(); // 参数回显立即更新
      if (urlChanged && processor && model) {
        // 换图重新读图 + 重算图像嵌入（提示与 mask 一并清空）
        void prepareImage(options.imageUrl);
      }
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener('click', handleClick);
      visibility?.disconnect();
      resizeObserver.disconnect();
      processor = null;
      model = null;
      currentImage = null;
      imageCanvas = null;
      embeddings = null;
      lastResult = null;
    },
  };
}
