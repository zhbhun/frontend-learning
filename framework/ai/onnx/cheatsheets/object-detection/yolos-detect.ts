/**
 * 范例：目标检测端到端——把一张照片送进 yolos-tiny，再把两个输出张量解码成
 * 检测框画到画布上。
 * 前置状态：浏览器需能访问模型（约 9.2MB）、ort wasm 工件与示例图的 CDN；模型与
 * 图片都锁了 revision；工作区无跨域隔离头，单线程 wasm，首次推理为秒级（机器相关）。
 * 操作：打开实例自动完成「加载 → 推理 → 解码 → 画框」；调整「置信度阈值」只重新
 * 解码（原始输出已缓存，不重新推理，读数立即刷新）；失败时点击画布可重试。
 * 预期结果：左画面出现带类别标签的检测框（照片主体是两只猫和两个遥控器），右列表
 * 是解码保留的候选；「候选集」读数 = 输出序列长度（patch 数 + 100 检测 token），
 * 「保留框数」随阈值变化。
 * 阅读主线：imageToInput（预处理）→ runDetection（推理）→ decodeDetections（解码，
 * 本课核心）→ draw（坐标换算与画框）；画板布局属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

import { COCO_LABELS } from './coco-labels';

/** yolos-tiny 量化版（9,661,148 字节）。URL 锁 revision：文件不可变，行为可复现。 */
export const MODEL_URL =
  'https://huggingface.co/Xenova/yolos-tiny/resolve/e2f9c7673f0fa61849efe2b56a0d7774779ebb9d/onnx/model_quantized.onnx';

/** 示例图：transformers.js 官方检测示例所用的 cats.jpg（640×480，COCO 类内容）。 */
export const IMAGE_URL =
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/fbe92bd97d48f3ec17779d8d8f2964e1c6bc7634/cats.jpg';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** 输入边长：patch(16) 的倍数；512 是模型卡预处理配置的短边。 */
const INPUT_SIZE = 512;
const PATCH_SIZE = 16;
/** YOLOS 用 100 个可学习的检测 token 报框（YOLOS 架构常量，见 transformers 文档）。 */
const NUM_DET_TOKENS = 100;
/** 分类头宽度：91 类（0–90，含 N/A 占位）+ 1 个 null 类。 */
const NUM_CLASSES = 92;
const NULL_CLASS_ID = 91;

/** 模型卡的归一化约定：÷255 后减 ImageNet 均值、除 ImageNet 标准差，逐通道。 */
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** 按类别 id 取色，画框时区分对象。 */
const PALETTE = [
  '#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#4d7c0f', '#b45309', '#4338ca',
];

/** 一次推理的原始输出：解码的输入，缓存后换阈值反复使用。 */
export interface RawOutputs {
  /** 候选数 N：从输出 dims 运行时读出 = patch 数 + 检测 token 数。 */
  candidateCount: number;
  /** 候选数读数：`1124 = 32² patch + 100 检测 token` 的构成说明。 */
  candidatesDesc: string;
  /** 输出签名读数：两个张量的名字与运行时形状。 */
  outputDesc: string;
  /** [N × 92] 分类头的原始分数（softmax 之前）。 */
  logits: Float32Array;
  /** [N × 4] 中心点格式归一化坐标 (cx, cy, w, h)。 */
  boxes: Float32Array;
  /** 本次 run 的耗时（毫秒，机器相关）。 */
  runMs: number;
}

/** 一条解码结果：框是归一化角点，画框时再乘显示宽高。 */
export interface Detection {
  labelId: number;
  label: string;
  score: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

let sessionPromise: Promise<InferenceSession> | undefined;

/**
 * 创建并缓存会话。env 的 wasm 标志必须在第一个会话创建之前设置，之后修改不再生效；
 * 会话创建要下载并解析模型，是重操作，只做一次，后续 run 全部复用。
 */
export function loadDetectionSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    env.wasm.wasmPaths = WASM_CDN;
    // 工作区没有 COOP/COEP 响应头（跨域隔离），保持单线程基线。
    env.wasm.numThreads = 1;
    sessionPromise = InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      // 失败后清空缓存，让下一次点击重试能重新创建会话。
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

/** 加载示例图。要 getImageData 读像素，跨域图片必须先带 CORS 授权。 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`示例图片加载失败（检查网络）`));
    image.src = url;
  });
}

/**
 * 预处理：把任意比例的图拉伸到 512×512 方形，按模型卡约定归一化，输出
 * [1,3,512,512] float32。拉伸改变纵横比，但归一化坐标是「宽高的比例值」，与
 * 纵横比无关——解码出的框画回原图依然对齐（改用 letterbox 时才需要 pad 偏移换算）。
 */
export function imageToInput(image: HTMLImageElement): Tensor {
  const work = document.createElement('canvas');
  work.width = INPUT_SIZE;
  work.height = INPUT_SIZE;
  const context = work.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  context.drawImage(image, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const rgba = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;

  // RGBA 交错 → NCHW 分面；通道各用各的 mean/std
  const plane = INPUT_SIZE * INPUT_SIZE;
  const data = new Float32Array(3 * plane);
  for (let p = 0; p < plane; p += 1) {
    data[p] = (rgba[p * 4] / 255 - MEAN[0]) / STD[0];
    data[plane + p] = (rgba[p * 4 + 1] / 255 - MEAN[1]) / STD[1];
    data[plane * 2 + p] = (rgba[p * 4 + 2] / 255 - MEAN[2]) / STD[2];
  }

  // 输入签名 [?,3,?,?] 全是符号维度：dims 填本次的具体数值即可
  return new Tensor('float32', data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

/** 跑一次推理，取出两个输出并缓存原始分数与框。 */
export async function runDetection(
  session: InferenceSession,
  image: HTMLImageElement,
): Promise<RawOutputs> {
  const feeds: InferenceSession.FeedsType = {
    [session.inputNames[0]]: imageToInput(image),
  };

  const startedAt = performance.now();
  const outputs = await session.run(feeds);
  const runMs = performance.now() - startedAt;

  // 输出名以 session.outputNames 为准；本例是 Xenova 导出的 logits / pred_boxes
  const logitsTensor = outputs['logits'] as Tensor | undefined;
  const boxesTensor = outputs['pred_boxes'] as Tensor | undefined;
  if (!logitsTensor || !boxesTensor) {
    throw new Error(
      `输出名不符：session.outputNames = [${session.outputNames.join(', ')}]`,
    );
  }

  const logits = logitsTensor.data as Float32Array;
  const boxes = boxesTensor.data as Float32Array;
  // 候选数 N 运行时才确定（符号维度）：从输出 dims 读，不写死
  const candidateCount = logitsTensor.dims[1];
  const patches = (INPUT_SIZE / PATCH_SIZE) ** 2;

  return {
    candidateCount,
    candidatesDesc: `${candidateCount} = ${INPUT_SIZE / PATCH_SIZE}² patch + ${NUM_DET_TOKENS} 检测 token`,
    outputDesc: `logits [${logitsTensor.dims.join(',')}] · pred_boxes [${boxesTensor.dims.join(',')}]`,
    logits,
    boxes,
    runMs,
  };
}

const classProbs = new Float32Array(NUM_CLASSES);

/**
 * 解码（本课核心，纯函数）：对每个候选——
 * ① 92 类分数做 softmax（减最大值防溢出）；② 丢掉索引 91 的 null 类后取最大；
 * ③ 最大类概率过阈值；④ 中心点 (cx,cy,w,h) 换成角点 (x1,y1,x2,y2)。
 * 最后按分数降序返回。换阈值只重跑这里，不碰推理。
 */
export function decodeDetections(
  raw: RawOutputs,
  threshold: number,
): Detection[] {
  const detections: Detection[] = [];

  for (let i = 0; i < raw.candidateCount; i += 1) {
    const row = i * NUM_CLASSES;

    // ① softmax：先减最大值，指数和稳定
    let max = raw.logits[row];
    for (let c = 1; c < NUM_CLASSES; c += 1) {
      if (raw.logits[row + c] > max) {
        max = raw.logits[row + c];
      }
    }
    let sum = 0;
    for (let c = 0; c < NUM_CLASSES; c += 1) {
      classProbs[c] = Math.exp(raw.logits[row + c] - max);
      sum += classProbs[c];
    }

    // ② 丢 null 类（索引 91）：背景候选的分数集中在它身上，必须先丢弃再 argmax
    let bestId = 0;
    let bestProb = 0;
    for (let c = 0; c < NULL_CLASS_ID; c += 1) {
      const prob = classProbs[c] / sum;
      if (prob > bestProb) {
        bestProb = prob;
        bestId = c;
      }
    }

    // ③ 阈值过滤：候选集里大多数是背景，过线的是少数
    if (bestProb < threshold) {
      continue;
    }

    // ④ 中心点 → 角点，仍是归一化坐标；乘显示宽高是「画框」那一节的事
    const cx = raw.boxes[i * 4];
    const cy = raw.boxes[i * 4 + 1];
    const w = raw.boxes[i * 4 + 2];
    const h = raw.boxes[i * 4 + 3];
    detections.push({
      labelId: bestId,
      label: COCO_LABELS[bestId] ?? `#${bestId}`,
      score: bestProb,
      x1: cx - w / 2,
      y1: cy - h / 2,
      x2: cx + w / 2,
      y2: cy + h / 2,
    });
  }

  return detections.sort((a, b) => b.score - a.score);
}

export interface DetectionSnapshot {
  message: string;
  candidates: string;
  outputDesc: string;
  kept: string;
  runMs: string;
}

export interface YolosDetectInstance {
  update(options: { threshold: number }): void;
  dispose(): void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 把源图 contain 进目标矩形，返回实际显示矩形（画框坐标系的基准）。 */
function fitRect(
  sourceWidth: number,
  sourceHeight: number,
  bounds: Rect,
): Rect {
  const scale = Math.min(bounds.width / sourceWidth, bounds.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height,
  };
}

export function createYolosDetect(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DetectionSnapshot) => void,
): YolosDetectInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let threshold = 0.5;
  let status: 'loading' | 'running' | 'ready' | 'error' = 'loading';
  let message = '加载模型（约 9.2MB）与示例图片…';
  let image: HTMLImageElement | null = null;
  let raw: RawOutputs | null = null;
  let detections: Detection[] = [];
  let imageRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let runToken = 0;

  function decode() {
    detections = raw ? decodeDetections(raw, threshold) : [];
  }

  function emitSnapshot() {
    emit({
      message,
      outputDesc: raw ? raw.outputDesc : '—',
      candidates: raw ? raw.candidatesDesc : '—',
      kept: raw ? `${detections.length}（阈值 ${threshold.toFixed(2)}）` : '—',
      runMs: raw ? `${raw.runMs.toFixed(0)} ms（机器相关）` : '—',
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 左面板：图片 + 检测框；右面板：解码保留的候选列表
    // （面板标题由 stories 的 captions 提供，画布内不重复绘制）
    const imageBounds: Rect = { x: 24, y: 44, width: width / 2 - 48, height: height - 88 };
    const listX = width / 2 + 24;
    const listWidth = width / 2 - 52;

    if (image) {
      imageRect = fitRect(image.width, image.height, imageBounds);
      ctx.drawImage(image, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
      drawBoxes(imageRect);
    } else {
      drawPlaceholder(imageBounds);
    }

    drawList(listX, 44, listWidth, height - 88);

    if (status === 'error') {
      drawError(width, height);
    }
    emitSnapshot();
  }

  /** 画框：归一化角点 × 显示矩形宽高 = 画布像素；框跟着显示尺寸走。 */
  function drawBoxes(rect: Rect) {
    const top = detections.slice(0, 12);
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (const detection of top) {
      const x = rect.x + detection.x1 * rect.width;
      const y = rect.y + detection.y1 * rect.height;
      const w = (detection.x2 - detection.x1) * rect.width;
      const h = (detection.y2 - detection.y1) * rect.height;
      const color = PALETTE[detection.labelId % PALETTE.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // 标签牌：类别 + 分数；贴近顶边时移进框内
      const text = `${detection.label} ${detection.score.toFixed(2)}`;
      const textWidth = ctx.measureText(text).width;
      const chipY = y > 22 ? y - 20 : y + 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, chipY, textWidth + 14, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 7, chipY + 13);
    }
  }

  function drawPlaceholder(bounds: Rect) {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = '#c3cede';
    ctx.lineWidth = 1;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(message, bounds.x + 8, bounds.y + bounds.height / 2);
  }

  function drawList(x: number, y: number, width: number, height: number) {
    if (!raw) {
      return; // 加载期的状态说明已由左面板占位承担
    }

    if (!detections.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('当前阈值下没有候选过线', x, y + 24);
      return;
    }

    const top = detections.slice(0, 6);
    const rowHeight = Math.min(38, (height - 40) / top.length);
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    top.forEach((detection, index) => {
      const rowY = y + index * rowHeight;
      const color = PALETTE[detection.labelId % PALETTE.length];

      ctx.fillStyle = '#172033';
      ctx.fillText(detection.label, x, rowY + rowHeight / 2 + 4);

      const barX = x + 130;
      const barWidth = width - 200;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(barX, rowY + rowHeight / 2 - 7, barWidth, 14);
      ctx.fillStyle = color;
      ctx.fillRect(barX, rowY + rowHeight / 2 - 7, Math.max(2, detection.score * barWidth), 14);

      ctx.fillStyle = '#475569';
      ctx.textAlign = 'right';
      ctx.fillText(detection.score.toFixed(3), x + width, rowY + rowHeight / 2 + 4);
      ctx.textAlign = 'left';
    });

    if (detections.length > top.length) {
      ctx.fillStyle = '#64748b';
      ctx.fillText(`…共 ${detections.length} 个`, x, y + top.length * rowHeight + 18);
    }
  }

  function drawError(viewWidth: number, viewHeight: number) {
    // 错误面板放右半：左下角留给共享读数面板
    const boxX = viewWidth / 2 + 24;
    const boxWidth = viewWidth / 2 - 48;
    const boxY = viewHeight / 2 - 52;

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const lines = wrapText(`失败：${message}`, boxWidth - 28);
    const boxHeight = Math.min(150, 26 + lines.length * 19 + 34);

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fillStyle = '#fff5f5';
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    lines.forEach((line, index) => {
      ctx.fillText(line, boxX + 14, boxY + 24 + index * 19);
    });
    ctx.fillStyle = '#b45309';
    ctx.fillText('点击画布可重试；请检查网络可达与 wasmPaths', boxX + 14, boxY + boxHeight - 26);
    ctx.fillText('版本（onnxruntime-web@1.30.0）；读数机器相关', boxX + 14, boxY + boxHeight - 10);
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
        if (lines.length >= 4) {
          return lines;
        }
      } else {
        line += char;
      }
    }
    if (lines.length < 4 && line) {
      lines.push(line);
    }
    return lines;
  }

  async function bootstrap() {
    const token = ++runToken;
    status = 'loading';
    message = '加载模型（约 9.2MB）与示例图片…';
    decode();
    draw();
    try {
      const [session, loaded] = await Promise.all([
        loadDetectionSession(),
        loadImage(IMAGE_URL),
      ]);
      if (token !== runToken) {
        return;
      }
      image = loaded;
      status = 'running';
      message = '推理中…（单线程 wasm，秒级）';
      draw();
      raw = await runDetection(session, loaded);
      if (token !== runToken) {
        return;
      }
      status = 'ready';
      message = '就绪 · 调整阈值只重新解码';
    } catch (error) {
      if (token !== runToken) {
        return;
      }
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
      raw = null;
    }
    decode();
    draw();
  }

  function onClick() {
    if (status === 'error') {
      void bootstrap();
    }
  }

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', onClick);
  const resizeObserver = createResizeObserver(canvas, draw);

  // 打开实例即自动跑一遍完整链路
  draw();
  void bootstrap();

  return {
    update(next) {
      threshold = next.threshold;
      // 原始输出已缓存：换阈值只重新解码 + 重画，不重新推理
      decode();
      draw();
    },
    dispose() {
      runToken += 1;
      canvas.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      // 不释放共享会话：会话与张量的释放策略属于「内存管理」课程
    },
  };
}
