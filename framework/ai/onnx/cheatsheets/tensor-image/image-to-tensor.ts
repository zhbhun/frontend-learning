/**
 * 范例：手写「图像 → Tensor」转换——把 canvas 生成的图案改写成模型输入张量，
 * 再把张量按通道画回画面，让布局、通道顺序与归一化三步改写各自可见。
 * 前置状态：无。图案由页面内 canvas 生成，转换是纯 JS，不创建会话、不加载 wasm。
 * 操作：控件切换目标布局（NCHW/NHWC）、通道顺序（RGB/BGR）与归一化（÷255 / ImageNet）。
 * 预期结果：切到 BGR 后通道 0 与通道 2 的平面内容互换（红盘与蓝渐变对调）；切到
 * NHWC 后画面不变、读数索引公式变为像素交错；切到 ImageNet 后值域读数出现负值。
 * 阅读主线：imageDataToTensor（唯一的转换实现）→ draw（源图案 + 通道平面 + 读数）。
 */
import { env, Tensor } from 'onnxruntime-web';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { buildPatternImageData, drawImageDataScaled } from './pattern';

// 工作区惯例：凡运行 ort 的实例都显式指向与安装版本配套的工件 CDN。
// 本实例只用到纯 JS 的 Tensor 构造，不会真正下载 wasm 工件。
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
env.wasm.numThreads = 1;

export type TensorLayout = 'NCHW' | 'NHWC';
export type ChannelOrder = 'RGB' | 'BGR';
export type NormMode = 'unit' | 'imagenet';

export interface HandwrittenOptions {
  layout: TensorLayout;
  channels: ChannelOrder;
  norm: NormMode;
}

export interface HandwrittenSnapshot {
  dims: string;
  length: string;
  indexFormula: string;
  sample: string;
  range: string;
}

export interface HandwrittenInstance {
  update(options: HandwrittenOptions): void;
  dispose(): void;
}

/** ImageNet 常见预处理约定：(p / 255 − mean) / std，逐通道执行。 */
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

/** 读数抽样的像素坐标（位于红色圆盘内，三个通道取值差异明显）。 */
const SAMPLE_X = 10;
const SAMPLE_Y = 8;

/**
 * 手写核心：RGBA ImageData → float32 输入张量。
 * 缩放应在调用前用 drawImage 完成；这里只负责通道、布局与值域三步改写。
 */
export function imageDataToTensor(
  image: ImageData,
  options: HandwrittenOptions,
): Tensor {
  const width = image.width;
  const height = image.height;
  const plane = width * height;
  const data = new Float32Array(3 * plane);
  const pixels = image.data;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // RGBA 交错：通道相邻，行优先，左上原点
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        // RGB 直接取前 3 个字节；BGR 交换 R 与 B；alpha 恒丢弃
        const sourceIndex = options.channels === 'RGB' ? channel : 2 - channel;
        const unit = pixels[offset + sourceIndex] / 255;
        const value =
          options.norm === 'imagenet'
            ? (unit - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel]
            : unit;
        // 布局决定写入位置：NCHW 按通道分面，NHWC 按像素交错
        if (options.layout === 'NCHW') {
          data[channel * plane + y * width + x] = value;
        } else {
          data[(y * width + x) * 3 + channel] = value;
        }
      }
    }
  }

  const dims =
    options.layout === 'NCHW' ? [1, 3, height, width] : [1, height, width, 3];
  return new Tensor('float32', data, dims);
}

export function createHandwritten(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HandwrittenSnapshot) => void,
): HandwrittenInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let options: HandwrittenOptions = { layout: 'NCHW', channels: 'RGB', norm: 'unit' };

  /** 从张量缓冲里提取一个通道的平面，做极值拉伸后转成灰度 ImageData。 */
  function channelPlane(
    tensorData: Float32Array,
    width: number,
    height: number,
    channel: number,
  ): ImageData {
    const plane = width * height;
    const read = (index: number) =>
      options.layout === 'NCHW'
        ? tensorData[channel * plane + index]
        : tensorData[index * 3 + channel];

    let min = Infinity;
    let max = -Infinity;
    for (let index = 0; index < plane; index += 1) {
      const value = read(index);
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }

    const image = new ImageData(width, height);
    const span = max - min || 1;
    for (let index = 0; index < plane; index += 1) {
      const byte = Math.round(((read(index) - min) / span) * 255);
      image.data[index * 4] = byte;
      image.data[index * 4 + 1] = byte;
      image.data[index * 4 + 2] = byte;
      image.data[index * 4 + 3] = 255;
    }
    return image;
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

    const pattern = buildPatternImageData();
    const tensor = imageDataToTensor(pattern, options);
    const tensorData = tensor.data as Float32Array;
    const sourceWidth = pattern.width;
    const sourceHeight = pattern.height;

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('源 ImageData（RGBA 交错）', 28, 44);
    ctx.fillText('张量的三个通道平面（按各自极值拉伸）', 316, 44);

    drawImageDataScaled(ctx, pattern, 28, 60, 240, 180);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `${sourceWidth}×${sourceHeight} · ${pattern.data.length} 字节 · Uint8ClampedArray`,
      28,
      258,
    );

    const planeWidth = 104;
    const planeHeight = 78;
    const planeY = 60 + (180 - planeHeight) / 2;
    const labels = options.channels === 'RGB' ? ['R', 'G', 'B'] : ['B', 'G', 'R'];
    for (let channel = 0; channel < 3; channel += 1) {
      const planeX = 316 + channel * (planeWidth + 16);
      drawImageDataScaled(
        ctx,
        channelPlane(tensorData, sourceWidth, sourceHeight, channel),
        planeX,
        planeY,
        planeWidth,
        planeHeight,
      );
      ctx.fillStyle = '#475569';
      ctx.fillText(`通道 ${channel}（${labels[channel]}）`, planeX, planeY + planeHeight + 18);
    }

    // 读数：抽样像素在两种排布下的索引与值，以及全张量的值域
    const plane = sourceWidth * sourceHeight;
    const readSample = (channel: number) =>
      options.layout === 'NCHW'
        ? tensorData[channel * plane + SAMPLE_Y * sourceWidth + SAMPLE_X]
        : tensorData[(SAMPLE_Y * sourceWidth + SAMPLE_X) * 3 + channel];
    const sampleOffset = (SAMPLE_Y * sourceWidth + SAMPLE_X) * 4;
    const samplePixels = pattern.data;
    let min = tensorData[0];
    let max = tensorData[0];
    for (let index = 1; index < tensorData.length; index += 1) {
      if (tensorData[index] < min) {
        min = tensorData[index];
      }
      if (tensorData[index] > max) {
        max = tensorData[index];
      }
    }

    emit({
      dims: tensor.dims.join(' × '),
      length: `${tensorData.length} 个 float32`,
      indexFormula:
        options.layout === 'NCHW'
          ? `NCHW：data[c×${plane} + y×${sourceWidth} + x]`
          : `NHWC：data[(y×${sourceWidth} + x)×3 + c]`,
      sample: `RGBA(${samplePixels[sampleOffset]}, ${samplePixels[sampleOffset + 1]}, ${samplePixels[sampleOffset + 2]}) → [${readSample(0).toFixed(3)}, ${readSample(1).toFixed(3)}, ${readSample(2).toFixed(3)}]`,
      range: `${min.toFixed(2)} ~ ${max.toFixed(2)}`,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();

  return {
    update(next) {
      options = next;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
