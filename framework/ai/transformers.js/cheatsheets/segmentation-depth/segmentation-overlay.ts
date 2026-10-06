/**
 * 范例：image-segmentation 管线（语义分割）的完整闭环——SegFormer 对整图做
 * 像素级类别预测，管线后处理输出「每个出现类别一个 mask」（单通道 RawImage，
 * 命中像素 255），再把互斥的各类别 mask 按颜色合成、半透明叠回原图并给出图例。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB，本页所有实例共享一次），
 *   再从 Hub 下载 segformer-b0（q8 约 4.4 MB）。管线按 image processor 自带的
 *   后处理方法自动判定 subtask 为 semantic（SegformerImageProcessor 只包装了
 *   post_process_semantic_segmentation）。
 * - 输入：Controls 的「示例图片」（两张官方文档数据集图片）与「mask 不透明度」。
 * - 操作：等待「状态」变为 就绪；切换图片重新分割；拖动不透明度观察叠加效果。
 * - 预期结果：画布左图右叠加，图例按覆盖率列出类别（语义分割不输出 score，
 *   用覆盖率排序）；mask 尺寸与原图一致，每个像素恰好属于一个类别。
 * - 阅读主线：load（加载状态机）→ segment（推理 + 覆盖率统计）→
 *   paintOverlay（mask.data 逐像素着色）→ draw（双面板 + 图例）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { pipeline, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：SegFormer-B0（ADE20K 150 类语义分割），q8 权重约 4.4 MB；
// 任务默认的 detr-resnet-50-panoptic q8 约 44.5 MB，浏览器示例偏重。
// 注意：不要显式传 subtask（v4.3.0 对显式值的处理有缺陷，见正文「常见问题」），
// 省略时管线按 image processor 自带的后处理方法自动判定
const MODEL_ID = 'Xenova/segformer-b0-finetuned-ade-512-512';

export type OverlayStatus = 'loading' | 'running' | 'ready' | 'error';

export interface OverlayOptions {
  imageUrl: string;
  /** 0–100，叠加层的整体透明度 */
  maskOpacity: number;
}

export interface OverlaySnapshot {
  status: OverlayStatus;
  message: string;
  progress: number;
  /** 出现的类别数（= 输出条目数） */
  labelCount: number | null;
  /** 覆盖率最高的类别（替代语义分割缺失的 score） */
  top1: string | null;
  /** mask 尺寸（与原图一致） */
  maskSize: string | null;
  /** 推理用时（预处理 + 前向 + 后处理） */
  timing: string | null;
  loadSeconds: string | null;
}

export interface OverlayInstance {
  update(options: OverlayOptions): void;
  dispose(): void;
}

/** 管线输出的最小形态：semantic 子任务下 score 固定为 null */
interface SegmentationOutputLike {
  label: string;
  score: number | null;
  mask: {
    width: number;
    height: number;
    channels: number;
    /** 命中像素 255、其余 0，与 width × height 等长 */
    data: Uint8ClampedArray;
  };
}

/** RawImage 的最小使用面 */
interface RawImageLike {
  width: number;
  height: number;
  channels: number;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

type SegmenterFn = (image: RawImageLike) => Promise<SegmentationOutputLike[]>;

interface LabeledRegion {
  label: string;
  /** mask 中 255 像素占整图比例 */
  coverage: number;
  mask: SegmentationOutputLike['mask'];
}

/** 按序号生成稳定颜色（金角分布的 hue），图例与叠加着色共用同一套 */
function paletteColor(index: number): [number, number, number] {
  const hue = ((index * 137.508) % 360) / 360;
  const s = 0.58;
  const l = 0.56;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(channel(hue + 1 / 3) * 255),
    Math.round(channel(hue) * 255),
    Math.round(channel(hue - 1 / 3) * 255),
  ];
}

export function createSegmentationOverlay(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OverlaySnapshot) => void,
): OverlayInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: OverlayOptions = { imageUrl: '', maskOpacity: 45 };
  let status: OverlayStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型（模型 q8 约 4.4 MB）…';
  let progress = 0;
  let lastPercent = -1;

  // CDN 模块与加载好的管线；输出为每个出现类别一条 mask（semantic）
  type ModuleLike = {
    RawImage: { fromURL(url: string): Promise<RawImageLike> };
    pipeline: (
      task: string,
      modelId: string,
      options?: Record<string, unknown>,
    ) => Promise<SegmenterFn>;
  };
  let tf: ModuleLike | null = null;
  let segmenter: SegmenterFn | null = null;

  // 推理结果缓存：调整不透明度只重绘，不重新推理
  let image: RawImageLike | null = null;
  let imageCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let results: LabeledRegion[] | null = null;

  let labelCount: number | null = null;
  let top1: string | null = null;
  let maskSize: string | null = null;
  let timing: string | null = null;
  let loadSeconds: string | null = null;

  let loading = false;
  let disposed = false;
  let runToken = 0;

  function snapshot(): OverlaySnapshot {
    return {
      status,
      message,
      progress,
      labelCount,
      top1,
      maskSize,
      timing,
      loadSeconds,
    };
  }

  /**
   * 把互斥的类别 mask 合成为一张带透明度的 RGBA 离屏画布。
   * 语义分割按像素 argmax：每个像素恰好命中一个类别的 255，
   * 因此按序遍历、首个命中即归属，不会互相覆盖。
   */
  function paintOverlay(): HTMLCanvasElement | null {
    if (!results || results.length === 0) {
      return null;
    }
    const { width, height } = results[0].mask;
    const rgba = new Uint8ClampedArray(width * height * 4);
    const alpha = Math.round((current.maskOpacity / 100) * 255);
    results.forEach((entry, index) => {
      const [r, g, b] = paletteColor(index);
      const data = entry.mask.data;
      for (let i = 0; i < data.length; ++i) {
        if (data[i] === 255 && rgba[i * 4 + 3] === 0) {
          rgba[i * 4] = r;
          rgba[i * 4 + 1] = g;
          rgba[i * 4 + 2] = b;
          rgba[i * 4 + 3] = alpha;
        }
      }
    });
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

    if (!image || !results) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 110);
      return;
    }

    // 左右两块面板：原图 / mask 叠加；底部留给 readout 面板
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

    // semantic 后处理恒产生至少一个类别；overlay 为 null 仅在结果为空时出现，
    // 此时右面板退化为只画原图，避免 drawImage 收到 null
    const overlay = paintOverlay();
    if (overlay) {
      drawContain(
        overlay as CanvasImageSource,
        results[0].mask.width,
        results[0].mask.height,
        right,
        imageCanvas as CanvasImageSource,
        image.width,
        image.height,
      );
    } else {
      drawContain(imageCanvas as CanvasImageSource, image.width, image.height, right);
    }

    drawLegend(right);
  }

  /** contain 缩放绘制；带 base 时先画底图再叠加同尺寸覆盖层 */
  function drawContain(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    box: { x: number; y: number; w: number; h: number },
    base?: CanvasImageSource,
    baseWidth?: number,
    baseHeight?: number,
  ): void {
    const scale = Math.min(box.w / sourceWidth, box.h / sourceHeight);
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    const x = box.x + (box.w - drawW) / 2;
    const y = box.y + (box.h - drawH) / 2;
    if (base && baseWidth !== undefined && baseHeight !== undefined) {
      const baseScale = Math.min(box.w / baseWidth, box.h / baseHeight);
      const bw = baseWidth * baseScale;
      const bh = baseHeight * baseScale;
      drawingContext.drawImage(
        base,
        box.x + (box.w - bw) / 2,
        box.y + (box.h - bh) / 2,
        bw,
        bh,
      );
    }
    drawingContext.drawImage(source, x, y, drawW, drawH);
  }

  /** 图例画在右面板内右上角：色块 + 类别名 + 覆盖率 */
  function drawLegend(box: { x: number; y: number; w: number; h: number }): void {
    if (!results || results.length === 0) {
      return;
    }
    const rowH = 16;
    const maxRows = Math.max(1, Math.floor((box.h - 18) / rowH));
    const shown = results.slice(0, Math.min(maxRows, 6));
    const panelW = Math.min(box.w - 16, 190);
    const panelH = shown.length * rowH + 14;
    const x = box.x + box.w - panelW - 8;
    const y = box.y + 8;

    drawingContext.fillStyle = 'rgba(255, 255, 255, 0.88)';
    drawingContext.fillRect(x, y, panelW, panelH);
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.strokeRect(x, y, panelW, panelH);

    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    shown.forEach((entry, index) => {
      const [r, g, b] = paletteColor(index);
      const rowY = y + 12 + index * rowH;
      drawingContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
      drawingContext.fillRect(x + 8, rowY - 8, 10, 10);
      drawingContext.fillStyle = '#334155';
      drawingContext.fillText(
        fitLabel(
          `${entry.label} ${(entry.coverage * 100).toFixed(1)}%`,
          panelW - 34,
        ),
        x + 24,
        rowY,
      );
    });
    if (results.length > shown.length) {
      drawingContext.fillStyle = '#64748b';
      drawingContext.fillText(
        `其余 ${results.length - shown.length} 类`,
        x + 24,
        y + 12 + shown.length * rowH,
      );
    }
  }

  /** 核心链路：读图 → 管线推理（processor → model → 语义后处理）→ 覆盖率统计 */
  async function segment(): Promise<void> {
    if (!tf || !segmenter || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '读取图片并分割…';
    draw();
    try {
      // ① 读图：URL → RawImage；管线同样接受 URL 字符串，
      //    这里先读一份复用同一像素画原图，避免重复下载
      const raw = await tf.RawImage.fromURL(current.imageUrl);

      // ② 推理：管线内部 = processor 预处理 → model 前向 →
      //    post_process_semantic_segmentation（插值回原图 + 逐像素 argmax）
      const startedAt = performance.now();
      const outputs = await segmenter(raw);
      const elapsed = performance.now() - startedAt;
      if (disposed || runId !== runToken) {
        return;
      }

      // ③ 统计：semantic 输出 score 为 null，用 mask 覆盖率排序；
      //    mask 与原图同尺寸、各类别互斥
      const total = outputs[0]?.mask.width * outputs[0]?.mask.height || 1;
      const regions = outputs.map((entry) => {
        let hits = 0;
        const data = entry.mask.data;
        for (let i = 0; i < data.length; ++i) {
          if (data[i] === 255) {
            ++hits;
          }
        }
        return {
          label: entry.label,
          coverage: hits / total,
          mask: entry.mask,
        };
      });
      regions.sort((a, b) => b.coverage - a.coverage);

      image = raw;
      imageCanvas = null;
      results = regions;
      labelCount = regions.length;
      top1 = regions.length
        ? `${regions[0].label}（${(regions[0].coverage * 100).toFixed(1)}% 覆盖）`
        : null;
      maskSize = regions.length
        ? `${regions[0].mask.width}×${regions[0].mask.height}（原图同尺寸）`
        : null;
      timing = `${elapsed.toFixed(0)} ms`;
      status = 'ready';
      message = '就绪：切换图片或拖动「mask 不透明度」观察变化';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `分割失败：${detail}。常见原因：图片 URL 不可访问或跨域受限；切换「示例图片」即可重试。`;
      draw();
    }
  }

  async function load(): Promise<void> {
    if (segmenter || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = (await import(/* @vite-ignore */ TRANSFORMERS_CDN)) as ModuleLike;

      const loaded = await mod.pipeline('image-segmentation', MODEL_ID, {
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
              message = `正在下载模型（q8 约 4.4 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      });
      if (disposed) {
        return;
      }
      tf = mod;
      segmenter = loaded;
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；换图只重新推理，不重新加载`;
      status = 'ready';
      draw();
      void segment();
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
      const opacityChanged = options.maskOpacity !== current.maskOpacity;
      current = options;
      if (disposed) {
        return;
      }
      if (segmenter && urlChanged) {
        // 换图只触发一次推理，不重新加载模型
        void segment();
      } else if (opacityChanged && results) {
        // 不透明度只影响着色：重绘即可（paintOverlay 读取 current.maskOpacity）
        draw();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      segmenter = null;
      image = null;
      imageCanvas = null;
      results = null;
    },
  };
}
