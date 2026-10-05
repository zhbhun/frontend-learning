/**
 * 范例：Tensor → ImageData 的还原——toImageData / toDataURL 的 norm 参数是
 * 正向归一化的逆运算；值域与 norm 不匹配时画面失真而不报错。
 * 前置状态：无。张量由页面内图案构造，纯 JS，不加载 wasm。
 * 操作：控件切换张量值域（[0,1] / [-1,1]）。
 * 预期结果：左面板（norm 匹配值域）始终正常还原；右面板固定用默认 norm
 * （值 × 255），[-1,1] 时负值被钳到 0、高位饱和到 255，画面明显失真。
 * 阅读主线：buildTensor（图案 → [1,3,H,W] float32）→ toImageData 的两种 norm → draw。
 */
import { env, Tensor } from 'onnxruntime-web';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { buildPatternImageData, drawImageDataScaled } from './pattern';

// 工作区惯例：凡运行 ort 的实例都显式指向与安装版本配套的工件 CDN。
// 本实例只调用纯 JS 的 Tensor 构造与 toImageData，不会真正下载 wasm 工件。
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
env.wasm.numThreads = 1;

export type ValueRange = 'unit' | 'symmetric';

export interface TensorToImageSnapshot {
  shape: string;
  range: string;
  matchNorm: string;
  formula: string;
  sample: string;
}

export interface TensorToImageInstance {
  update(options: { range: ValueRange }): void;
  dispose(): void;
}

const TENSOR_WIDTH = 16;
const TENSOR_HEIGHT = 12;
/** 读数抽样的通道 0 像素坐标。 */
const SAMPLE_X = 5;
const SAMPLE_Y = 3;

/** 页面内图案 → [1,3,H,W] float32 张量：unit 值域 [0,1]；symmetric 值域 [-1,1]。 */
export function buildTensor(range: ValueRange): Tensor {
  const pattern = buildPatternImageData(TENSOR_WIDTH, TENSOR_HEIGHT);
  const plane = TENSOR_WIDTH * TENSOR_HEIGHT;
  const data = new Float32Array(3 * plane);

  for (let y = 0; y < TENSOR_HEIGHT; y += 1) {
    for (let x = 0; x < TENSOR_WIDTH; x += 1) {
      const offset = (y * TENSOR_WIDTH + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const unit = pattern.data[offset + channel] / 255;
        data[channel * plane + y * TENSOR_WIDTH + x] =
          range === 'symmetric' ? unit * 2 - 1 : unit;
      }
    }
  }

  return new Tensor('float32', data, [1, 3, TENSOR_HEIGHT, TENSOR_WIDTH]);
}

export function createTensorToImage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TensorToImageSnapshot) => void,
): TensorToImageInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let range: ValueRange = 'unit';

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const tensor = buildTensor(range);
    // 匹配 norm：unit 用默认（(v − 0) × 255）；symmetric 用 (v + 1) × 127.5
    const matched =
      range === 'unit'
        ? tensor.toImageData()
        : tensor.toImageData({ norm: { mean: 127.5, bias: -1 } });
    // 对照：固定用默认 norm，值域不是 [0,1] 时就会失真
    const defaulted = tensor.toImageData();

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('norm 匹配值域的还原', 64, 48);
    ctx.fillText('默认 norm（值 × 255）的还原', 360, 48);

    drawImageDataScaled(ctx, matched, 64, 64, 216, 162);
    drawImageDataScaled(ctx, defaulted, 360, 64, 216, 162);

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('putImageData 即可上屏', 64, 244);
    ctx.fillText('失真不报错：钳位与饱和', 360, 244);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      'ImageData 写入 Uint8ClampedArray 时自动钳位到 0–255——失真表现为压黑与饱和，而不是异常。',
      64,
      282,
    );

    const plane = TENSOR_WIDTH * TENSOR_HEIGHT;
    const sampleValue = (tensor.data as Float32Array)[SAMPLE_Y * TENSOR_WIDTH + SAMPLE_X];
    const sampleByte = matched.data[(SAMPLE_Y * TENSOR_WIDTH + SAMPLE_X) * 4];

    emit({
      shape: tensor.dims.join(' × '),
      range: range === 'unit' ? '[0, 1]' : '[-1, 1]',
      matchNorm:
        range === 'unit' ? 'mean 255 · bias 0（默认）' : 'mean 127.5 · bias −1',
      formula: '(v − bias) × mean',
      sample: `c0 像素 (${SAMPLE_X}, ${SAMPLE_Y})：v = ${sampleValue.toFixed(3)} → ${sampleByte}`,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();

  return {
    update(next) {
      range = next.range;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
