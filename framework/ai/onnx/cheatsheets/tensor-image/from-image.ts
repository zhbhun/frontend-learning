/**
 * 范例：Tensor.fromImage 的三种输入形态——与手写基准对照，看清官方辅助
 * 做了什么、边界在哪里。基准固定为「drawImage 缩放到 16×12 后手写转
 * NCHW / RGB / ÷255」。
 * 前置状态：无。图案在页面内生成；fromImage 与 toImageData 是纯 JS，不加载 wasm。
 * 操作：控件切换输入形态（先缩放的 ImageData / HTMLImageElement / 带 resized 参数）。
 * 预期结果：先缩放形态与手写基准逐元素一致（最大差 0）；HTMLImageElement 输出
 * [1,4,24,32] 四通道 RGBA；resized 参数不缩放，产物是左上角裁剪，最大差明显大于 0。
 * 阅读主线：refresh（三种形态 → fromImage → toImageData 还原）→ draw（左右对照面板）。
 */
import { env, Tensor } from 'onnxruntime-web';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { imageDataToTensor } from './image-to-tensor';
import {
  buildPatternImageData,
  drawImageDataScaled,
  imageDataToCanvas,
} from './pattern';

// 工作区惯例：凡运行 ort 的实例都显式指向与安装版本配套的工件 CDN。
// 本实例只调用纯 JS 的 fromImage / toImageData，不会真正下载 wasm 工件。
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
env.wasm.numThreads = 1;

export type FromImageMode = 'scaled' | 'element' | 'resized';

export interface FromImageSnapshot {
  modeLabel: string;
  dims: string;
  channels: string;
  diff: string;
}

export interface FromImageInstance {
  update(options: { mode: FromImageMode }): void;
  dispose(): void;
}

type FromImageResult = Awaited<ReturnType<typeof Tensor.fromImage>>;

export function createFromImage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FromImageSnapshot) => void,
): FromImageInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let mode: FromImageMode = 'scaled';
  let sourceImage: ImageData | null = null;
  let resultImage: ImageData | null = null;
  let snapshot: FromImageSnapshot = {
    modeLabel: '计算中…',
    dims: '—',
    channels: '—',
    diff: '—',
  };
  let runToken = 0;

  /** 两个同形张量的逐元素最大差，用来核对 fromImage 与手写实现是否一致。 */
  function maxAbsDiff(left: FromImageResult, right: Tensor): number {
    const a = left.data as Float32Array;
    const b = right.data as Float32Array;
    let diff = 0;
    for (let index = 0; index < a.length; index += 1) {
      diff = Math.max(diff, Math.abs(a[index] - b[index]));
    }
    return diff;
  }

  /** 缩放只能这样自己做：drawImage 到目标尺寸再取 ImageData。 */
  function scaleImageData(source: ImageData, width: number, height: number): ImageData {
    const target = document.createElement('canvas');
    target.width = width;
    target.height = height;
    const scaledContext = target.getContext('2d');
    if (!scaledContext) {
      throw new Error('当前浏览器不支持 Canvas 2D。');
    }
    scaledContext.drawImage(imageDataToCanvas(source), 0, 0, width, height);
    return scaledContext.getImageData(0, 0, width, height);
  }

  function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('演示图案的 Image 加载失败。'));
      image.src = source;
    });
  }

  async function refresh() {
    const token = ++runToken;
    const pattern = buildPatternImageData();
    const scaled = scaleImageData(pattern, 16, 12);
    // 手写基准：NCHW、RGB、÷255——与 fromImage 的默认语义一一对应
    const baseline = imageDataToTensor(scaled, {
      layout: 'NCHW',
      channels: 'RGB',
      norm: 'unit',
    });

    let tensor: FromImageResult;
    let modeLabel: string;
    let channels: string;
    let diff: string;

    if (mode === 'scaled') {
      tensor = await Tensor.fromImage(scaled, { tensorFormat: 'RGB' });
      modeLabel = 'ImageData（先 drawImage 缩放到 16×12）';
      channels = '3（RGB）';
      diff = `${maxAbsDiff(tensor, baseline).toFixed(3)}（与手写基准逐元素一致）`;
    } else if (mode === 'element') {
      const image = await loadImage(imageDataToCanvas(pattern).toDataURL());
      // HTMLImageElement 输入不能指定 tensorFormat：传了直接抛错，输出恒为 RGBA
      tensor = await Tensor.fromImage(image);
      modeLabel = 'HTMLImageElement（原始 32×24）';
      channels = '4（RGBA，img 输入强制）';
      diff = '不适用（与 3 通道基准不可比）';
    } else {
      // 1.30.0 的 resizedWidth/resizedHeight 只改变读回区域：变小是左上裁剪
      tensor = await Tensor.fromImage(pattern, {
        tensorFormat: 'RGB',
        resizedWidth: 16,
        resizedHeight: 12,
      });
      modeLabel = 'ImageData + resizedWidth/Height = 16×12';
      channels = '3（RGB）';
      diff = `${maxAbsDiff(tensor, baseline).toFixed(3)}（内容是左上角裁剪）`;
    }

    if (token !== runToken) {
      return;
    }
    sourceImage = pattern;
    resultImage = tensor.toImageData({ format: tensor.dims[1] === 4 ? 'RGBA' : 'RGB' });
    snapshot = { modeLabel, dims: tensor.dims.join(' × '), channels, diff };
    draw();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('源图案（32×24 ImageData）', 28, 44);
    ctx.fillText('fromImage 产物经 toImageData 还原', 412, 44);

    if (sourceImage) {
      drawImageDataScaled(ctx, sourceImage, 28, 60, 240, 180);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('RGBA 交错字节缓冲', 28, 258);
    }

    if (resultImage) {
      drawImageDataScaled(ctx, resultImage, 412, 60, 240, 180);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`输出 ${snapshot.dims}`, 412, 258);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('计算中…', 416, 150);
    }

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`当前形态：${snapshot.modeLabel}`, 28, 292);

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();
  void refresh();

  return {
    update(next) {
      mode = next.mode;
      void refresh();
    },
    dispose() {
      runToken += 1;
      resizeObserver.disconnect();
    },
  };
}
