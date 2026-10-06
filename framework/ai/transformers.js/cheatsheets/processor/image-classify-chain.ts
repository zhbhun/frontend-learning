/**
 * 范例：processor 与 model 的完整配合链——RawImage 读取 → AutoProcessor 预处理
 * （resize → 中心裁剪 → rescale → 通道序翻转）→ AutoModelForImageClassification 前向
 * → softmax 解读 logits，走通图像分类的最小多模态链路。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB），再从 Hub 下载 config.json（约 70 KB）
 *   与 q8 量化模型（约 6.3 MB）；纯视觉模型不加载 tokenizer。
 * - 输入：Controls 的「示例图片」（三张官方文档数据集图片，可跨域访问）与
 *   「显示预处理输入」开关。
 * - 操作：等待「状态」读数变为 就绪；切换图片观察 top-5 概率条与预测变化；
 *   打开开关查看模型实际吃到的 256×256 输入。
 * - 预期结果：readout 给出 pixel_values 形状、原始→输入尺寸、预处理/前向用时与
 *   top-1 预测；画布左侧是图片、右侧是 top-5 概率条。
 * - 阅读主线：load（加载状态机）→ classify（预处理 → 前向 → softmax）→
 *   draw（图片与概率条渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { AutoProcessor, AutoModelForImageClassification, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：MobileViT 图像分类（ImageNet-1k 1000 类），q8 权重约 6.3 MB
const MODEL_ID = 'Xenova/mobilevit-small';

// 预处理参数（本模型的 preprocessor_config.json，本课示例用到两项）：
// size.shortest_edge = 288 —— 先把最短边 resize 到 288
// crop_size 256×256 —— 再从中心裁出 256×256 作为模型输入
const SHORTEST_EDGE = 288;
const CROP_SIZE = 256;

export type ChainStatus = 'loading' | 'running' | 'ready' | 'error';
export type ImageView = 'original' | 'preprocessed';

export interface TopPrediction {
  label: string;
  prob: number;
}

export interface ClassifySnapshot {
  status: ChainStatus;
  message: string;
  progress: number;
  view: ImageView;
  dims: number[] | null;
  sizeChange: string | null;
  timing: string | null;
  top1: string | null;
  top5: TopPrediction[] | null;
  loadSeconds: string | null;
}

export interface ClassifyInstance {
  update(options: ClassifyOptions): void;
  dispose(): void;
}

export interface ClassifyOptions {
  imageUrl: string;
  showPreprocessed: boolean;
}

/** RawImage 的最小使用面：像素缓冲 + 尺寸通道，以及 processor 内部用到的几何方法 */
interface RawImageLike {
  width: number;
  height: number;
  channels: number;
  resize(width: number, height: number): Promise<RawImageLike>;
  center_crop(width: number, height: number): Promise<RawImageLike>;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

/** processor 调用输出的最小形态：pixel_values 张量 + 尺寸记录（[height, width] 元组） */
interface ProcessorOutputLike {
  pixel_values: { dims: number[] };
  original_sizes: Array<[number, number]>;
  reshaped_input_sizes: Array<[number, number]>;
}

type ProcessorFn = (image: RawImageLike) => Promise<ProcessorOutputLike>;
type ModelFn = (inputs: {
  pixel_values: unknown;
}) => Promise<{ logits: { data: Float32Array | number[] } }>;

/** 手工 softmax：先减最大值再取指数，logits 量级大时也不会溢出 */
function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

export function createImageClassifyChain(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ClassifySnapshot) => void,
): ClassifyInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ClassifyOptions = { imageUrl: '', showPreprocessed: false };
  let status: ChainStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型（模型 q8 约 6.3 MB）…';
  let progress = 0;
  let lastPercent = -1;

  // CDN 模块与加载好的实例；processor 只含图像处理器，model 输出 1000 维 logits
  type ModuleLike = {
    RawImage: { fromURL(url: string): Promise<RawImageLike> };
    AutoProcessor: { from_pretrained(id: string): Promise<ProcessorFn> };
    AutoModelForImageClassification: {
      from_pretrained(
        id: string,
        options?: Record<string, unknown>,
      ): Promise<ModelFn & { config?: { id2label?: Record<string, string> } }>;
    };
  };
  let tf: ModuleLike | null = null;
  let processor: ProcessorFn | null = null;
  let model: (ModelFn & { config?: { id2label?: Record<string, string> } }) | null =
    null;

  // 当前图片与其预处理可视化缓存（用 RawImage 公开方法复刻 processor 的几何步骤）
  let original: RawImageLike | null = null;
  let preprocessed: RawImageLike | null = null;

  let dims: number[] | null = null;
  let sizeChange: string | null = null;
  let timing: string | null = null;
  let top1: string | null = null;
  let top5: TopPrediction[] | null = null;

  let loading = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  function snapshot(): ClassifySnapshot {
    return {
      status,
      message,
      progress,
      view: current.showPreprocessed ? 'preprocessed' : 'original',
      dims,
      sizeChange,
      timing,
      top1,
      top5,
      loadSeconds,
    };
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

    const contentWidth = width - 96;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('processor 预处理 → model 前向：图像分类手工链路', 48, 38);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `RawImage.fromURL(url) → processor(image) → model({ pixel_values })`,
      48,
      62,
    );

    if (status === 'loading' || status === 'error') {
      if (status === 'loading') {
        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(48, 108, contentWidth, 16);
        drawingContext.fillStyle = '#4f7cff';
        drawingContext.fillRect(
          48,
          108,
          (contentWidth * Math.min(100, progress)) / 100,
          16,
        );
      }
      drawingContext.fillStyle = status === 'error' ? '#b91c1c' : '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 152 + index * 20);
      });
      return;
    }

    if (!original) {
      // running 且图片尚未取回：与加载态一样先给出文字消息，避免画布空白
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 150 + index * 20);
      });
      return;
    }

    // 左半：图片（原图或预处理后的 256×256 模型输入），左下角留给 readout 面板
    const leftWidth = Math.min(Math.round(width * 0.42), 380);
    const box = { x: 48, y: 88, w: leftWidth - 24, h: height - 88 - 150 };
    const view =
      current.showPreprocessed && preprocessed ? preprocessed : original;
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
    const scale = Math.min(box.w / view.width, box.h / view.height);
    const drawW = view.width * scale;
    const drawH = view.height * scale;
    drawingContext.drawImage(
      view.toCanvas() as CanvasImageSource,
      box.x + (box.w - drawW) / 2,
      box.y + (box.h - drawH) / 2,
      drawW,
      drawH,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const caption =
      view === original
        ? `原图 ${original.height}×${original.width}（RawImage，${original.channels} 通道）`
        : `模型输入 ${view.height}×${view.width}（最短边 resize 到 288 后中心裁剪）`;
    drawingContext.fillText(fitLabel(caption, box.w + 2), box.x - 1, box.y + box.h + 18);

    // 右半：top-5 概率条（softmax 后，顺序按概率从高到低）
    const barsX = 48 + leftWidth + 24;
    const barsWidth = width - barsX - 48;
    if (top5 && barsWidth > 120) {
      // 行距随画布高度自适应，避免矮画布下 5 条概率条溢出
      const barStep = Math.min(46, Math.floor((height - 152) / 5));
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('top-5 概率（softmax）', barsX, 104);
      top5.forEach((entry, index) => {
        const top = 122 + index * barStep;
        drawingContext.fillStyle = '#475569';
        drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(fitLabel(entry.label, barsWidth - 64), barsX, top + 6);

        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(barsX, top + 12, barsWidth - 64, 12);
        drawingContext.fillStyle = index === 0 ? '#15803d' : '#4f7cff';
        drawingContext.fillRect(barsX, top + 12, (barsWidth - 64) * entry.prob, 12);
        drawingContext.fillStyle = '#475569';
        drawingContext.fillText(
          `${(entry.prob * 100).toFixed(2)}%`,
          barsX + barsWidth - 56,
          top + 23,
        );
      });
    }

    // 底部右侧：模型输入形状与结论线索（左下角 readout 显示数值细节）
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.textAlign = 'right';
    drawingContext.fillText(
      dims
        ? `pixel_values.dims = [${dims.join(', ')}]（batch × 通道 × 高 × 宽）`
        : '',
      width - 48,
      height - 16,
    );
    drawingContext.textAlign = 'left';
  }

  /** 预处理可视化：与 processor 相同的 resize + 中心裁剪步骤，用 RawImage 公开方法复现 */
  async function ensurePreprocessed(): Promise<void> {
    if (!tf || !original || preprocessed) {
      return;
    }
    const factor = Math.max(
      SHORTEST_EDGE / original.width,
      SHORTEST_EDGE / original.height,
    );
    const resized = await original.resize(
      Math.round(original.width * factor),
      Math.round(original.height * factor),
    );
    preprocessed = await resized.center_crop(CROP_SIZE, CROP_SIZE);
  }

  /** 核心链路：读图 → processor 预处理 → model 前向 → softmax 解读 */
  async function classify(): Promise<void> {
    if (!tf || !processor || !model || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '读取图片并预处理…';
    draw();
    try {
      // ① 读图：URL → RawImage（像素缓冲 + width / height / channels）
      const image = await tf.RawImage.fromURL(current.imageUrl);
      original = image;
      preprocessed = null;

      // ② 预处理：参数全部来自 preprocessor_config.json，输出 [batch, 3, H, W] 张量
      const t0 = performance.now();
      const outputs = await processor(image);
      const t1 = performance.now();

      // ③ 前向：只传 pixel_values；模型实例可像函数一样调用
      const output = await model({ pixel_values: outputs.pixel_values });
      const t2 = performance.now();
      if (disposed || runId !== runToken) {
        return;
      }

      // ④ 解读：1000 维 logits → softmax → id2label（config.json 的标签表）
      dims = outputs.pixel_values.dims;
      const [origH, origW] = outputs.original_sizes[0];
      sizeChange = `${origH}×${origW} → ${dims[2]}×${dims[3]}`;
      timing = `${(t1 - t0).toFixed(0)} ms / ${(t2 - t1).toFixed(0)} ms`;

      const scores = Array.from(output.logits.data) as number[];
      const probs = softmax(scores);
      const id2label = model.config?.id2label ?? {};
      const ranked = probs
        .map((prob, index) => ({
          label: id2label[String(index)] ?? `LABEL_${index}`,
          prob,
        }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 5);
      top5 = ranked;
      top1 = `${ranked[0].label}（${(ranked[0].prob * 100).toFixed(1)}%）`;
      status = 'ready';
      message = '就绪：切换图片或打开「显示预处理输入」观察变化';
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
    if (processor || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = (await import(/* @vite-ignore */ TRANSFORMERS_CDN)) as ModuleLike;

      // processor 与 model 分别加载；进度主要来自 q8 模型文件（约 6.3 MB）的下载
      const loadedProcessor = await mod.AutoProcessor.from_pretrained(MODEL_ID);
      const loadedModel = await mod.AutoModelForImageClassification.from_pretrained(
        MODEL_ID,
        {
          progress_callback: (info: { status: string; progress?: number }) => {
            if (disposed) {
              return;
            }
            // 事件流：initiate → download → progress（单文件）→ done；
            // v4 另有聚合所有文件的 progress_total；全部就绪后触发一次 ready
            if (info.status === 'progress' || info.status === 'progress_total') {
              const percent = Math.round(info.progress ?? 0);
              if (percent !== lastPercent) {
                lastPercent = percent;
                progress = percent;
                message = `正在下载模型（q8 约 6.3 MB，仅首次）：${percent}%`;
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
      message = `模型就绪，用时 ${loadSeconds} 秒；换图只重新预处理与前向，不重新加载`;
      status = 'ready';
      draw();
      void classify();
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

  function fitLabel(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 1 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
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
  void load();

  return {
    update(options) {
      const urlChanged = options.imageUrl !== current.imageUrl;
      const viewChanged = options.showPreprocessed !== current.showPreprocessed;
      current = options;
      if (disposed) {
        return;
      }
      if (processor && model && urlChanged) {
        // 换图只触发一次预处理 + 前向，不重新加载模型
        void classify();
      } else if (viewChanged && current.showPreprocessed && original && !preprocessed) {
        // 首次打开预处理视图：现算 256×256 可视化输入（毫秒级），完成后重绘
        void ensurePreprocessed()
          .then(() => {
            if (!disposed) {
              draw();
            }
          })
          .catch(() => {
            if (!disposed) {
              draw();
            }
          });
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      processor = null;
      model = null;
      original = null;
      preprocessed = null;
    },
  };
}
