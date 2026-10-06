/**
 * 范例：同一张图分别跑 image-classification 与 object-detection——
 * 「标签 + 分数」列表与「边界框」数组两种输出契约的对照，以及检测阈值过滤。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB），再依次下载两个 q8 模型：
 *   分类 Xenova/mobilevit-small（约 6.3 MB，与 2.1.3 课共享浏览器缓存）与
 *   检测 Xenova/yolos-tiny（约 9.7 MB），合计约 16 MB。
 * - 输入：Controls 的「示例图片」（三张官方文档数据集图片，可跨域访问）与
 *   「检测阈值」（0.25–0.95，默认 0.9）。
 * - 操作：等待「状态」变为 就绪；切换图片观察左侧 top-3 分数条与右侧边界框；
 *   拖动「检测阈值」观察框数量的增减。
 * - 预期结果：同一张图，分类给出至多 3 条 { label, score }（softmax 概率，
 *   标签来自 ImageNet 1000 类）；检测给出若干 { score, label, box }（box 为
 *   原图像素坐标，标签来自 COCO 80 类），threshold 越高保留的框越少；
 *   老虎一张图分类命中、检测常常零框——两类任务标签空间不同的直接证据。
 * - 阅读主线：ensurePipelines（按需加载两个管线）→ run（读图 → 分类 → 检测）
 *   → draw（左列表、右框渲染）；阈值过滤按 score ≥ threshold 在 draw 侧复现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用本手册确立的官方 CDN 动态导入；
// npm 项目请改用：import { pipeline, RawImage } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 两个示例模型：分类沿用 2.1.3 课的 MobileViT（共享缓存）；检测用 YOLOS-tiny
const CLASSIFY_MODEL_ID = 'Xenova/mobilevit-small'; // ImageNet-1k 1000 类，q8 约 6.3 MB
const DETECT_MODEL_ID = 'Xenova/yolos-tiny'; // COCO 80 类，q8 约 9.7 MB

// 「检测阈值」滑块的最低档：检测管线按此阈值调用一次拿到全量候选，
// 滑块的其余档位用同一规则（保留 score ≥ threshold，v4.3.0 源码）即时过滤，
// 避免拖动滑块就重新推理。直接调用 detector(image, { threshold }) 结果一致。
export const THRESHOLD_MIN = 0.25;

export type CompareStatus = 'loading' | 'running' | 'ready' | 'error';

export interface CompareOptions {
  imageUrl: string;
  /** Controls 原始值（0.25–0.95）：保留 score ≥ threshold 的框 */
  threshold: number;
}

export interface CompareSnapshot {
  status: CompareStatus;
  message: string;
  threshold: number;
  /** 分类 top-1 的「标签（分数%）」文本 */
  top1: string | null;
  /** 按当前 threshold 过滤后的框数 */
  detectionCount: number | null;
  /** 过滤后第一个框的原始坐标文本（原图像素坐标） */
  firstBox: string | null;
  loadSeconds: string | null;
}

export interface CompareInstance {
  update(options: CompareOptions): void;
  dispose(): void;
}

/** RawImage 的最小使用面：像素尺寸 + 画布导出（两个管线都直接接受 RawImage） */
interface RawImageLike {
  width: number;
  height: number;
  toCanvas(): HTMLCanvasElement | OffscreenCanvas;
}

/** image-classification 管线输出（单条输入）：标签分数列表 */
interface ClassificationItem {
  label: string;
  score: number;
}

/** object-detection 管线输出（单条输入）：边界框数组；box 为原图像素坐标 */
interface DetectionItem {
  score: number;
  label: string;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

type ClassifyPipe = (
  image: RawImageLike,
  options?: { top_k?: number },
) => Promise<unknown>;
type DetectPipe = (
  image: RawImageLike,
  options?: { threshold?: number },
) => Promise<unknown>;

type TransformersModule = {
  RawImage: { fromURL(url: string): Promise<RawImageLike> };
  pipeline(
    task: 'image-classification' | 'object-detection',
    modelId: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
};

/** 每个标签固定一种颜色：按首次出现的顺序循环取色 */
const BOX_COLORS = [
  '#e11d48',
  '#0ea5e9',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#ec4899',
];

export function createCompareInstance(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CompareSnapshot) => void,
): CompareInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CompareOptions = { imageUrl: '', threshold: 0.9 };
  let status: CompareStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let progress = 0;
  let lastPercent = -1;

  let top3: ClassificationItem[] | null = null;
  // 检测原始输出（threshold = THRESHOLD_MIN 的全量候选），展示时按阈值过滤
  let detections: DetectionItem[] | null = null;
  let imageSize: { width: number; height: number } | null = null;
  // 当前图片的画布缓存：run() 里把 RawImage 转成 canvas，draw 只消费不转换
  let imageCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;

  let library: TransformersModule | null = null;
  let classifier: ClassifyPipe | null = null;
  let detector: DetectPipe | null = null;
  let pipelinesPromise: Promise<void> | null = null;

  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  /** 与管线内部一致的过滤规则：保留 score ≥ threshold 的框（v4.3.0 源码） */
  function visibleDetections(): DetectionItem[] {
    if (!detections) {
      return [];
    }
    return detections.filter((item) => item.score >= current.threshold);
  }

  function snapshot(): CompareSnapshot {
    const visible = visibleDetections();
    const first = visible[0];
    return {
      status,
      message,
      threshold: current.threshold,
      top1:
        top3 && top3[0]
          ? `${top3[0].label}（${(top3[0].score * 100).toFixed(1)}%）`
          : null,
      detectionCount: detections ? visible.length : null,
      firstBox: first
        ? `{ xmin: ${first.box.xmin}, ymin: ${first.box.ymin}, xmax: ${first.box.xmax}, ymax: ${first.box.ymax} }`
        : detections
          ? '无（全部被过滤）'
          : null,
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

  /** 按需加载两个管线（各加载一次，换图不重新加载）；失败清掉缓存可重试 */
  function ensurePipelines(): Promise<void> {
    if (classifier && detector) {
      return Promise.resolve();
    }
    if (!pipelinesPromise) {
      const startedAt = performance.now();
      pipelinesPromise = (async () => {
        // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
        const mod = (await import(
          /* @vite-ignore */ TRANSFORMERS_CDN
        )) as TransformersModule;
        library = mod;

        // 分类管线：q8 约 6.3 MB，与 2.1.3 课共享浏览器缓存
        classifier = (await mod.pipeline(
          'image-classification',
          CLASSIFY_MODEL_ID,
          {
            progress_callback: (info: { status: string; progress?: number }) => {
              if (disposed) {
                return;
              }
              // 事件流：initiate → download → progress（单文件）→ done
              if (info.status === 'progress' || info.status === 'progress_total') {
                reportProgress(
                  `正在下载分类模型 ${CLASSIFY_MODEL_ID}（q8 约 6.3 MB，仅首次）`,
                  info.progress ?? 0,
                );
              }
            },
          },
        )) as ClassifyPipe;

        // 检测管线：YOLOS-tiny 输入分辨率更高（短边 512），q8 约 9.7 MB
        detector = (await mod.pipeline('object-detection', DETECT_MODEL_ID, {
          progress_callback: (info: { status: string; progress?: number }) => {
            if (disposed) {
              return;
            }
            if (info.status === 'progress' || info.status === 'progress_total') {
              reportProgress(
                `正在下载检测模型 ${DETECT_MODEL_ID}（q8 约 9.7 MB，仅首次）`,
                info.progress ?? 0,
              );
            }
          },
        })) as DetectPipe;

        loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      })();
      pipelinesPromise.catch(() => {
        // 加载失败清掉缓存的 Promise，切换任意控件后可重试
        pipelinesPromise = null;
      });
    }
    return pipelinesPromise;
  }

  /** 核心链路：读图 → 分类（top_k: 3）→ 检测（threshold: THRESHOLD_MIN） */
  async function run(): Promise<void> {
    if (disposed) {
      return;
    }
    const runId = ++runToken;
    const ready = Boolean(classifier && detector);
    status = ready ? 'running' : 'loading';
    if (ready) {
      message = '读取图片并推理…';
    }
    draw();
    try {
      await ensurePipelines();
      if (disposed || runId !== runToken) {
        return;
      }

      // ① 读图：URL → RawImage；两个管线都直接接受 RawImage，避免重复下载
      status = 'running';
      message = '读取图片，分类推理中…';
      draw();
      const image = await library!.RawImage.fromURL(current.imageUrl);
      if (disposed || runId !== runToken) {
        return;
      }
      imageSize = { width: image.width, height: image.height };
      imageCanvas = image.toCanvas();

      // ② image-classification：整图 → [{ label, score }]；top_k 默认 5，实例取 3
      const classifyOutput = (await classifier!(image, {
        top_k: 3,
      })) as ClassificationItem[] | ClassificationItem;
      if (disposed || runId !== runToken) {
        return;
      }
      const list = Array.isArray(classifyOutput)
        ? classifyOutput
        : [classifyOutput];
      top3 = list.filter(
        (item) =>
          typeof item?.label === 'string' && typeof item?.score === 'number',
      );

      // ③ object-detection：整图 → [{ score, label, box }]；box 为原图像素坐标
      message = '分类完成，检测推理中（YOLOS-tiny 输入分辨率更高，需数秒）…';
      draw();
      const detectOutput = (await detector!(image, {
        threshold: THRESHOLD_MIN,
      })) as DetectionItem[];
      if (disposed || runId !== runToken) {
        return;
      }
      detections = Array.isArray(detectOutput) ? detectOutput : [detectOutput];

      status = 'ready';
      message = '就绪：切换图片或拖动「检测阈值」观察变化';
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

    const contentWidth = width - 96;

    // 加载 / 出错：整幅进度条 + 文字消息（与兄弟课同一状态机模式）
    if (status === 'loading' || status === 'error') {
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

    // 就绪 / 推理中：左列分类 top-3，右列图片 + 边界框叠加
    drawClassifyPanel();
    drawDetectPanel();
  }

  /** 左列：image-classification 的 [{ label, score }] → top-3 分数条 */
  function drawClassifyPanel(): void {
    const panelRight = width / 2 - 32;
    const panelWidth = panelRight - 48;

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `${CLASSIFY_MODEL_ID} · q8 约 6.3 MB`,
      48,
      66,
    );

    if (!top3) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, panelWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 128 + index * 20);
      });
      return;
    }

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('top-3（softmax 概率）', 48, 96);

    const trackWidth = Math.max(60, panelWidth - 56);
    top3.forEach((item, index) => {
      const top = 118 + index * 56;
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(fitLabel(item.label, trackWidth), 48, top + 4);

      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, top + 12, trackWidth, 13);
      drawingContext.fillStyle = index === 0 ? '#15803d' : '#4f7cff';
      drawingContext.fillRect(48, top + 12, trackWidth * item.score, 13);
      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(
        `${(item.score * 100).toFixed(2)}%`,
        48 + trackWidth + 6,
        top + 23,
      );
    });

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('top_k 默认 5，实例取 3', 48, 118 + 3 * 56 + 12);
  }

  /** 右列：object-detection 的 [{ score, label, box }] → 原图叠加边界框 */
  function drawDetectPanel(): void {
    const panelLeft = width / 2 + 32;
    const panelWidth = width - panelLeft - 48;

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `${DETECT_MODEL_ID} · q8 约 9.7 MB`,
      panelLeft,
      66,
    );

    const areaTop = 88;
    const areaHeight = height - areaTop - 64;

    if (!imageSize || !imageCanvas) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      wrapText(message, panelWidth).forEach((line, index) => {
        drawingContext.fillText(line, panelLeft, 128 + index * 20);
      });
      return;
    }

    // 原图等比缩放适配右列区域
    const scale = Math.min(panelWidth / imageSize.width, areaHeight / imageSize.height);
    const drawW = imageSize.width * scale;
    const drawH = imageSize.height * scale;
    const imageX = panelLeft + (panelWidth - drawW) / 2;
    const imageY = areaTop + (areaHeight - drawH) / 2;

    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(imageX - 1, imageY - 1, drawW + 2, drawH + 2);
    drawingContext.drawImage(
      imageCanvas as CanvasImageSource,
      imageX,
      imageY,
      drawW,
      drawH,
    );

    const visible = visibleDetections();
    if (detections && visible.length === 0) {
      drawingContext.fillStyle = '#b45309';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        `score ≥ ${current.threshold.toFixed(2)} 过滤后无框：调低阈值可看到低分候选`,
        panelLeft,
        imageY + 20,
      );
    }

    const labels: string[] = [];
    for (const item of visible) {
      if (!labels.includes(item.label)) {
        labels.push(item.label);
      }
    }
    for (const item of visible) {
      drawBox(item, colorFor(item.label, labels), imageX, imageY, scale);
    }

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `原图 ${imageSize.width}×${imageSize.height}（宽×高）· box 为原图像素坐标`,
      panelLeft,
      height - 46,
    );
  }

  function drawBox(
    item: DetectionItem,
    color: string,
    imageX: number,
    imageY: number,
    scale: number,
  ): void {
    const { xmin, ymin, xmax, ymax } = item.box;
    const x = imageX + xmin * scale;
    const y = imageY + ymin * scale;
    const w = (xmax - xmin) * scale;
    const h = (ymax - ymin) * scale;

    drawingContext.strokeStyle = color;
    drawingContext.lineWidth = 2;
    drawingContext.strokeRect(x, y, w, h);

    // 标签芯片：默认贴框左上外侧，越出图片顶部时移入框内
    const text = `${item.label} ${(item.score * 100).toFixed(0)}%`;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const chipWidth = drawingContext.measureText(text).width + 10;
    const chipHeight = 16;
    let chipX = x;
    let chipY = y - chipHeight - 2;
    if (chipY < imageY) {
      chipY = y + 2;
    }
    drawingContext.fillStyle = color;
    drawingContext.fillRect(chipX, chipY, chipWidth, chipHeight);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillText(text, chipX + 5, chipY + 12);
  }

  function colorFor(label: string, labels: string[]): string {
    const index = Math.max(0, labels.indexOf(label));
    return BOX_COLORS[index % BOX_COLORS.length]!;
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
  void run();

  return {
    update(options) {
      const urlChanged = options.imageUrl !== current.imageUrl;
      current = options;
      if (disposed) {
        return;
      }
      if (urlChanged) {
        // 换图只重新推理，不重新加载模型
        void run();
      } else {
        // 仅阈值变化：按新阈值重新过滤并重绘，不重新推理
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      classifier = null;
      detector = null;
      library = null;
      pipelinesPromise = null;
      imageCanvas = null;
    },
  };
}
