/**
 * 应用外壳：示例照片加载、画布呈现与状态机。
 * 核心管线在 preprocess / decoder / classifier 三个模块里；本文件只负责
 * 「把照片变成 RGBA 输入（drawImage 短边缩放 + 中心裁剪）、把 Top-K 画出来、
 * 把每个阶段的等待与失败都变成可见状态」。
 * 前置状态：示例照片来自 Wikimedia Commons（实测响应带 Access-Control-Allow-Origin: *，
 * 用 fetch + createImageBitmap 获取，画布不会被污染）；首次打开需下载模型 4.96MB
 * 与 wasm 运行时，5 分钟内重复打开走 HTTP 缓存。
 * 操作：Controls 切换照片 / 归一化 / Top-K；加载或推理失败时点击画布重试。
 * 预期结果：左侧预览就是模型实际看到的 224×224 中心裁剪画面；右侧 Top-K 条形与
 * 读数同步更新；切 K 只重算解码（「解码」读数微秒级、「推理」读数不变）。
 * 阅读主线：ensure（加载缓存）→ runClassify（取图 → classify → 存概率）→
 * redecode（只重排 Top-K）；画布绘制与状态面板属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

import { loadClassifier } from './classifier';
import type { ClassifierHandle, ClassifyResult } from './classifier';
import { topK } from './decoder';
import type { ClassScore } from './decoder';
import { INPUT_SIZE } from './preprocess';
import type { NormalizeMode } from './preprocess';

/** 示例照片：Wikimedia Commons 500px 缩略图，响应带 Access-Control-Allow-Origin: *。 */
export interface SamplePhoto {
  id: 'dog' | 'banana' | 'coffee';
  label: string;
  url: string;
  credit: string;
}

export const SAMPLES: SamplePhoto[] = [
  {
    id: 'dog',
    label: '金毛犬',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Golden_Retriever_Dukedestiny01_drvd.jpg/500px-Golden_Retriever_Dukedestiny01_drvd.jpg',
    credit: '照片：Wikimedia Commons「Golden Retriever Dukedestiny01_drvd.jpg」（公有领域）',
  },
  {
    id: 'banana',
    label: '香蕉',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Bananas_white_background.jpg/500px-Bananas_white_background.jpg',
    credit: '照片：Wikimedia Commons「Bananas white background.jpg」（GFDL）',
  },
  {
    id: 'coffee',
    label: '咖啡',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/500px-A_small_cup_of_coffee.JPG',
    credit: '照片：Wikimedia Commons「A small cup of coffee.JPG」（CC BY-SA 2.0）',
  },
];

export function sampleById(id: SamplePhoto['id']): SamplePhoto {
  const sample = SAMPLES.find((item) => item.id === id);
  if (!sample) {
    throw new Error(`未知示例照片：${id}`);
  }
  return sample;
}

export interface AppArgs {
  photo: SamplePhoto['id'];
  normalize: NormalizeMode;
  topK: number;
}

export interface AppSnapshot {
  status: 'loading' | 'inferring' | 'ready' | 'error';
  message: string;
  modelDesc: string;
  labelsDesc: string;
  inputDesc: string;
  outputDesc: string;
  runDesc: string;
  decodeDesc: string;
  top1Desc: string;
}

export interface AppInstance {
  update(args: AppArgs): void;
  dispose(): void;
}

export function createImageClassification(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AppSnapshot) => void,
): AppInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  // 几何加工的离屏画布：drawImage 负责短边缩放 + 中心裁剪，getImageData 取像素。
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = INPUT_SIZE;
  cropCanvas.height = INPUT_SIZE;
  const cropContext = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!cropContext) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  let args: AppArgs = { photo: 'dog', normalize: 'imagenet', topK: 5 };
  let status: AppSnapshot['status'] = 'loading';
  let message = '下载模型与标签表…';
  let handle: ClassifierHandle | null = null;
  let bitmap: ImageBitmap | null = null;
  let result: ClassifyResult | null = null;
  let probs: number[] | null = null; // 缓存整份概率：切 K 只重排，不重跑推理
  let runToken = 0;

  // 照片按 URL 缓存：来回切换不重复下载。
  const bitmapPromises = new Map<string, Promise<ImageBitmap>>();

  function ensureBitmap(url: string): Promise<ImageBitmap> {
    let promise = bitmapPromises.get(url);
    if (!promise) {
      promise = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`照片下载失败：HTTP ${response.status}`);
          }
          return response.blob();
        })
        .then((blob) => createImageBitmap(blob))
        .catch((error: unknown) => {
          bitmapPromises.delete(url); // 失败不缓存，允许重试
          throw error;
        });
      bitmapPromises.set(url, promise);
    }
    return promise;
  }

  /** 短边缩放 + 中心裁剪 + 取像素：预览画的就是这同一份输入。 */
  function readModelInput(): ImageData {
    if (!bitmap) {
      throw new Error('照片尚未就绪。');
    }
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    cropContext.drawImage(bitmap, sx, sy, side, side, 0, 0, INPUT_SIZE, INPUT_SIZE);
    return cropContext.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  }

  function emitSnapshot() {
    emit({
      status,
      message,
      modelDesc: handle ? `squeezenet1.1-7 · ${handle.modelBytes.toLocaleString('en-US')} 字节` : '—',
      labelsDesc: handle ? `synset.txt · ${handle.labels.length} 类` : '—',
      inputDesc: result
        ? `${result.inputName} [${result.inputDims.join(',')}] · 范围 [${result.inputRange.min.toFixed(2)}, ${result.inputRange.max.toFixed(2)}]`
        : '—',
      outputDesc: result
        ? `${result.outputName} [${result.outputDims.join(',')}] · logits [${result.logitRange.min.toFixed(1)}, ${result.logitRange.max.toFixed(1)}]`
        : '—',
      runDesc: result ? `${result.runMs.toFixed(1)} ms` : '—',
      decodeDesc: result ? `${result.decodeMs.toFixed(2)} ms` : '—',
      top1Desc: result && result.top.length > 0
        ? `${result.top[0].label} · ${(result.top[0].prob * 100).toFixed(1)}%`
        : '—',
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(620, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const sample = sampleById(args.photo);
    const square = Math.min(width * 0.36, height - 118);
    drawPreview(24, 48, square, sample);
    drawBars(24 + square + 28, 56, width - (24 + square + 28) - 24, height - 96);

    if (status === 'error') {
      drawError(width, height);
    }
    emitSnapshot();
  }

  function drawPreview(x: number, y: number, size: number, sample: SamplePhoto) {
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`示例照片：${sample.label}`, x, y - 14);

    if (bitmap) {
      // 预览直接画「裁剪框」：屏幕上看到的就是模型拿到的像素。
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        x,
        y,
        size,
        size,
      );
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, size, size);
    }
    ctx.strokeStyle = 'rgba(79,124,255,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('模型实际输入（中心裁剪 224×224）', x, y + size + 18);
    ctx.fillStyle = '#64748b';
    ctx.fillText(sample.credit, x, y + size + 36);
  }

  function drawBars(x: number, y: number, width: number, height: number) {
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`Top-${args.topK}（softmax 概率）`, x, y - 14);

    if (!result) {
      ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(status === 'error' ? '加载或推理失败，点击画布重试' : message, x + 4, y + height / 2);
      return;
    }

    const rowHeight = Math.min(58, height / result.top.length);
    const barX = x + 10;
    const barWidth = width - 96;
    result.top.forEach((item: ClassScore, rank: number) => {
      const rowY = y + rank * rowHeight;
      const isTop1 = rank === 0;

      ctx.fillStyle = isTop1 ? '#4f7cff' : '#94a3b8';
      ctx.font = `${isTop1 ? '700' : '400'} 13px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillText(`${rank + 1}. ${truncateLabel(item.label, barWidth)}`, x, rowY + 12);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(barX, rowY + 20, barWidth, 12);
      ctx.fillStyle = isTop1 ? '#4f7cff' : '#b3bfd0';
      ctx.fillRect(barX, rowY + 20, Math.max(2, item.prob * barWidth), 12);

      ctx.fillStyle = isTop1 ? '#2563eb' : '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`${(item.prob * 100).toFixed(1)}%`, x + width, rowY + 30);
      ctx.textAlign = 'left';
    });
  }

  function truncateLabel(label: string, maxWidth: number): string {
    if (ctx.measureText(label).width <= maxWidth) {
      return label;
    }
    let text = label;
    while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) {
      text = text.slice(0, -1);
    }
    return `${text}…`;
  }

  function drawError(width: number, height: number) {
    const boxX = 24;
    const boxY = height - 64;
    const boxWidth = width - 48;
    const lines = wrapText(`失败：${message}`, boxWidth - 28);

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, 52, 6);
    ctx.fillStyle = '#fff5f5';
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    lines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, boxX + 14, boxY + 20 + index * 18);
    });
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  /** 只重跑解码：K 的切换不需要碰会话——纯函数模块的红利。 */
  function redecode() {
    if (!handle || !probs || !result) {
      return;
    }
    const startedAt = performance.now();
    const top = topK(probs, handle.labels, args.topK);
    const decodeMs = performance.now() - startedAt;
    result = { ...result, top, decodeMs };
    draw();
  }

  async function runClassify() {
    if (!handle || !bitmap) {
      return;
    }
    const token = ++runToken;
    status = 'inferring';
    message = '推理中…';
    draw();
    try {
      const image = readModelInput();
      const next = await handle.classify(image, { topK: args.topK, normalize: args.normalize });
      if (token !== runToken) {
        return;
      }
      result = next;
      // 整份概率缓存在外壳：切 K 时 redecode 只对它重排，不再碰会话。
      probs = next.probs;
      status = 'ready';
      message = '就绪';
    } catch (error) {
      if (token !== runToken) {
        return;
      }
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
      result = null;
      probs = null;
    }
    draw();
  }

  async function ensure() {
    const token = ++runToken;
    status = 'loading';
    message = '下载模型与标签表…';
    draw();
    try {
      const sample = sampleById(args.photo);
      const [nextHandle, nextBitmap] = await Promise.all([loadClassifier(), ensureBitmap(sample.url)]);
      if (token !== runToken) {
        return;
      }
      handle = nextHandle;
      bitmap = nextBitmap;
      await runClassify();
    } catch (error) {
      if (token !== runToken) {
        return;
      }
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
      result = null;
      probs = null;
      draw();
    }
  }

  function onPointerDown() {
    if (status === 'error') {
      void ensure();
    }
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onPointerDown);

  const resizeObserver = createResizeObserver(canvas, draw);

  draw();
  void ensure();

  return {
    update(next: AppArgs) {
      const photoChanged = next.photo !== args.photo;
      const normalizeChanged = next.normalize !== args.normalize;
      const kChanged = next.topK !== args.topK;
      args = next;

      if (photoChanged) {
        void ensure(); // 新照片：取图 + 完整管线
      } else if (normalizeChanged) {
        // 同一张照片换归一化：重跑推理；装配尚未就绪时退回完整加载，
        // 否则这次更新会因 handle 为空被静默丢掉。
        if (handle && bitmap) {
          void runClassify();
        } else {
          void ensure();
        }
      } else if (kChanged) {
        redecode(); // 只换 K：重算解码；加载中的话由进行中的管线按新 K 出结果
      }
    },
    dispose() {
      runToken += 1;
      canvas.removeEventListener('pointerdown', onPointerDown);
      resizeObserver.disconnect();
      // 位图是本实例的私有缓存，释放；会话与标签表留在模块级缓存供复用
      // （不释放的取舍见「内存管理」课）。
      bitmapPromises.forEach((promise) => {
        void promise.then((value) => value.close()).catch(() => undefined);
      });
      bitmapPromises.clear();
    },
  };
}
