/**
 * 范例：zero-shot-image-classification 管线——一张图配一组候选标签，
 * 每个标签得到一个「图里有没有它」的概率。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1 MB），再从 Hub 下载 config、
 *   tokenizer 与 q8 组合图模型（约 154 MB）；完成后写入浏览器缓存，再次进入明显变快。
 * - 输入：Controls 的「示例图片」（两张官方文档数据集图片）与「候选标签」
 *   （逗号分隔的英文标签，默认 tiger, horse, dog 与官方示例一致）。
 * - 操作：等待「状态」变为 就绪；保持标签不变切换图片，观察概率分布翻转；
 *   编辑标签，观察概率在新的候选集内重新分配。
 * - 预期结果：老虎图上 tiger 以约 99.9% 压倒其余标签（官方示例 0.9994）；切到
 *   柯基图后 dog 反超为 top-1——同一组标签，概率分布随图片翻转。
 * - 阅读主线：load（加载管线与下载进度）→ classify（解析标签 → 管线调用）→
 *   draw（图片与概率条渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { pipeline, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：CLIP ViT-B/32（v4.3.0 该任务的注册表默认模型），q8 组合图约 154 MB
const MODEL_ID = 'Xenova/clip-vit-base-patch32';

export type ClipStatus = 'loading' | 'running' | 'ready' | 'error';

export interface ClipOptions {
  imageUrl: string;
  labelsText: string;
}

export interface ClipSnapshot {
  status: ClipStatus;
  message: string;
  /** 解析后的候选标签数；解析失败或未推理时为 null */
  labelsCount: number | null;
  /** top-1 预测，如 "tiger（99.94%）" */
  top1: string | null;
  loadSeconds: string | null;
}

export interface ClipInstance {
  update(options: ClipOptions): void;
  dispose(): void;
}

/** RawImage 的最小使用面：画布渲染只需要尺寸与 toCanvas */
interface RawImageLike {
  width: number;
  height: number;
  channels: number;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

/** 管线单条输出：score 已按降序排好（管线源码负责排序） */
interface ScoredLabel {
  label: string;
  score: number;
}

type ClassifierFn = (
  image: RawImageLike,
  candidateLabels: string[],
) => Promise<ScoredLabel[]>;

/** 小分数也保留足够的有效位，读得出 0.03% 这类量级差异 */
function percentText(score: number): string {
  const percent = score * 100;
  if (percent >= 1) {
    return `${percent.toFixed(2)}%`;
  }
  if (percent >= 0.01) {
    return `${percent.toFixed(3)}%`;
  }
  return `${percent.toFixed(4)}%`;
}

/** 把「tiger, horse, dog」这类文本解析成标签数组：逗号分隔、去空白、丢空项 */
function parseLabels(text: string): string[] {
  return text
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

export function createClipZeroShot(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ClipSnapshot) => void,
): ClipInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ClipOptions = { imageUrl: '', labelsText: '' };
  let status: ClipStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型（q8 约 154 MB）…';
  let progress = 0;
  let lastPercent = -1;
  let labelsCount: number | null = null;
  let top1: string | null = null;
  let results: ScoredLabel[] | null = null;
  let original: RawImageLike | null = null;
  let loadSeconds: string | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;

  // CDN 模块与加载好的管线实例；管线内部打包 tokenizer + processor + CLIP 组合图
  type ModuleLike = {
    RawImage: { fromURL(url: string): Promise<RawImageLike> };
    pipeline(
      task: 'zero-shot-image-classification',
      modelId: string,
      options?: Record<string, unknown>,
    ): Promise<ClassifierFn>;
  };
  let tf: ModuleLike | null = null;
  let classifier: ClassifierFn | null = null;

  function snapshot(): ClipSnapshot {
    return { status, message, labelsCount, top1, loadSeconds };
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
    drawingContext.fillText('zero-shot-image-classification：一张图 × 一组候选标签', 48, 38);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `Xenova/clip-vit-base-patch32（q8 · 512 维图文向量） · 模板 'This is a photo of {}'`,
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
      // running 且图片尚未取回：先给文字消息，避免画布空白
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 150 + index * 20);
      });
      return;
    }

    // 左半：当前图片（推理与画图用同一份 RawImage，只解码一次）
    const leftWidth = Math.min(Math.round(width * 0.42), 380);
    const box = { x: 48, y: 88, w: leftWidth - 24, h: height - 88 - 150 };
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
    const scale = Math.min(box.w / original.width, box.h / original.height);
    const drawW = original.width * scale;
    const drawH = original.height * scale;
    drawingContext.drawImage(
      original.toCanvas() as CanvasImageSource,
      box.x + (box.w - drawW) / 2,
      box.y + (box.h - drawH) / 2,
      drawW,
      drawH,
    );
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `原图 ${original.height}×${original.width}`,
      box.x - 1,
      box.y + box.h + 18,
    );

    // 右半：各标签概率条（管线输出已按 score 降序，第 0 条就是 top-1）
    const barsX = 48 + leftWidth + 24;
    const barsWidth = width - barsX - 48;
    if (results && barsWidth > 120) {
      const barCount = results.length;
      const barStep = Math.min(46, Math.floor((height - 152) / Math.max(1, barCount)));
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('各标签概率（softmax 后，降序）', barsX, 104);
      results.forEach((entry, index) => {
        const top = 122 + index * barStep;
        drawingContext.fillStyle = '#475569';
        drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(fitLabel(entry.label, barsWidth - 92), barsX, top + 6);

        drawingContext.fillStyle = '#e2e8f0';
        drawingContext.fillRect(barsX, top + 12, barsWidth - 64, 12);
        // 线性条宽就是证据：赢家通吃的分布下，低分条几乎不可见是正常现象
        const barLength = Math.max(2, (barsWidth - 64) * entry.score);
        drawingContext.fillStyle = index === 0 ? '#15803d' : '#4f7cff';
        drawingContext.fillRect(barsX, top + 12, barLength, 12);
        drawingContext.fillStyle = '#475569';
        drawingContext.fillText(
          percentText(entry.score),
          barsX + barsWidth - 56,
          top + 23,
        );
      });
    } else if (!results) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, barsX, 122);
    }
  }

  /** 核心调用：解析标签 → 取图 → 管线推理 → 读出降序概率 */
  async function classify(): Promise<void> {
    if (!tf || !classifier || disposed) {
      return;
    }
    const labels = parseLabels(current.labelsText);
    if (labels.length === 0) {
      // 候选标签被清空：不推理，保留画面并给出修正提示
      status = 'ready';
      results = null;
      top1 = null;
      labelsCount = null;
      message = '候选标签为空：请在「候选标签」里输入逗号分隔的英文标签';
      draw();
      return;
    }

    const runId = ++runToken;
    status = 'running';
    message = `编码图像与 ${labels.length} 条标签文本…`;
    results = null;
    top1 = null;
    draw();
    try {
      // ① 取图：RawImage 供展示与推理共用（RawImage.read 对实例原样返回）
      const image = await tf.RawImage.fromURL(current.imageUrl);
      if (disposed || runId !== runToken) {
        return;
      }
      original = image;
      draw();

      // ② 管线调用：标签套进模板 'This is a photo of {}' → 编码 → 相似度 → softmax
      //    注意管线每次调用都重新编码图像与文本两侧；高频复用见正文「手工图文相似度」
      const output = await classifier(image, labels);
      if (disposed || runId !== runToken) {
        return;
      }

      // ③ 读结果：[{ score, label }] 已降序；softmax 在候选集内归一化
      results = output;
      labelsCount = labels.length;
      top1 = `${output[0].label}（${percentText(output[0].score)}）`;
      status = 'ready';
      message = '就绪：保持标签不变切换图片看分布翻转，编辑标签看概率重新分配';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `推理失败：${detail}。常见原因：图片 URL 不可访问或跨域受限；恢复后切换「示例图片」即可重试。`;
      draw();
    }
  }

  async function load(): Promise<void> {
    if (classifier || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = (await import(/* @vite-ignore */ TRANSFORMERS_CDN)) as ModuleLike;

      // 显式指定模型 ID 与 dtype: 'q8'（onnx/model_quantized.onnx，约 152 MB），行为可复现
      classifier = await mod.pipeline('zero-shot-image-classification', MODEL_ID, {
        dtype: 'q8',
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
              message = `正在下载模型（q8 约 154 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      });
      if (disposed) {
        return;
      }
      tf = mod;
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；换图与改标签只重新编码，不重新下载`;
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
      const changed =
        options.imageUrl !== current.imageUrl ||
        options.labelsText !== current.labelsText;
      current = options;
      if (disposed) {
        return;
      }
      if (classifier && changed) {
        // 换图或改标签只触发一次推理，不重新加载模型
        void classify();
      } else if (!classifier && changed) {
        // 模型尚未就绪（含加载失败）：换输入即按当前值重试加载
        void load();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      classifier = null;
      tf = null;
      original = null;
      results = null;
    },
  };
}
